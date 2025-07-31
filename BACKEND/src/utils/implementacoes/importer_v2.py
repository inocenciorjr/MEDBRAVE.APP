import requests
import json
import os
import time

# --- Configuration ---
MEDPULSE_API_BASE_URL = os.environ.get("MEDPULSE_API_URL", "http://localhost:3333")
FILTERS_JSON_PATH = "/home/ubuntu/estrategia_filters_extracted.json"
FILTERS_ENDPOINT = f"{MEDPULSE_API_BASE_URL}/filters"
# This endpoint is used for ALL subfilter creations, regardless of level
SUBFILTERS_ENDPOINT_TEMPLATE = f"{MEDPULSE_API_BASE_URL}/filters/{{filter_id}}/subfilters"

HEADERS = {
    "Content-Type": "application/json",
    # "Authorization": "Bearer YOUR_TOKEN" # Add if needed
}

# --- Helper Functions ---
def get_existing_filters():
    """Fetches existing filters (Especialidades) from MedPulse."""
    existing_filters = {}
    try:
        print(f"Fetching existing filters from {FILTERS_ENDPOINT}...")
        response = requests.get(FILTERS_ENDPOINT, headers=HEADERS, timeout=10)
        response.raise_for_status()
        filters_data = response.json()
        filter_list = filters_data if isinstance(filters_data, list) else filters_data.get("filters", [])
        
        for f in filter_list:
            if "name" in f and "id" in f:
                existing_filters[f["name"].strip().lower()] = f["id"]
            else:
                print(f"Warning: Filter object missing name/id: {f}")
        print(f"Found {len(existing_filters)} existing filters.")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching existing filters: {e}. Proceeding without checks.")
    return existing_filters

def get_existing_subfilters(filter_id):
    """Fetches existing subfilters for a given filter ID to avoid duplicates at level 1."""
    # Note: This only checks direct children of the main filter for simplicity.
    # Checking deeper levels would require recursive API calls or a different list endpoint.
    existing_subfilters = {}
    endpoint = SUBFILTERS_ENDPOINT_TEMPLATE.format(filter_id=filter_id)
    try:
        # print(f" Fetching existing subfilters for filter {filter_id} from {endpoint}...")
        # Add pagination params if needed, e.g., ?limit=1000
        response = requests.get(endpoint, headers=HEADERS, timeout=15)
        response.raise_for_status()
        subfilters_data = response.json()
        
        # Handle different possible response structures ({subFilters: []} or just [])
        subfilter_list = []
        if isinstance(subfilters_data, list):
            subfilter_list = subfilters_data
        elif isinstance(subfilters_data, dict):
            # Look for common keys like 'subFilters', 'data', or the root list
            if "subFilters" in subfilters_data and isinstance(subfilters_data["subFilters"], list):
                subfilter_list = subfilters_data["subFilters"]
            elif "data" in subfilters_data and isinstance(subfilters_data["data"], list):
                 subfilter_list = subfilters_data["data"]
            # Add more checks if the API structure is different
            else:
                 print(f"Warning: Unexpected subfilter list format for filter {filter_id}: {subfilters_data}")

        for sf in subfilter_list:
            # We only care about subfilters directly under the main filter (parentId is null/undefined)
            if "name" in sf and "id" in sf and not sf.get("parentId"):
                existing_subfilters[sf["name"].strip().lower()] = sf["id"]
            # else: print(f"Debug: Subfilter {sf.get("name")} has parentId {sf.get("parentId")}")
                
        # print(f" Found {len(existing_subfilters)} existing top-level subfilters for filter {filter_id}.")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching subfilters for filter {filter_id}: {e}. Proceeding without checks.")
    return existing_subfilters

def create_filter_api(name):
    """Creates a new filter (Especialidade) via API."""
    payload = {"name": name}
    try:
        print(f"Creating filter: 	{name}	")
        response = requests.post(FILTERS_ENDPOINT, headers=HEADERS, json=payload, timeout=10)
        response.raise_for_status()
        created_filter = response.json()
        if isinstance(created_filter, dict) and "id" in created_filter:
            print(f"Successfully created filter 	{name}	 with ID: {created_filter["id"]}")
            return created_filter["id"]
        else:
            print(f"Error: Filter 	{name}	 created, but response missing ID: {created_filter}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error creating filter 	{name}	: {e}")
        # Print response body if available
        if e.response is not None: 
            try: print(f"Response: {e.response.json()}") 
            except: print(f"Response: {e.response.text}")
        return None

def create_subfilter_api(filter_id, name, parent_subfilter_id=None):
    """Creates a new subfilter (any level) via API, associating with parent if provided."""
    endpoint = SUBFILTERS_ENDPOINT_TEMPLATE.format(filter_id=filter_id)
    payload = {
        "name": name,
        "parentId": parent_subfilter_id # Will be None for level 1 subfilters
    }
    # Remove parentId if it's None, as the API might expect it to be absent
    if parent_subfilter_id is None:
        del payload["parentId"]
        
    indent = "  " * (1 if parent_subfilter_id else 0) # Basic indentation for logging
    try:
        # print(f"{indent}Creating subfilter: 	{name}	 (Parent ID: {parent_subfilter_id or 'None'}) under Filter ID: {filter_id}")
        response = requests.post(endpoint, headers=HEADERS, json=payload, timeout=10)
        response.raise_for_status()
        created_subfilter = response.json()
        if isinstance(created_subfilter, dict) and "id" in created_subfilter:
            # print(f"{indent}Successfully created subfilter 	{name}	 with ID: {created_subfilter["id"]}")
            return created_subfilter["id"] # Return the new subfilter's ID
        else:
            print(f"{indent}Error: Subfilter 	{name}	 created, but response missing ID: {created_subfilter}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"{indent}Error creating subfilter 	{name}	 (Parent ID: {parent_subfilter_id}): {e}")
        if e.response is not None: 
            try: print(f"{indent}Response: {e.response.json()}") 
            except: print(f"{indent}Response: {e.response.text}")
        return None

# --- Recursive Import Logic ---
def import_subfilters_recursive(main_filter_id, subfilter_list, parent_subfilter_id=None, existing_subfilters_map=None):
    """Recursively processes and creates subfilters from the JSON structure."""
    created_count = 0
    failed_count = 0
    skipped_count = 0
    
    if existing_subfilters_map is None:
        existing_subfilters_map = {} # Initialize if called for deeper levels

    for subfilter_item in subfilter_list:
        subfilter_name = subfilter_item.get("nome") or subfilter_item.get("assunto") # Handle both keys
        children = subfilter_item.get("assuntos", []) # Assumes children are always in "assuntos"
        
        # If "assuntos" is empty, check if the item itself represents a leaf node name
        if not children and isinstance(subfilter_item, str):
             subfilter_name = subfilter_item # Handle case where "assuntos" is a list of strings
             children = [] # No deeper children
        elif isinstance(children, list) and all(isinstance(i, str) for i in children):
             # If 'assuntos' is a list of strings, treat them as leaf nodes
             # Convert them to the expected dictionary structure for recursion
             children = [{"assunto": name} for name in children]
             
        if not subfilter_name:
            print(f"  Warning: Skipping subfilter item with missing name under parent {parent_subfilter_id or main_filter_id}.")
            skipped_count += 1
            continue

        new_subfilter_id = None
        subfilter_name_lower = subfilter_name.strip().lower()
        is_top_level_subfilter = (parent_subfilter_id is None)

        # Check for duplicates only at the top level for simplicity
        should_create = True
        if is_top_level_subfilter and subfilter_name_lower in existing_subfilters_map:
            new_subfilter_id = existing_subfilters_map[subfilter_name_lower]
            print(f"  Subfilter 	{subfilter_name}	 already exists with ID: {new_subfilter_id}. Skipping creation.")
            should_create = False
        
        if should_create:
            new_subfilter_id = create_subfilter_api(main_filter_id, subfilter_name, parent_subfilter_id)
            time.sleep(0.1) # Small delay to avoid overwhelming the API

        if new_subfilter_id:
            if should_create: created_count += 1
            # Recursively import children, passing the newly created ID as the parentId
            if children:
                # print(f"  Processing children for 	{subfilter_name}	 (ID: {new_subfilter_id})")
                child_created, child_failed, child_skipped = import_subfilters_recursive(
                    main_filter_id, 
                    children, 
                    new_subfilter_id
                    # No need to pass existing_subfilters_map for deeper levels unless API supports it
                )
                created_count += child_created
                failed_count += child_failed
                skipped_count += child_skipped
        elif should_create: # Only count as failed if we attempted creation
            failed_count += 1
            print(f"  Failed to create subfilter 	{subfilter_name}	. Skipping its children.")
            
    return created_count, failed_count, skipped_count

# --- Main Execution ---
def main():
    print("Starting MedPulse hierarchical filter import process...")
    print(f"Using MedPulse API Base URL: {MEDPULSE_API_BASE_URL}")
    
    try:
        with open(FILTERS_JSON_PATH, "r", encoding="utf-8") as f:
            data_to_import = json.load(f)
        print(f"Loaded {len(data_to_import)} especialidades from {FILTERS_JSON_PATH}")
    except Exception as e:
        print(f"Error reading or parsing JSON file {FILTERS_JSON_PATH}: {e}")
        return

    existing_filters_map = get_existing_filters()
    
    total_created = 0
    total_failed = 0
    total_skipped = 0
    especialidades_processed = 0

    for item in data_to_import:
        especialidade_name = item.get("especialidade")
        subespecialidades = item.get("subespecialidades", [])

        if not especialidade_name:
            print("Warning: Skipping item with missing 'especialidade' name.")
            continue

        especialidades_processed += 1
        filter_id = None
        especialidade_name_lower = especialidade_name.strip().lower()

        if especialidade_name_lower in existing_filters_map:
            filter_id = existing_filters_map[especialidade_name_lower]
            print(f"Filter 	{especialidade_name}	 already exists with ID: {filter_id}. Using existing.")
        else:
            filter_id = create_filter_api(especialidade_name)
            time.sleep(0.1)
            if filter_id:
                existing_filters_map[especialidade_name_lower] = filter_id
            else:
                print(f"Failed to create filter 	{especialidade_name}	. Skipping its subfilters.")
                continue 

        if not subespecialidades:
            print(f"No subespecialidades found for 	{especialidade_name}	.")
            continue
            
        print(f"Processing {len(subespecialidades)} top-level subfilters for 	{especialidade_name}	...")
        # Get existing top-level subfilters for this specific filter to avoid duplicates
        existing_level1_subfilters = get_existing_subfilters(filter_id)
        
        # Start recursive import for subfilters of this especialidade
        created, failed, skipped = import_subfilters_recursive(
            filter_id, 
            subespecialidades, 
            parent_subfilter_id=None, # Top level subfilters have no parent subfilter
            existing_subfilters_map=existing_level1_subfilters
        )
        total_created += created
        total_failed += failed
        total_skipped += skipped
                        
    print("\n--- Import Summary ---")
    print(f"Especialidades Processed: {especialidades_processed}")
    print(f"Subfiltros Created: {total_created}")
    print(f"Subfiltros Skipped (missing name): {total_skipped}")
    print(f"Subfiltros Failed: {total_failed}")
    print("Import process finished.")

if __name__ == "__main__":
    if MEDPULSE_API_BASE_URL == "http://localhost:3333":
        print("Warning: Using default API URL 'http://localhost:3333'.")
        print("Set MEDPULSE_API_URL environment variable or modify script if needed.")
        confirm = input("Continue with default URL? (y/n): ")
        if confirm.lower() != 'y':
            print("Exiting.")
            exit()
            
    main()

