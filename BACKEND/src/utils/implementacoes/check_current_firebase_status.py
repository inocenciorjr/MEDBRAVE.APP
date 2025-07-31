#!/usr/bin/env python3
"""
Script para verificar status atual do Firebase e preparar reorganização
Agora usando as credenciais corretas
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
import sys
from collections import defaultdict

def initialize_firebase():
    """Initialize Firebase Admin SDK with correct credentials."""
    
    # Usar o mesmo arquivo de credenciais do fix_hierarchy_firebase.py
    cred_file = '../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json'
    
    try:
        # Se já foi inicializado, limpar primeiro
        if firebase_admin._apps:
            firebase_admin.delete_app(firebase_admin.get_app())
        
        cred = credentials.Certificate(cred_file)
        firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        print("✅ Firebase conectado com sucesso!")
        return db
        
    except Exception as e:
        print(f"❌ Erro ao conectar Firebase: {e}")
        return None

def analyze_current_firebase_structure(db):
    """Analyze current Firebase structure."""
    print("\n🔍 ANALISANDO ESTRUTURA ATUAL DO FIREBASE")
    print("=" * 60)
    
    # 1. Analisar collection 'filters'
    print("\n📂 COLLECTION: filters")
    filters_ref = db.collection('filters')
    filters = list(filters_ref.stream())
    
    print(f"   📊 Total de filters: {len(filters)}")
    
    filter_data = {}
    for filter_doc in filters:
        data = filter_doc.to_dict()
        filter_data[filter_doc.id] = data
        print(f"   📄 {filter_doc.id}: {data.get('name', 'N/A')}")
    
    # 2. Analisar collection 'subFilters'
    print(f"\n📂 COLLECTION: subFilters")
    subfilters_ref = db.collection('subFilters')
    subfilters = list(subfilters_ref.stream())
    
    print(f"   📊 Total de subFilters: {len(subfilters)}")
    
    # Analisar estrutura hierárquica
    hierarchy_analysis = defaultdict(int)
    parent_count = {'with_parent': 0, 'without_parent': 0}
    
    subfilter_data = {}
    processed_ids = set()  # Para evitar duplicação
    
    for subfilter_doc in subfilters:
        doc_id = subfilter_doc.id
        
        # Evitar processar o mesmo documento múltiplas vezes
        if doc_id in processed_ids:
            continue
            
        processed_ids.add(doc_id)
        data = subfilter_doc.to_dict()
        subfilter_data[doc_id] = data
        
        filter_id = data.get('filterId', 'UNKNOWN')
        parent_id = data.get('parentId')
        
        hierarchy_analysis[filter_id] += 1
        
        if parent_id:
            parent_count['with_parent'] += 1
        else:
            parent_count['without_parent'] += 1
    
    print(f"\n📊 ANÁLISE HIERÁRQUICA:")
    print(f"   🔗 SubFilters com parent: {parent_count['with_parent']}")
    print(f"   🔗 SubFilters sem parent: {parent_count['without_parent']}")
    
    print(f"\n📊 DISTRIBUIÇÃO POR FILTER:")
    total_count = 0
    for filter_id, count in hierarchy_analysis.items():
        # Buscar nome do filter
        if filter_id in filter_data:
            filter_name = filter_data[filter_id].get('name', 'N/A')
        else:
            filter_name = 'UNKNOWN FILTER'
        
        print(f"   📋 {filter_name} ({filter_id}): {count} subfilters")
        total_count += count
    
    print(f"\n✅ VERIFICAÇÃO: Total contado = {total_count} (deve ser igual a {len(subfilters)})")
    
    if total_count != len(subfilters):
        print(f"⚠️  ATENÇÃO: Há discrepância nos números!")
    
    return filter_data, subfilter_data

def load_new_hierarchy():
    """Load the new 6-level hierarchy from JSON."""
    json_file = 'firestore_FINAL_CLEAN.json'
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
        
        # O arquivo tem formato {"items": [...]}
        data = json_data.get('items', [])
        
        print(f"\n✅ Hierarquia nova carregada: {len(data)} items")
        
        # Análise da hierarquia nova
        levels = defaultdict(int)
        especialidades = set()
        
        for item in data:
            level = item.get('level', 0)
            levels[level] += 1
            
            if level == 0:
                especialidades.add(item.get('name', ''))
        
        print(f"\n📊 NOVA HIERARQUIA (6 NÍVEIS):")
        for level in sorted(levels.keys()):
            print(f"   📋 Level {level}: {levels[level]} items")
        
        print(f"\n🏥 ESPECIALIDADES ENCONTRADAS:")
        for esp in sorted(especialidades):
            print(f"   📋 {esp}")
        
        return data
        
    except Exception as e:
        print(f"❌ Erro ao carregar hierarquia nova: {e}")
        return None

def compare_hierarchies(firebase_data, new_hierarchy):
    """Compare current Firebase data with new hierarchy."""
    print(f"\n🔄 COMPARANDO HIERARQUIAS")
    print("=" * 60)
    
    # TODO: Implementar comparação detalhada
    print("⚠️  Comparação detalhada será implementada")
    
    return True

def main():
    print("🔧 VERIFICAÇÃO DO STATUS ATUAL DO FIREBASE")
    print("=" * 60)
    
    # 1. Conectar ao Firebase
    db = initialize_firebase()
    if not db:
        print("❌ Falha na conexão - abortando")
        return False
    
    # 2. Analisar estrutura atual
    filter_data, subfilter_data = analyze_current_firebase_structure(db)
    
    # 3. Carregar nova hierarquia
    new_hierarchy = load_new_hierarchy()
    if not new_hierarchy:
        print("❌ Falha ao carregar nova hierarquia - abortando")
        return False
    
    # 4. Comparar hierarquias
    compare_hierarchies((filter_data, subfilter_data), new_hierarchy)
    
    print(f"\n✅ VERIFICAÇÃO CONCLUÍDA!")
    print(f"💡 Próximo passo: executar reorganize_existing_firebase_filters.py")
    
    return True

if __name__ == "__main__":
    main() 