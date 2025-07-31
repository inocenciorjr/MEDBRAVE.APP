#!/usr/bin/env python3
"""
Corrigir associações filterId dos subfiltros órfãos
Associar subfiltros aos filters corretos baseado na hierarquia
"""

import firebase_admin
from firebase_admin import credentials, firestore
from collections import defaultdict

def initialize_firebase():
    if firebase_admin._apps:
        firebase_admin.delete_app(firebase_admin.get_app())
    
    cred = credentials.Certificate('../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json')
    firebase_admin.initialize_app(cred)
    return firestore.client()

def fix_filter_associations():
    db = initialize_firebase()
    
    print("🔧 CORRIGINDO ASSOCIAÇÕES FILTER ↔ SUBFILTER")
    print("=" * 60)
    
    # Get all filters - these are the root level (level 0)
    print("📂 Carregando filters...")
    filters_ref = db.collection('filters')
    all_filters = list(filters_ref.stream())
    
    # Map filter names to IDs (excluding Ano, Instituição, Finalidade)
    specialty_filters = {}
    kept_filters = ['Ano', 'Instituição', 'Finalidade']
    
    for doc in all_filters:
        data = doc.to_dict()
        name = data.get('name', 'N/A')
        
        if not any(kept.lower() in name.lower() for kept in kept_filters):
            specialty_filters[name] = doc.id
            print(f"   📋 {name} (ID: {doc.id})")
    
    print(f"✅ {len(specialty_filters)} especialidades encontradas")
    
    # Get all subFilters
    print(f"\n📂 Carregando subFilters...")
    subfilters_ref = db.collection('subFilters')
    all_subfilters = list(subfilters_ref.stream())
    
    print(f"📊 {len(all_subfilters)} subFilters carregados")
    
    # Build hierarchy map
    subfilters_map = {}
    orphaned_subfilters = []
    
    for doc in all_subfilters:
        data = doc.to_dict()
        name = data.get('name', 'N/A')
        level = data.get('level', 'N/A')
        parent_id = data.get('parentId', None)
        filter_id = data.get('filterId', None)
        
        subfilters_map[doc.id] = {
            'id': doc.id,
            'name': name,
            'level': level,
            'parentId': parent_id,
            'filterId': filter_id,
            'data': data
        }
        
        if not filter_id:
            orphaned_subfilters.append(doc.id)
    
    print(f"👨‍👩‍👧‍👦 {len(orphaned_subfilters)} subfiltros órfãos encontrados")
    
    # Function to find root specialty for a subfilter
    def find_root_specialty(subfilter_id, visited=None):
        if visited is None:
            visited = set()
        
        if subfilter_id in visited:
            return None  # Avoid infinite loops
        
        visited.add(subfilter_id)
        
        if subfilter_id not in subfilters_map:
            return None
        
        subfilter = subfilters_map[subfilter_id]
        parent_id = subfilter['parentId']
        
        if not parent_id:
            # This is a root level subfilter, find by name matching
            name = subfilter['name']
            for specialty_name, specialty_id in specialty_filters.items():
                if specialty_name == name:
                    return specialty_id
            return None
        
        # Recursively find the root
        return find_root_specialty(parent_id, visited)
    
    # Fix orphaned subFilters
    fixed_count = 0
    batch_size = 500
    batch = db.batch()
    operations_in_batch = 0
    
    print(f"\n🔧 Corrigindo associações...")
    
    for subfilter_id in orphaned_subfilters:
        subfilter = subfilters_map[subfilter_id]
        
        # Find the root specialty this subfilter belongs to
        root_specialty_id = find_root_specialty(subfilter_id)
        
        if root_specialty_id:
            # Update the subfilter with correct filterId
            doc_ref = db.collection('subFilters').document(subfilter_id)
            batch.update(doc_ref, {'filterId': root_specialty_id})
            
            operations_in_batch += 1
            fixed_count += 1
            
            if operations_in_batch >= batch_size:
                batch.commit()
                print(f"   💾 Batch de {operations_in_batch} subfiltros corrigidos")
                batch = db.batch()
                operations_in_batch = 0
        else:
            print(f"   ⚠️  Não foi possível encontrar especialidade para: {subfilter['name']}")
    
    # Commit remaining operations
    if operations_in_batch > 0:
        batch.commit()
        print(f"   💾 Batch final de {operations_in_batch} subfiltros corrigidos")
    
    print(f"\n🎉 CORREÇÃO CONCLUÍDA!")
    print(f"✅ {fixed_count} subfiltros corrigidos")
    print(f"📊 {len(orphaned_subfilters) - fixed_count} ainda precisam de correção manual")
    
    # Verify results
    print(f"\n🔍 VERIFICANDO RESULTADOS...")
    
    # Check associations again
    associations = defaultdict(int)
    
    all_subfilters_updated = list(db.collection('subFilters').stream())
    for doc in all_subfilters_updated:
        data = doc.to_dict()
        filter_id = data.get('filterId', None)
        if filter_id:
            associations[filter_id] += 1
    
    print(f"📊 ASSOCIAÇÕES APÓS CORREÇÃO:")
    for specialty_name, specialty_id in specialty_filters.items():
        count = associations.get(specialty_id, 0)
        status = "✅" if count > 0 else "❌"
        print(f"{status} {specialty_name}: {count} subfiltros")
    
    return {
        'fixed_count': fixed_count,
        'total_orphaned': len(orphaned_subfilters),
        'associations': dict(associations)
    }

if __name__ == "__main__":
    fix_filter_associations() 