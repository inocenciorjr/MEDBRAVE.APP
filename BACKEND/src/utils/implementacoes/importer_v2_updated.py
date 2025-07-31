#!/usr/bin/env python3
"""
Script atualizado para importar filtros hierárquicos mesclados para MedPulse
Usa o arquivo merged_filters.json gerado pelo html_to_json_converter.py
"""

import requests
import json
import os
import time
import sys
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import logging

# --- Configuration ---
@dataclass
class Config:
    MEDPULSE_API_BASE_URL: str = os.environ.get("MEDPULSE_API_URL", "http://localhost:3333")
    FILTERS_JSON_PATH: str = "merged_filters.json"  # Usar arquivo mesclado
    MAX_RETRIES: int = int(os.environ.get("MAX_RETRIES", "3"))
    RETRY_DELAY: float = float(os.environ.get("RETRY_DELAY", "1.0"))
    REQUEST_DELAY: float = float(os.environ.get("REQUEST_DELAY", "0.1"))
    REQUEST_TIMEOUT: int = int(os.environ.get("REQUEST_TIMEOUT", "30"))
    # Admin credentials
    ADMIN_EMAIL: str = "inocencio_jr3@hotmail.com"
    ADMIN_PASSWORD: str = "eudapromaq123"
    
    @property
    def filters_endpoint(self) -> str:
        return f"{self.MEDPULSE_API_BASE_URL}/api/filters"
    
    @property
    def subfilters_endpoint_template(self) -> str:
        return f"{self.MEDPULSE_API_BASE_URL}/api/filters/{{filter_id}}/subfilters"
    
    @property
    def auth_endpoint(self) -> str:
        return f"{self.MEDPULSE_API_BASE_URL}/api/auth/login"

# Initialize config and logging
config = Config()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('filter_import_updated.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

HEADERS = {
    "Content-Type": "application/json",
}

# --- Authentication ---
def authenticate() -> bool:
    """Authenticate with admin credentials and update headers with token."""
    global HEADERS
    
    logger.info("Authenticating with admin credentials...")
    
    auth_payload = {
        "email": config.ADMIN_EMAIL,
        "password": config.ADMIN_PASSWORD
    }
    
    try:
        response = requests.post(
            config.auth_endpoint,
            json=auth_payload,
            headers={"Content-Type": "application/json"},
            timeout=config.REQUEST_TIMEOUT
        )
        response.raise_for_status()
        
        auth_data = response.json()
        token = auth_data.get("token") or auth_data.get("accessToken") or auth_data.get("jwt")
        
        if token:
            HEADERS["Authorization"] = f"Bearer {token}"
            logger.info("✅ Authentication successful!")
            return True
        else:
            logger.error(f"No token found in auth response: {auth_data}")
            return False
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Authentication failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                logger.error(f"Auth Error Details: {error_detail}")
            except:
                logger.error(f"Auth Error Response: {e.response.text}")
        return False
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse auth response: {e}")
        return False

# --- Enhanced Request Handler ---
def make_request_with_retry(
    method: str, 
    url: str, 
    max_retries: int = None,
    **kwargs
) -> Optional[requests.Response]:
    """Makes HTTP requests with retry logic."""
    max_retries = max_retries or config.MAX_RETRIES
    
    for attempt in range(max_retries + 1):
        try:
            response = requests.request(
                method, 
                url, 
                headers=HEADERS, 
                timeout=config.REQUEST_TIMEOUT,
                **kwargs
            )
            response.raise_for_status()
            return response
            
        except requests.exceptions.RequestException as e:
            if attempt == max_retries:
                logger.error(f"Failed after {max_retries + 1} attempts: {e}")
                if hasattr(e, 'response') and e.response is not None:
                    try:
                        error_detail = e.response.json()
                        logger.error(f"API Error Details: {error_detail}")
                    except:
                        logger.error(f"API Error Response: {e.response.text}")
                return None
            
            wait_time = config.RETRY_DELAY * (2 ** attempt)  # Exponential backoff
            logger.warning(f"Attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
            time.sleep(wait_time)
    
    return None

# --- Helper Functions ---
def get_existing_filters() -> Dict[str, str]:
    """Fetches existing filters (Especialidades) from MedPulse."""
    existing_filters = {}
    
    logger.info("Fetching existing filters...")
    response = make_request_with_retry("GET", config.filters_endpoint)
    
    if not response:
        logger.warning("Could not fetch existing filters, proceeding without duplicate checks")
        return existing_filters
    
    try:
        filters_data = response.json()
        filter_list = filters_data if isinstance(filters_data, list) else filters_data.get("filters", [])
        
        for f in filter_list:
            if isinstance(f, dict) and "name" in f and "id" in f:
                existing_filters[f["name"].strip().lower()] = f["id"]
            else:
                logger.warning(f"Malformed filter object: {f}")
        
        logger.info(f"Found {len(existing_filters)} existing filters")
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse filters response: {e}")
    
    return existing_filters

def get_existing_subfilters(filter_id: str) -> Dict[str, str]:
    """Fetches existing subfilters for a given filter ID."""
    existing_subfilters = {}
    endpoint = config.subfilters_endpoint_template.format(filter_id=filter_id)
    
    response = make_request_with_retry("GET", endpoint)
    
    if not response:
        logger.warning(f"Could not fetch subfilters for filter {filter_id}")
        return existing_subfilters
    
    try:
        subfilters_data = response.json()
        
        # Handle different response structures
        subfilter_list = []
        if isinstance(subfilters_data, list):
            subfilter_list = subfilters_data
        elif isinstance(subfilters_data, dict):
            possible_keys = ["subFilters", "data", "subfilters", "items"]
            for key in possible_keys:
                if key in subfilters_data and isinstance(subfilters_data[key], list):
                    subfilter_list = subfilters_data[key]
                    break
            else:
                logger.warning(f"Unexpected subfilter response structure: {list(subfilters_data.keys())}")

        for sf in subfilter_list:
            if isinstance(sf, dict) and "name" in sf and "id" in sf and not sf.get("parentId"):
                existing_subfilters[sf["name"].strip().lower()] = sf["id"]
                
        logger.debug(f"Found {len(existing_subfilters)} existing top-level subfilters for filter {filter_id}")
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse subfilters response for filter {filter_id}: {e}")
    
    return existing_subfilters

def create_filter_api(name: str) -> Optional[str]:
    """Creates a new filter (Especialidade) via API."""
    if not name or not name.strip():
        logger.error("Filter name cannot be empty")
        return None
    
    payload = {"name": name.strip()}
    
    logger.info(f"Creating filter: {name}")
    response = make_request_with_retry("POST", config.filters_endpoint, json=payload)
    
    if not response:
        return None
    
    try:
        created_filter = response.json()
        if isinstance(created_filter, dict) and "id" in created_filter:
            logger.info(f"Successfully created filter '{name}' with ID: {created_filter['id']}")
            return created_filter["id"]
        else:
            logger.error(f"Filter '{name}' created but response missing ID: {created_filter}")
            
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse create filter response: {e}")
    
    return None

def create_subfilter_api(filter_id: str, name: str, parent_subfilter_id: Optional[str] = None) -> Optional[str]:
    """Creates a new subfilter (any level) via API."""
    if not name or not name.strip():
        logger.error("Subfilter name cannot be empty")
        return None
    
    if not filter_id:
        logger.error("Filter ID is required for subfilter creation")
        return None
    
    endpoint = config.subfilters_endpoint_template.format(filter_id=filter_id)
    payload = {"name": name.strip()}
    
    if parent_subfilter_id:
        payload["parentId"] = parent_subfilter_id
    
    level_indicator = "  " if parent_subfilter_id else ""
    logger.debug(f"{level_indicator}Creating subfilter: {name} (Parent: {parent_subfilter_id or 'None'})")
    
    response = make_request_with_retry("POST", endpoint, json=payload)
    
    if not response:
        return None
    
    try:
        created_subfilter = response.json()
        if isinstance(created_subfilter, dict) and "id" in created_subfilter:
            logger.debug(f"{level_indicator}Successfully created subfilter '{name}' with ID: {created_subfilter['id']}")
            return created_subfilter["id"]
        else:
            logger.error(f"Subfilter '{name}' created but response missing ID: {created_subfilter}")
            
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse create subfilter response: {e}")
    
    return None

# --- Enhanced Recursive Import Logic ---
@dataclass
class ImportStats:
    created: int = 0
    failed: int = 0
    skipped: int = 0
    duplicate: int = 0

def import_subfilters_recursive(
    main_filter_id: str, 
    subfilter_list: List[Dict], 
    parent_subfilter_id: Optional[str] = None, 
    existing_subfilters_map: Optional[Dict[str, str]] = None,
    level: int = 0
) -> ImportStats:
    """Recursively processes and creates subfilters from the JSON structure."""
    stats = ImportStats()
    
    if existing_subfilters_map is None:
        existing_subfilters_map = {}

    for subfilter_item in subfilter_list:
        # Handle different naming conventions based on the merged_filters.json structure
        subfilter_name = None
        children = []
        
        if isinstance(subfilter_item, dict):
            # First try 'nome' (subespecialidades level)
            subfilter_name = subfilter_item.get("nome")
            children = subfilter_item.get("assuntos", [])
            
            # If no 'nome', try 'assunto' (assuntos level)  
            if not subfilter_name:
                subfilter_name = subfilter_item.get("assunto")
                children = []  # assuntos don't have children
        elif isinstance(subfilter_item, str):
            subfilter_name = subfilter_item
            children = []
        
        # Convert string arrays to dict format if needed
        if isinstance(children, list) and all(isinstance(i, str) for i in children):
            children = [{"assunto": name} for name in children]
        
        if not subfilter_name:
            logger.warning(f"Skipping subfilter item with missing name at level {level}")
            stats.skipped += 1
            continue

        subfilter_name = subfilter_name.strip()
        subfilter_name_lower = subfilter_name.lower()
        is_top_level_subfilter = (parent_subfilter_id is None)
        
        # Check for duplicates only at top level
        new_subfilter_id = None
        should_create = True
        
        if is_top_level_subfilter and subfilter_name_lower in existing_subfilters_map:
            new_subfilter_id = existing_subfilters_map[subfilter_name_lower]
            logger.info(f"Subfilter '{subfilter_name}' already exists with ID: {new_subfilter_id}")
            stats.duplicate += 1
            should_create = False
        
        if should_create:
            new_subfilter_id = create_subfilter_api(main_filter_id, subfilter_name, parent_subfilter_id)
            time.sleep(config.REQUEST_DELAY)

        if new_subfilter_id:
            if should_create:
                stats.created += 1
            
            # Recursively import children
            if children:
                logger.debug(f"Processing {len(children)} children for '{subfilter_name}'")
                child_stats = import_subfilters_recursive(
                    main_filter_id, 
                    children, 
                    new_subfilter_id,
                    existing_subfilters_map=None,  # No duplicate check for nested levels
                    level=level + 1
                )
                stats.created += child_stats.created
                stats.failed += child_stats.failed
                stats.skipped += child_stats.skipped
                stats.duplicate += child_stats.duplicate
        elif should_create:
            stats.failed += 1
            logger.error(f"Failed to create subfilter '{subfilter_name}', skipping children")
            
    return stats

# --- Main Execution ---
def main():
    logger.info("=== Starting MedPulse Enhanced Filter Import (Merged Data) ===")
    logger.info(f"API Base URL: {config.MEDPULSE_API_BASE_URL}")
    logger.info(f"JSON File: {config.FILTERS_JSON_PATH}")
    
    # Authenticate first
    if not authenticate():
        logger.error("Authentication failed - cannot proceed")
        return False
    
    # Validate file exists
    if not os.path.exists(config.FILTERS_JSON_PATH):
        logger.error(f"JSON file not found: {config.FILTERS_JSON_PATH}")
        logger.info("Make sure to run html_to_json_converter.py first to generate the merged file!")
        return False
    
    # Load and validate JSON
    try:
        with open(config.FILTERS_JSON_PATH, "r", encoding="utf-8") as f:
            data_to_import = json.load(f)
        logger.info(f"Loaded {len(data_to_import)} especialidades from merged JSON file")
    except Exception as e:
        logger.error(f"Error reading JSON file: {e}")
        return False

    # Get existing filters
    existing_filters_map = get_existing_filters()
    
    # Initialize counters
    total_stats = ImportStats()
    especialidades_processed = 0
    especialidades_created = 0
    especialidades_skipped = 0

    # Process each especialidade
    for item in data_to_import:
        especialidade_name = item.get("especialidade")
        subespecialidades = item.get("subespecialidades", [])

        if not especialidade_name:
            logger.warning("Skipping item with missing 'especialidade' name")
            continue

        especialidades_processed += 1
        especialidade_name = especialidade_name.strip()
        especialidade_name_lower = especialidade_name.lower()

        # Create or get filter ID
        filter_id = existing_filters_map.get(especialidade_name_lower)
        
        if filter_id:
            logger.info(f"Filter '{especialidade_name}' already exists with ID: {filter_id}")
            especialidades_skipped += 1
        else:
            filter_id = create_filter_api(especialidade_name)
            time.sleep(config.REQUEST_DELAY)
            
            if filter_id:
                existing_filters_map[especialidade_name_lower] = filter_id
                especialidades_created += 1
            else:
                logger.error(f"Failed to create filter '{especialidade_name}', skipping subfilters")
                continue 

        if not subespecialidades:
            logger.info(f"No subespecialidades found for '{especialidade_name}'")
            continue
            
        logger.info(f"Processing {len(subespecialidades)} subfilters for '{especialidade_name}'...")
        
        # Get existing subfilters to avoid duplicates
        existing_level1_subfilters = get_existing_subfilters(filter_id)
        
        # Import subfilters recursively
        filter_stats = import_subfilters_recursive(
            filter_id, 
            subespecialidades, 
            parent_subfilter_id=None,
            existing_subfilters_map=existing_level1_subfilters
        )
        
        total_stats.created += filter_stats.created
        total_stats.failed += filter_stats.failed
        total_stats.skipped += filter_stats.skipped
        total_stats.duplicate += filter_stats.duplicate
                        
    # Final summary
    logger.info("\n" + "="*60)
    logger.info("🎯 ENHANCED IMPORT SUMMARY")
    logger.info("="*60)
    logger.info(f"📁 Source File: {config.FILTERS_JSON_PATH}")
    logger.info(f"🎓 Especialidades Processed: {especialidades_processed}")
    logger.info(f"🆕 Especialidades Created: {especialidades_created}")
    logger.info(f"♻️  Especialidades Skipped (existing): {especialidades_skipped}")
    logger.info(f"📚 Subfiltros Created: {total_stats.created}")
    logger.info(f"🔄 Subfiltros Skipped (existing): {total_stats.duplicate}")
    logger.info(f"⚠️  Subfiltros Skipped (invalid): {total_stats.skipped}")
    logger.info(f"❌ Subfiltros Failed: {total_stats.failed}")
    logger.info("="*60)
    
    success_rate = (total_stats.created / (total_stats.created + total_stats.failed)) * 100 if (total_stats.created + total_stats.failed) > 0 else 100
    logger.info(f"✅ Success Rate: {success_rate:.1f}%")
    
    if total_stats.failed > 0:
        logger.warning("Some items failed to import. Check the logs for details.")
        return False
    
    logger.info("🎉 Enhanced import completed successfully!")
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Import interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 