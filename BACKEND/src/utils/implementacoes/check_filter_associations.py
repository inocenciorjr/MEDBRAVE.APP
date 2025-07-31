#!/usr/bin/env python3
"""
Investigar associações entre filters e subFilters
Por que os subfiltros não aparecem no painel administrativo?
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

def check_associations():
    db = initialize_firebase()
    
    print("🔗 VERIFICANDO ASSOCIAÇÕES FILTER ↔ SUBFILTER")
    print("=" * 60)
    
    # Get all filters
    print("📂 Carregando filters...")
    filters_ref = db.collection('filters')
    all_filters = list(filters_ref.stream())
    
    filters_map = {}
    for doc in all_filters:
        data = doc.to_dict()
        name = data.get('name', 'N/A')
        filters_map[doc.id] = {
            'name': name,
            'data': data
        }
        print(f"   📋 {name} (ID: {doc.id})")
    
    # Get all subFilters
    print(f"\n📂 Carregando subFilters...")
    subfilters_ref = db.collection('subFilters')
    all_subfilters = list(subfilters_ref.stream())
    
    # Analyze associations
    associations = defaultdict(list)
    orphaned_subfilters = []
    invalid_filter_refs = []
    
    print(f"📊 Analisando {len(all_subfilters)} subFilters...")
    
    for doc in all_subfilters:
        data = doc.to_dict()
        name = data.get('name', 'N/A')
        filter_id = data.get('filterId', None)
        parent_id = data.get('parentId', None)
        level = data.get('level', 'N/A')
        
        if filter_id:
            if filter_id in filters_map:
                associations[filter_id].append({
                    'id': doc.id,
                    'name': name,
                    'parentId': parent_id,
                    'level': level,
                    'data': data
                })
            else:
                invalid_filter_refs.append({
                    'id': doc.id,
                    'name': name,
                    'filterId': filter_id,
                    'level': level
                })
        else:
            orphaned_subfilters.append({
                'id': doc.id,
                'name': name,
                'level': level
            })
    
    # Report results
    print(f"\n📊 RESULTADOS DAS ASSOCIAÇÕES:")
    print(f"=" * 60)
    
    for filter_id, filter_info in filters_map.items():
        filter_name = filter_info['name']
        subfilters_count = len(associations.get(filter_id, []))
        
        status = "✅" if subfilters_count > 0 else "❌"
        print(f"{status} {filter_name}: {subfilters_count} subfiltros")
        
        if subfilters_count > 0:
            # Show levels distribution
            levels_count = defaultdict(int)
            for sf in associations[filter_id]:
                levels_count[sf['level']] += 1
            
            levels_str = ", ".join([f"Nível {k}: {v}" for k, v in sorted(levels_count.items()) if k != 'N/A'])
            print(f"      📈 {levels_str}")
            
            # Show first few subfilters
            first_few = associations[filter_id][:3]
            for sf in first_few:
                print(f"      📋 {sf['name']} (ID: {sf['id']}, Nível: {sf['level']})")
            if len(associations[filter_id]) > 3:
                print(f"      ... e mais {len(associations[filter_id]) - 3} subfiltros")
        else:
            print(f"      ⚠️  Nenhum subfiltro associado!")
    
    # Report problems
    if invalid_filter_refs:
        print(f"\n❌ SUBFILTROS COM REFERÊNCIAS INVÁLIDAS:")
        print(f"   {len(invalid_filter_refs)} subfiltros apontando para filters inexistentes:")
        for sf in invalid_filter_refs[:10]:
            print(f"   📋 {sf['name']} → filterId: {sf['filterId']} (NÃO EXISTE)")
        if len(invalid_filter_refs) > 10:
            print(f"   ... e mais {len(invalid_filter_refs) - 10}")
    
    if orphaned_subfilters:
        print(f"\n👨‍👩‍👧‍👦 SUBFILTROS ÓRFÃOS (sem filterId):")
        print(f"   {len(orphaned_subfilters)} subfiltros sem filterId:")
        for sf in orphaned_subfilters:
            print(f"   📋 {sf['name']} (Nível: {sf['level']})")
    
    # Check specific problem: Cirurgia and Clínica Médica
    print(f"\n🔍 INVESTIGAÇÃO ESPECÍFICA:")
    print(f"=" * 40)
    
    # Check if Cirurgia has subFilters
    cirurgia_id = None
    clinica_id = None
    
    for filter_id, filter_info in filters_map.items():
        if filter_info['name'] == 'Cirurgia':
            cirurgia_id = filter_id
        elif filter_info['name'] == 'Clínica Médica':
            clinica_id = filter_id
    
    if cirurgia_id:
        cirurgia_subs = associations.get(cirurgia_id, [])
        print(f"🔍 Cirurgia (ID: {cirurgia_id}): {len(cirurgia_subs)} subfiltros")
        if len(cirurgia_subs) > 0:
            print(f"   📋 Primeiros subfiltros:")
            for sf in cirurgia_subs[:5]:
                print(f"      • {sf['name']} (Nível: {sf['level']})")
    
    if clinica_id:
        clinica_subs = associations.get(clinica_id, [])
        print(f"🔍 Clínica Médica (ID: {clinica_id}): {len(clinica_subs)} subfiltros")
        if len(clinica_subs) > 0:
            print(f"   📋 Primeiros subfiltros:")
            for sf in clinica_subs[:5]:
                print(f"      • {sf['name']} (Nível: {sf['level']})")
    
    # Summary for debugging
    print(f"\n🎯 RESUMO PARA DEBUG:")
    print(f"   📂 Total filters: {len(filters_map)}")
    print(f"   📂 Total subFilters: {len(all_subfilters)}")
    print(f"   🔗 Filters com subfiltros: {len([f for f in filters_map.keys() if len(associations.get(f, [])) > 0])}")
    print(f"   ❌ SubFilters com referência inválida: {len(invalid_filter_refs)}")
    print(f"   👨‍👩‍👧‍👦 SubFilters órfãos: {len(orphaned_subfilters)}")
    
    return {
        'filters_map': filters_map,
        'associations': dict(associations),
        'invalid_refs': invalid_filter_refs,
        'orphaned': orphaned_subfilters
    }

if __name__ == "__main__":
    check_associations() 