#!/usr/bin/env python3
"""
Script para verificar estado atual do Firebase após importação
Investigar problemas com subfiltros não criados
"""

import firebase_admin
from firebase_admin import credentials, firestore
from collections import defaultdict
import json

def initialize_firebase():
    if firebase_admin._apps:
        firebase_admin.delete_app(firebase_admin.get_app())
    
    cred = credentials.Certificate('../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json')
    firebase_admin.initialize_app(cred)
    return firestore.client()

def check_current_status():
    db = initialize_firebase()
    
    print("🔍 VERIFICANDO ESTADO ATUAL DO FIREBASE")
    print("=" * 60)
    
    # Check filters collection
    print("📂 Analisando coleção 'filters'...")
    filters_ref = db.collection('filters')
    all_filters = list(filters_ref.stream())
    
    print(f"📊 Total de filters: {len(all_filters)}")
    
    filters_by_name = {}
    for doc in all_filters:
        data = doc.to_dict()
        name = data.get('name', 'N/A')
        filters_by_name[name] = {
            'id': doc.id,
            'data': data
        }
        print(f"   📋 {name} (ID: {doc.id})")
    
    # Check subFilters collection
    print(f"\n📂 Analisando coleção 'subFilters'...")
    subfilters_ref = db.collection('subFilters')
    all_subfilters = list(subfilters_ref.stream())
    
    print(f"📊 Total de subFilters: {len(all_subfilters)}")
    
    # Analyze subFilters by level
    levels = defaultdict(int)
    subfilters_by_level = defaultdict(list)
    subfilters_without_parent = []
    subfilters_with_custom_ids = 0
    subfilters_with_random_ids = 0
    
    for doc in all_subfilters:
        data = doc.to_dict()
        level = data.get('level', 'N/A')
        name = data.get('name', 'N/A')
        parent_id = data.get('parentId', None)
        filter_id = data.get('filterId', None)
        
        levels[level] += 1
        subfilters_by_level[level].append({
            'id': doc.id,
            'name': name,
            'parentId': parent_id,
            'filterId': filter_id,
            'data': data
        })
        
        if not parent_id:
            subfilters_without_parent.append(name)
        
        # Check if ID looks custom (contains underscores) or random
        if '_' in doc.id and len(doc.id) > 20:
            subfilters_with_custom_ids += 1
        else:
            subfilters_with_random_ids += 1
    
    print(f"\n📈 SubFilters por nível:")
    # Corrige: separa níveis numéricos de strings
    numeric_levels = {k: v for k, v in levels.items() if isinstance(k, int)}
    string_levels = {k: v for k, v in levels.items() if not isinstance(k, int)}
    
    for level in sorted(numeric_levels.keys()):
        print(f"   📂 Nível {level}: {numeric_levels[level]} itens")
    
    for level in sorted(string_levels.keys()):
        print(f"   ❌ Nível '{level}': {string_levels[level]} itens")
    
    if 'N/A' in levels:
        print(f"   ❌ Sem nível definido: {levels['N/A']} itens")
    
    print(f"\n🔤 Análise de IDs:")
    print(f"   ✅ IDs personalizados (com _): {subfilters_with_custom_ids}")
    print(f"   ❌ IDs aleatórios: {subfilters_with_random_ids}")
    
    print(f"\n👨‍👩‍👧‍👦 SubFilters sem pai: {len(subfilters_without_parent)}")
    if subfilters_without_parent:
        print("   Primeiros 10 sem pai:")
        for i, name in enumerate(subfilters_without_parent[:10]):
            print(f"     📋 {name}")
        if len(subfilters_without_parent) > 10:
            print(f"     ... e mais {len(subfilters_without_parent) - 10}")
    
    # Compare with expected structure
    print(f"\n📊 COMPARAÇÃO COM ESTRUTURA ESPERADA:")
    print(f"   🎯 Esperado: 1.331 itens (7 filters + 1.324 subFilters)")
    print(f"   📋 Atual: {len(all_filters)} filters + {len(all_subfilters)} subFilters = {len(all_filters) + len(all_subfilters)} total")
    
    expected_levels = {0: 7, 1: 80, 2: 599, 3: 497, 4: 114, 5: 34}
    print(f"\n📈 Estrutura esperada vs atual:")
    for level, expected_count in expected_levels.items():
        actual_count = levels.get(level, 0)
        status = "✅" if actual_count == expected_count else "❌"
        print(f"   {status} Nível {level}: {actual_count}/{expected_count}")
    
    # Check for specific issues
    print(f"\n🔍 DIAGNÓSTICO DE PROBLEMAS:")
    
    # Issue 1: Missing subFilters
    total_expected = sum(expected_levels.values())
    total_actual = len(all_filters) + len(all_subfilters)
    missing_count = total_expected - total_actual
    
    if missing_count > 0:
        print(f"   ❌ {missing_count} itens FALTANDO")
    
    # Issue 2: Old filters still exist
    expected_kept_filters = ['Ano', 'Instituição', 'Finalidade']
    unexpected_filters = []
    for name in filters_by_name.keys():
        if not any(kept.lower() in name.lower() for kept in expected_kept_filters):
            if name not in ['Cirurgia', 'Clínica Médica', 'Ginecologia', 'Obstetrícia', 'Pediatria', 'Medicina Preventiva', 'Outros']:
                unexpected_filters.append(name)
    
    if unexpected_filters:
        print(f"   ❌ Filtros inesperados ainda existem: {unexpected_filters}")
    
    # Issue 3: filterId references
    broken_filter_refs = 0
    for doc in all_subfilters:
        data = doc.to_dict()
        filter_id = data.get('filterId')
        if filter_id and filter_id not in [f['id'] for f in filters_by_name.values()]:
            broken_filter_refs += 1
    
    if broken_filter_refs > 0:
        print(f"   ❌ {broken_filter_refs} subFilters com filterId inválido")
    
    # Save analysis for reference
    analysis = {
        'timestamp': firestore.SERVER_TIMESTAMP,
        'total_filters': len(all_filters),
        'total_subfilters': len(all_subfilters),
        'levels': dict(levels),
        'expected_levels': expected_levels,
        'missing_count': missing_count,
        'subfilters_without_parent': len(subfilters_without_parent),
        'custom_ids': subfilters_with_custom_ids,
        'random_ids': subfilters_with_random_ids,
        'broken_filter_refs': broken_filter_refs
    }
    
    with open('firebase_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"\n💾 Análise salva em: firebase_analysis.json")
    
    return analysis

if __name__ == "__main__":
    check_current_status() 