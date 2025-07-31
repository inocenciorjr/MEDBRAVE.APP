#!/usr/bin/env python3
"""
Importar hierarquia CORRETAMENTE:
- Nível 0 (7 especialidades) → filters
- Níveis 1-5 → subFilters com filterId correto
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
import time
from unidecode import unidecode

def initialize_firebase():
    if firebase_admin._apps:
        firebase_admin.delete_app(firebase_admin.get_app())
    
    cred = credentials.Certificate('../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json')
    firebase_admin.initialize_app(cred)
    return firestore.client()

def clean_name_for_id(name):
    """
    Limpa nome para usar em ID personalizado
    """
    if not name:
        return ""
    
    # Remove acentos
    clean = unidecode(name)
    
    # Remove caracteres especiais, mantém apenas letras, números e espaços
    clean = ''.join(c if c.isalnum() or c.isspace() else '' for c in clean)
    
    # Converte para CamelCase
    words = clean.split()
    if not words:
        return "Unknown"
    
    # Primeira palavra com primeira letra maiúscula, resto minúscula
    # Outras palavras com primeira letra maiúscula
    camel_case = words[0].capitalize()
    for word in words[1:]:
        if word:
            camel_case += word.capitalize()
    
    # Limita tamanho
    if len(camel_case) > 30:
        camel_case = camel_case[:30]
    
    return camel_case or "Unknown"

def build_hierarchy_path(item, all_items):
    """
    Constrói caminho hierárquico completo do item
    """
    path = []
    current = item
    visited = set()
    
    while current and current.get('id') not in visited:
        visited.add(current.get('id'))
        path.insert(0, current['name'])
        
        parent_id = current.get('parentId')
        if not parent_id:
            break
            
        # Encontra o pai
        current = next((i for i in all_items if i['id'] == parent_id), None)
    
    return path

def find_root_filter(item, all_items):
    """
    Encontra o filter raiz (nível 0) para um item
    """
    current = item
    visited = set()
    
    while current and current.get('id') not in visited:
        visited.add(current.get('id'))
        
        # Se chegou no nível 0, este é o filter raiz
        if current.get('level') == 0:
            return current
        
        parent_id = current.get('parentId')
        if not parent_id:
            break
            
        # Encontra o pai
        current = next((i for i in all_items if i['id'] == parent_id), None)
    
    return None

def generate_custom_id(hierarchy_path):
    """
    Gera ID personalizado baseado no caminho hierárquico
    """
    if not hierarchy_path:
        return "UNKNOWN"
    
    clean_parts = []
    for part in hierarchy_path:
        clean_part = clean_name_for_id(part)
        if clean_part:
            clean_parts.append(clean_part)
    
    custom_id = '_'.join(clean_parts)
    
    # Limita tamanho total
    if len(custom_id) > 100:
        if len(clean_parts) > 2:
            custom_id = f"{clean_parts[0]}_{clean_parts[-1]}"
        else:
            custom_id = custom_id[:100]
    
    return custom_id

def import_correct_hierarchy():
    db = initialize_firebase()
    
    print("🚀 IMPORTAÇÃO HIERÁRQUICA CORRETA")
    print("=" * 60)
    
    # Load hierarchy data
    try:
        with open('firestore_FINAL_CLEAN.json', 'r', encoding='utf-8') as f:
            json_data = json.load(f)
            if isinstance(json_data, dict) and 'items' in json_data:
                hierarchy_data = json_data['items']
            else:
                hierarchy_data = json_data
    except FileNotFoundError:
        print("❌ Arquivo firestore_FINAL_CLEAN.json não encontrado!")
        return False
    
    print(f"📊 Carregados {len(hierarchy_data)} itens da hierarquia")
    
    # Separate by levels
    levels = {}
    for item in hierarchy_data:
        level = item.get('level', 0)
        if level not in levels:
            levels[level] = []
        levels[level].append(item)
    
    print(f"📈 Estrutura por níveis:")
    for level in sorted(levels.keys()):
        print(f"   📂 Nível {level}: {len(levels[level])} itens")
    
    # Generate custom IDs
    print(f"\n🔤 Gerando IDs personalizados...")
    
    id_mapping = {}  # original_id -> custom_id
    filter_mapping = {}  # original_id -> custom_filter_id (for level 0 items)
    custom_items = []
    
    for item in hierarchy_data:
        hierarchy_path = build_hierarchy_path(item, hierarchy_data)
        custom_id = generate_custom_id(hierarchy_path)
        
        # Handle duplicates
        original_custom_id = custom_id
        counter = 1
        while custom_id in [ci['custom_id'] for ci in custom_items]:
            custom_id = f"{original_custom_id}_{counter}"
            counter += 1
        
        id_mapping[item['id']] = custom_id
        
        # Se é nível 0, mapeia como filter
        if item.get('level') == 0:
            filter_mapping[item['id']] = custom_id
        
        custom_item = item.copy()
        custom_item['custom_id'] = custom_id
        custom_item['hierarchy_path'] = hierarchy_path
        custom_items.append(custom_item)
    
    print(f"✅ {len(custom_items)} IDs personalizados gerados!")
    print(f"📂 {len(filter_mapping)} filters de nível 0 identificados")
    
    # Show filter examples
    print(f"\n📋 FILTERS (Nível 0):")
    level_0_items = [item for item in custom_items if item.get('level') == 0]
    for item in level_0_items:
        print(f"   🔤 {item['name']} -> {item['custom_id']}")
    
    print(f"\n⚠️  ATENÇÃO: Isso vai importar {len(custom_items)} itens!")
    print(f"📂 {len(level_0_items)} filters + {len(custom_items) - len(level_0_items)} subFilters")
    response = input(f"\n🚀 Confirma IMPORTAÇÃO? (y/N): ")
    
    if response.lower() != 'y':
        print("❌ Operação cancelada")
        return False
    
    print(f"\n🚀 INICIANDO IMPORTAÇÃO...")
    
    # Import level 0 as FILTERS first
    print(f"\n📂 FASE 1: Importando {len(level_0_items)} FILTERS (Nível 0)...")
    
    batch = db.batch()
    operations_in_batch = 0
    
    for item in level_0_items:
        doc_data = {
            'name': item['name'],
            'level': item['level'],
            'isActive': item.get('isActive', True),
            'status': item.get('status', 'ACTIVE'),
            'order': item.get('order', 0),
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        
        doc_ref = db.collection('filters').document(item['custom_id'])
        batch.set(doc_ref, doc_data)
        operations_in_batch += 1
        
        if operations_in_batch >= 500:
            batch.commit()
            print(f"   💾 Batch de {operations_in_batch} filters importados")
            batch = db.batch()
            operations_in_batch = 0
    
    if operations_in_batch > 0:
        batch.commit()
        print(f"   💾 Batch final de {operations_in_batch} filters importados")
    
    print(f"✅ {len(level_0_items)} FILTERS importados!")
    
    # Import levels 1-5 as SUBFILTERS
    subfilter_items = [item for item in custom_items if item.get('level', 0) > 0]
    print(f"\n📂 FASE 2: Importando {len(subfilter_items)} SUBFILTERS (Níveis 1-5)...")
    
    imported_subfilters = 0
    batch = db.batch()
    operations_in_batch = 0
    
    for item in subfilter_items:
        # Find root filter for this subfilter
        root_filter = find_root_filter(item, hierarchy_data)
        
        if not root_filter:
            print(f"   ⚠️  Não foi possível encontrar filter raiz para: {item['name']}")
            continue
        
        root_filter_id = id_mapping[root_filter['id']]
        
        doc_data = {
            'name': item['name'],
            'level': item['level'],
            'filterId': root_filter_id,  # ✅ CORRIGIDO!
            'isActive': item.get('isActive', True),
            'status': item.get('status', 'ACTIVE'),
            'order': item.get('order', 0),
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        
        # Add parent reference if exists
        if item.get('parentId'):
            custom_parent_id = id_mapping.get(item['parentId'])
            if custom_parent_id:
                doc_data['parentId'] = custom_parent_id
        
        doc_ref = db.collection('subFilters').document(item['custom_id'])
        batch.set(doc_ref, doc_data)
        operations_in_batch += 1
        imported_subfilters += 1
        
        if operations_in_batch >= 500:
            batch.commit()
            print(f"   💾 Batch de {operations_in_batch} subFilters importados ({imported_subfilters}/{len(subfilter_items)})")
            batch = db.batch()
            operations_in_batch = 0
            time.sleep(0.5)
    
    if operations_in_batch > 0:
        batch.commit()
        print(f"   💾 Batch final de {operations_in_batch} subFilters importados")
    
    print(f"\n🎉 IMPORTAÇÃO CONCLUÍDA!")
    print(f"📂 {len(level_0_items)} FILTERS importados")
    print(f"📂 {imported_subfilters} SUBFILTERS importados")
    print(f"✅ Todos subFilters associados aos filters corretos!")
    print(f"🔤 IDs baseados na árvore hierárquica")
    
    # Save mappings
    with open('id_mapping.json', 'w', encoding='utf-8') as f:
        json.dump(id_mapping, f, indent=2, ensure_ascii=False)
    
    with open('filter_mapping.json', 'w', encoding='utf-8') as f:
        json.dump(filter_mapping, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Mapeamentos salvos em: id_mapping.json e filter_mapping.json")
    
    return True

if __name__ == "__main__":
    import_correct_hierarchy() 