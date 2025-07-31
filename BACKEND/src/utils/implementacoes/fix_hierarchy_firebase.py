#!/usr/bin/env python3
"""
Script para corrigir hierarquia de subfiltros usando Firebase Admin SDK diretamente
Contorna problemas de autenticação da API
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
import time
import sys
from typing import Dict, List, Optional
import logging

# --- Configuration ---
FIREBASE_CREDENTIALS_PATH = "../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json"
FILTERS_JSON_PATH = "merged_filters.json"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fix_hierarchy_firebase.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase Admin SDK."""
    logger.info("Initializing Firebase Admin SDK...")
    
    if not os.path.exists(FIREBASE_CREDENTIALS_PATH):
        logger.error(f"Firebase credentials not found: {FIREBASE_CREDENTIALS_PATH}")
        return None
    
    try:
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        
        # Get Firestore client
        db = firestore.client()
        logger.info("Firebase initialized successfully!")
        return db
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        return None

def get_all_filters(db) -> Dict[str, Dict]:
    """Get all filters from Firestore."""
    logger.info("Fetching all filters from Firestore...")
    
    try:
        filters_ref = db.collection('filters')
        filters = filters_ref.stream()
        
        filters_map = {}
        for filter_doc in filters:
            filter_data = filter_doc.to_dict()
            filter_data['id'] = filter_doc.id
            
            if 'name' in filter_data:
                filters_map[filter_data['name'].strip().lower()] = filter_data
        
        logger.info(f"Found {len(filters_map)} filters in Firestore")
        return filters_map
        
    except Exception as e:
        logger.error(f"Failed to fetch filters: {e}")
        return {}

def get_all_subfilters(db, filter_id: str) -> Dict[str, Dict]:
    """Get all subfilters for a given filter ID from Firestore."""
    logger.info(f"Fetching subfilters for filter {filter_id}...")
    
    try:
        # subFilters is a root collection, not a subcollection
        subfilters_ref = db.collection('subFilters').where('filterId', '==', filter_id)
        subfilters = subfilters_ref.stream()
        
        subfilters_map = {}
        for subfilter_doc in subfilters:
            subfilter_data = subfilter_doc.to_dict()
            subfilter_data['id'] = subfilter_doc.id
            
            if 'name' in subfilter_data:
                subfilters_map[subfilter_data['name'].strip().lower()] = subfilter_data
        
        logger.info(f"Found {len(subfilters_map)} subfilters for filter {filter_id}")
        return subfilters_map
        
    except Exception as e:
        logger.error(f"Failed to fetch subfilters for filter {filter_id}: {e}")
        return {}

def update_subfilter_parent(db, filter_id: str, subfilter_id: str, parent_id: str) -> bool:
    """Update a subfilter's parent ID in Firestore."""
    try:
        # subFilters is a root collection
        subfilter_ref = db.collection('subFilters').document(subfilter_id)
        subfilter_ref.update({'parentId': parent_id})
        
        logger.debug(f"Updated subfilter {subfilter_id} with parent {parent_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to update subfilter {subfilter_id}: {e}")
        return False

def fix_hierarchy_for_filter(db, filter_name: str, filter_data: Dict, subespecialidades: List[Dict]) -> int:
    """Fix hierarchy for a specific filter."""
    logger.info(f"Fixing hierarchy for filter: {filter_name}")
    
    filter_id = filter_data["id"]
    
    # Get all existing subfilters
    all_subfilters = get_all_subfilters(db, filter_id)
    
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
            if update_subfilter_parent(db, filter_id, child_id, parent_id):
                logger.info(f"    Updated '{assunto_name}' -> parent: '{subespec_name}'")
                updates_count += 1
                time.sleep(0.1)  # Small delay to avoid overwhelming Firestore
            else:
                logger.error(f"    Failed to update '{assunto_name}'")
    
    return updates_count

def explore_firestore_structure(db):
    """Explore Firestore structure to understand what collections exist."""
    logger.info("=== EXPLORING FIRESTORE STRUCTURE ===")
    
    # List all collections at root level
    try:
        collections = db.collections()
        logger.info("Root level collections:")
        for collection in collections:
            logger.info(f"  - {collection.id}")
            
            # Get a few documents from each collection to understand structure
            docs = collection.limit(3).stream()
            for doc in docs:
                doc_data = doc.to_dict()
                logger.info(f"    Document {doc.id}: {list(doc_data.keys())}")
                
                # Check for subcollections
                subcollections = doc.reference.collections()
                for subcol in subcollections:
                    logger.info(f"      Subcollection: {subcol.id}")
                    
                    # Get a sample from subcollection
                    subdocs = subcol.limit(2).stream()
                    for subdoc in subdocs:
                        subdoc_data = subdoc.to_dict()
                        logger.info(f"        Sample subdoc {subdoc.id}: {list(subdoc_data.keys())}")
                        
    except Exception as e:
        logger.error(f"Failed to explore structure: {e}")
        
    logger.info("=== END EXPLORATION ===\n")

def main():
    logger.info("=== MedPulse Hierarchy Fix Tool (Firebase Direct) ===")
    logger.info(f"Firebase Credentials: {FIREBASE_CREDENTIALS_PATH}")
    logger.info(f"JSON File: {FILTERS_JSON_PATH}")
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        logger.error("Firebase initialization failed - cannot proceed")
        return False
    
    # Load JSON file
    if not os.path.exists(FILTERS_JSON_PATH):
        logger.error(f"JSON file not found: {FILTERS_JSON_PATH}")
        return False
    
    try:
        with open(FILTERS_JSON_PATH, "r", encoding="utf-8") as f:
            data_to_process = json.load(f)
        logger.info(f"Loaded {len(data_to_process)} especialidades from JSON file")
    except Exception as e:
        logger.error(f"Error reading JSON file: {e}")
        return False

    # Get all existing filters
    existing_filters = get_all_filters(db)
    
    if not existing_filters:
        logger.error("No filters found in Firestore")
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
            logger.warning(f"Filter '{especialidade_name}' not found in Firestore")
            continue
            
        # Fix hierarchy for this filter
        updates = fix_hierarchy_for_filter(db, especialidade_name, filter_data, subespecialidades)
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
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 