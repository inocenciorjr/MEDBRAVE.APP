#!/usr/bin/env python3
"""
Script para reorganizar filtros existentes no Firebase
seguindo a nova hierarquia de 6 níveis
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
from collections import defaultdict
import time

def initialize_firebase():
    """Initialize Firebase Admin SDK."""
    cred_file = '../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json'
    
    try:
        if firebase_admin._apps:
            firebase_admin.delete_app(firebase_admin.get_app())
        
        cred = credentials.Certificate(cred_file)
        firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        print("✅ Firebase conectado!")
        return db
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return None

def load_new_hierarchy():
    """Load the new 6-level hierarchy from JSON."""
    with open('firestore_FINAL_CLEAN.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return data['items']

def get_firebase_filters(db):
    """Get all existing filters and subFilters from Firebase."""
    print("📖 Carregando filtros existentes do Firebase...")
    
    # Get filters
    filters = {}
    filters_ref = db.collection('filters')
    for doc in filters_ref.stream():
        data = doc.to_dict()
        filters[doc.id] = {
            'id': doc.id,
            'name': data.get('name', ''),
            'type': 'filter'
        }
    
    # Get subFilters
    subfilters = {}
    subfilters_ref = db.collection('subFilters')
    for doc in subfilters_ref.stream():
        data = doc.to_dict()
        subfilters[doc.id] = {
            'id': doc.id,
            'name': data.get('name', ''),
            'filterId': data.get('filterId'),
            'parentId': data.get('parentId'),
            'type': 'subfilter'
        }
    
    print(f"✅ {len(filters)} filters e {len(subfilters)} subFilters carregados")
    return filters, subfilters

def create_name_mapping(new_hierarchy, firebase_filters, firebase_subfilters):
    """Create mapping between new hierarchy and existing Firebase items by name."""
    print("🗺️ Criando mapeamento por nome...")
    
    # Create name-to-item mapping for new hierarchy
    new_by_name = {}
    for item in new_hierarchy:
        name_clean = item['name'].strip().lower()
        new_by_name[name_clean] = item
    
    # Create name-to-ID mapping for existing Firebase items
    firebase_by_name = {}
    
    # Add filters
    for filter_id, filter_data in firebase_filters.items():
        name_clean = filter_data['name'].strip().lower()
        firebase_by_name[name_clean] = filter_id
    
    # Add subfilters
    for subfilter_id, subfilter_data in firebase_subfilters.items():
        name_clean = subfilter_data['name'].strip().lower()
        firebase_by_name[name_clean] = subfilter_id
    
    # Create mapping: new_hierarchy_item -> firebase_id
    mapping = {}
    matches = 0
    
    for item in new_hierarchy:
        name_clean = item['name'].strip().lower()
        if name_clean in firebase_by_name:
            firebase_id = firebase_by_name[name_clean]
            mapping[item['id']] = firebase_id
            matches += 1
    
    print(f"✅ {matches} correspondências encontradas de {len(new_hierarchy)} itens")
    return mapping

def update_firebase_hierarchy(db, new_hierarchy, mapping):
    """Update parentId relationships in Firebase based on new hierarchy."""
    print("🔄 Atualizando hierarquia no Firebase...")
    
    updates_made = 0
    batch_size = 500
    batch = db.batch()
    operations_in_batch = 0
    
    # Group items by level to update in order
    by_level = defaultdict(list)
    for item in new_hierarchy:
        by_level[item['level']].append(item)
    
    # Update level by level
    for level in sorted(by_level.keys()):
        print(f"📋 Processando nível {level}: {len(by_level[level])} itens")
        
        for item in by_level[level]:
            new_id = item['id']
            parent_id = item['parentId']
            
            # Check if this item exists in Firebase
            if new_id not in mapping:
                continue  # Item doesn't exist in Firebase, skip
            
            firebase_id = mapping[new_id]
            
            # Determine target parentId in Firebase
            firebase_parent_id = None
            if parent_id and parent_id in mapping:
                firebase_parent_id = mapping[parent_id]
            
            # Determine if it's a filter or subfilter
            if item['level'] == 0:
                # Level 0 = filters (no parent)
                continue  # Filters don't have parents, skip
            else:
                # Level 1+ = subFilters
                doc_ref = db.collection('subFilters').document(firebase_id)
                
                # Update parentId
                batch.update(doc_ref, {'parentId': firebase_parent_id})
                operations_in_batch += 1
                updates_made += 1
                
                print(f"   🔄 {item['name']} -> parent: {firebase_parent_id}")
                
                # Execute batch if full
                if operations_in_batch >= batch_size:
                    batch.commit()
                    print(f"   💾 Batch de {operations_in_batch} atualizações executado")
                    batch = db.batch()
                    operations_in_batch = 0
                    time.sleep(0.5)  # Small delay
    
    # Execute remaining batch
    if operations_in_batch > 0:
        batch.commit()
        print(f"   💾 Batch final de {operations_in_batch} atualizações executado")
    
    print(f"✅ {updates_made} atualizações realizadas!")
    return updates_made

def main():
    print("🔧 REORGANIZAÇÃO DA HIERARQUIA DO FIREBASE")
    print("=" * 60)
    
    # 1. Connect to Firebase
    db = initialize_firebase()
    if not db:
        return False
    
    # 2. Load new hierarchy
    print("📖 Carregando nova hierarquia...")
    new_hierarchy = load_new_hierarchy()
    print(f"✅ {len(new_hierarchy)} itens na nova hierarquia")
    
    # 3. Get existing Firebase data
    firebase_filters, firebase_subfilters = get_firebase_filters(db)
    
    # 4. Create mapping
    mapping = create_name_mapping(new_hierarchy, firebase_filters, firebase_subfilters)
    
    # 5. Update Firebase hierarchy
    updates = update_firebase_hierarchy(db, new_hierarchy, mapping)
    
    print(f"\n🎉 REORGANIZAÇÃO CONCLUÍDA!")
    print(f"📊 {updates} atualizações realizadas")
    print(f"✅ Hierarquia de 6 níveis aplicada ao Firebase!")
    
    return True

if __name__ == "__main__":
    main() 