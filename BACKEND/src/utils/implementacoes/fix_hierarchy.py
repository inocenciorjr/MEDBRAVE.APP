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
    MEDPULSE_API_BASE_URL: str = os.environ.get("MEDPULSE_API_URL", "http://localhost:5000")
    FILTERS_JSON_PATH: str = "merged_filters.json"
    MAX_RETRIES: int = 3
    RETRY_DELAY: float = 1.0
    REQUEST_DELAY: float = 0.1
    REQUEST_TIMEOUT: int = 30
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

config = Config()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fix_hierarchy.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

HEADERS = {"Content-Type": "application/json"}

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
            logger.info("Authentication successful!")
            return True
        else:
            logger.error(f"No token found in auth response: {auth_data}")
            return False
            
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        return False

def make_request_with_retry(method: str, url: str, **kwargs) -> Optional[requests.Response]:
    """Makes HTTP requests with retry logic."""
    for attempt in range(config.MAX_RETRIES + 1):
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
            if attempt == config.MAX_RETRIES:
                logger.error(f"Failed after {config.MAX_RETRIES + 1} attempts: {e}")
                return None
            
            wait_time = config.RETRY_DELAY * (2 ** attempt)
            logger.warning(f"Attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
            time.sleep(wait_time)
    
    return None

def get_all_filters() -> Dict[str, Dict]:
    """Get all filters from the database."""
    logger.info("Fetching all filters...")
    response = make_request_with_retry("GET", config.filters_endpoint)
    
    if not response:
        return {}
    
    try:
        filters_data = response.json()
        filter_list = filters_data if isinstance(filters_data, list) else filters_data.get("filters", [])
        
        filters_map = {}
        for f in filter_list:
            if isinstance(f, dict) and "name" in f and "id" in f:
                filters_map[f["name"].strip().lower()] = f
        
        logger.info(f"Found {len(filters_map)} filters")
        return filters_map
        
    except Exception as e:
        logger.error(f"Failed to parse filters response: {e}")
        return {}

def get_all_subfilters(filter_id: str) -> Dict[str, Dict]:
    """Get all subfilters for a given filter ID."""
    endpoint = config.subfilters_endpoint_template.format(filter_id=filter_id)
    response = make_request_with_retry("GET", endpoint)
    
    if not response:
        return {}
    
    try:
        subfilters_data = response.json()
        
        subfilter_list = []
        if isinstance(subfilters_data, list):
            subfilter_list = subfilters_data
        elif isinstance(subfilters_data, dict):
            possible_keys = ["subFilters", "data", "subfilters", "items"]
            for key in possible_keys:
                if key in subfilters_data and isinstance(subfilters_data[key], list):
                    subfilter_list = subfilters_data[key]
                    break

        subfilters_map = {}
        for sf in subfilter_list:
            if isinstance(sf, dict) and "name" in sf and "id" in sf:
                subfilters_map[sf["name"].strip().lower()] = sf
                
        logger.info(f"Found {len(subfilters_map)} subfilters for filter {filter_id}")
        return subfilters_map
        
    except Exception as e:
        logger.error(f"Failed to parse subfilters response for filter {filter_id}: {e}")
        return {}

def update_subfilter_parent(subfilter_id: str, parent_id: str, filter_id: str) -> bool:
    """Update a subfilter's parent ID."""
    endpoint = f"{config.subfilters_endpoint_template.format(filter_id=filter_id)}/{subfilter_id}"
    
    payload = {"parentId": parent_id}
    
    response = make_request_with_retry("PATCH", endpoint, json=payload)
    
    if response:
        logger.debug(f"Updated subfilter {subfilter_id} with parent {parent_id}")
        return True
    else:
        logger.error(f"Failed to update subfilter {subfilter_id}")
        return False

def fix_hierarchy_for_filter(filter_name: str, filter_data: Dict, subespecialidades: List[Dict]) -> int:
    """Fix hierarchy for a specific filter."""
    logger.info(f"Fixing hierarchy for filter: {filter_name}")
    
    filter_id = filter_data["id"]
    
    # Get all existing subfilters
    all_subfilters = get_all_subfilters(filter_id)
    
    updates_count = 0
    
    # Process each subespecialidade (level 1 subfilters)
    for subespec in subespecialidades:
        subespec_name = subespec.get("nome", "").strip()
        if not subespec_name:
            continue
            
        subespec_name_lower = subespec_name.lower()
        
        # Find the parent subfilter
        parent_subfilter = all_subfilters.get(subespec_name_lower)
        if not parent_subfilter:
            logger.warning(f"Parent subfilter '{subespec_name}' not found in database")
            continue
            
        parent_id = parent_subfilter["id"]
        assuntos = subespec.get("assuntos", [])
        
        if not assuntos:
            continue
            
        logger.info(f"  Processing {len(assuntos)} children for '{subespec_name}'")
        
        # Process each assunto (level 2 subfilters)
        for assunto in assuntos:
            if isinstance(assunto, str):
                assunto_name = assunto.strip()
            else:
                assunto_name = assunto.get("nome", assunto.get("assunto", "")).strip()
                
            if not assunto_name:
                continue
                
            assunto_name_lower = assunto_name.lower()
            
            # Find the child subfilter
            child_subfilter = all_subfilters.get(assunto_name_lower)
            if not child_subfilter:
                logger.warning(f"    Child subfilter '{assunto_name}' not found in database")
                continue
                
            child_id = child_subfilter["id"]
            current_parent_id = child_subfilter.get("parentId")
            
            # Check if it already has the correct parent
            if current_parent_id == parent_id:
                logger.debug(f"    '{assunto_name}' already has correct parent")
                continue
                
            # Update the parent
            if update_subfilter_parent(child_id, parent_id, filter_id):
                logger.info(f"    Updated '{assunto_name}' -> parent: '{subespec_name}'")
                updates_count += 1
                time.sleep(config.REQUEST_DELAY)
            else:
                logger.error(f"    Failed to update '{assunto_name}'")
    
    return updates_count

def main():
    logger.info("=== MedPulse Hierarchy Fix Tool ===")
    logger.info(f"API Base URL: {config.MEDPULSE_API_BASE_URL}")
    logger.info(f"JSON File: {config.FILTERS_JSON_PATH}")
    
    # Authenticate first
    if not authenticate():
        logger.error("Authentication failed - cannot proceed")
        return False
    
    # Load JSON file
    if not os.path.exists(config.FILTERS_JSON_PATH):
        logger.error(f"JSON file not found: {config.FILTERS_JSON_PATH}")
        return False
    
    try:
        with open(config.FILTERS_JSON_PATH, "r", encoding="utf-8") as f:
            data_to_process = json.load(f)
        logger.info(f"Loaded {len(data_to_process)} especialidades from JSON file")
    except Exception as e:
        logger.error(f"Error reading JSON file: {e}")
        return False

    # Get all existing filters
    existing_filters = get_all_filters()
    
    if not existing_filters:
        logger.error("No filters found in database")
        return False

    total_updates = 0
    processed_filters = 0
    
    # Process each especialidade
    for item in data_to_process:
        especialidade_name = item.get("especialidade", "").strip()
        subespecialidades = item.get("subespecialidades", [])
        
        if not especialidade_name or not subespecialidades:
            continue
            
        especialidade_name_lower = especialidade_name.lower()
        
        # Find the filter in database
        filter_data = existing_filters.get(especialidade_name_lower)
        if not filter_data:
            logger.warning(f"Filter '{especialidade_name}' not found in database")
            continue
            
        # Fix hierarchy for this filter
        updates = fix_hierarchy_for_filter(especialidade_name, filter_data, subespecialidades)
        total_updates += updates
        processed_filters += 1
        
        logger.info(f"Completed '{especialidade_name}' - {updates} updates made\n")

    # Final summary
    logger.info("\n" + "="*60)
    logger.info("HIERARCHY FIX SUMMARY")
    logger.info("="*60)
    logger.info(f"Filters Processed: {processed_filters}")
    logger.info(f"Total Updates Made: {total_updates}")
    logger.info("="*60)
    
    if total_updates > 0:
        logger.info("Hierarchy fix completed successfully!")
        logger.info("The frontend should now show proper hierarchical subfiltros!")
    else:
        logger.info("No updates needed - hierarchy was already correct!")
    
    return True

if __name__ == "__main__":
    if config.MEDPULSE_API_BASE_URL == "http://localhost:3333":
        print("⚠️  Warning: Using default API URL 'http://localhost:3333'")
        print("Set MEDPULSE_API_URL environment variable if different")
        confirm = input("Continue with default URL? (y/n): ")
        if confirm.lower() != 'y':
            print("Exiting...")
            sys.exit(0)
    
    success = main()
    sys.exit(0 if success else 1) 