#!/usr/bin/env python3
"""
Script para importar hierarquia de 6 níveis com IDs PERSONALIZADOS
IDs baseados na árvore hierárquica: CM_Cardiologia_Arritmias_BloqueioAV
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
import re
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
    Limpa nome para usar em ID:
    - Remove acentos
    - Remove caracteres especiais
    - CamelCase
    - Máximo 30 caracteres
    """
    # Remove acentos
    clean = unidecode(name)
    
    # Remove caracteres especiais e números no início
    clean = re.sub(r'^[0-9\s\-\.]+', '', clean)
    
    # Remove caracteres especiais
    clean = re.sub(r'[^\w\s]', '', clean)
    
    # Split em palavras e capitaliza
    words = clean.split()
    camel_case = ''.join(word.capitalize() for word in words if word)
    
    # Limita tamanho
    if len(camel_case) > 30:
        camel_case = camel_case[:30]
    
    return camel_case

def build_hierarchy_path(item, all_items):
    """
    Constrói o caminho hierárquico completo para um item
    Retorna lista de nomes da raiz até o item
    """
    path = []
    current = item
    
    # Evita loops infinitos
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

def generate_custom_id(hierarchy_path):
    """
    Gera ID personalizado baseado no caminho hierárquico
    Exemplo: CM_Cardiologia_Arritmias_BloqueioAV
    """
    if not hierarchy_path:
        return "UNKNOWN"
    
    # Limpa cada parte do caminho
    clean_parts = []
    for part in hierarchy_path:
        clean_part = clean_name_for_id(part)
        if clean_part:
            clean_parts.append(clean_part)
    
    # Junta com underscore
    custom_id = '_'.join(clean_parts)
    
    # Limita tamanho total
    if len(custom_id) > 100:
        # Mantém primeiro e último, abrevia meio
        if len(clean_parts) > 2:
            custom_id = f"{clean_parts[0]}_{clean_parts[-1]}"
        else:
            custom_id = custom_id[:100]
    
    return custom_id

def import_with_custom_ids():
    db = initialize_firebase()
    
    print("🚀 IMPORTAÇÃO COM IDs PERSONALIZADOS")
    print("=" * 60)
    
    # Load hierarchy data
    try:
        with open('firestore_FINAL_CLEAN.json', 'r', encoding='utf-8') as f:
            json_data = json.load(f)
            # Corrige: JSON está em formato {"items": [...]}
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
    
    # Generate custom IDs for all items
    print(f"\n🔤 Gerando IDs personalizados...")
    
    id_mapping = {}  # original_id -> custom_id
    custom_items = []
    
    for item in hierarchy_data:
        # Build hierarchy path
        hierarchy_path = build_hierarchy_path(item, hierarchy_data)
        
        # Generate custom ID
        custom_id = generate_custom_id(hierarchy_path)
        
        # Handle duplicates
        original_custom_id = custom_id
        counter = 1
        while custom_id in [ci['custom_id'] for ci in custom_items]:
            custom_id = f"{original_custom_id}_{counter}"
            counter += 1
        
        # Store mapping
        id_mapping[item['id']] = custom_id
        
        # Create custom item
        custom_item = item.copy()
        custom_item['custom_id'] = custom_id
        custom_item['hierarchy_path'] = hierarchy_path
        custom_items.append(custom_item)
        
        print(f"   🔤 {' -> '.join(hierarchy_path)} = {custom_id}")
    
    print(f"\n✅ {len(custom_items)} IDs personalizados gerados!")
    
    # Show some examples
    print(f"\n📋 EXEMPLOS DE IDs GERADOS:")
    examples = custom_items[:10]
    for item in examples:
        print(f"   🔤 {item['name']} -> {item['custom_id']}")
    
    # Confirm import
    print(f"\n⚠️  ATENÇÃO: Isso vai importar {len(custom_items)} itens!")
    print(f"💡 Todos com IDs personalizados baseados na hierarquia")
    response = input(f"\n🚀 Confirma IMPORTAÇÃO? (y/N): ")
    
    if response.lower() != 'y':
        print("❌ Operação cancelada")
        return False
    
    print(f"\n🚀 INICIANDO IMPORTAÇÃO...")
    
    # Import by levels (0 to 5)
    imported_count = 0
    batch_size = 500
    
    for level in sorted(levels.keys()):
        level_items = [item for item in custom_items if item.get('level') == level]
        
        if not level_items:
            continue
            
        print(f"\n📂 Importando Nível {level}: {len(level_items)} itens...")
        
        batch = db.batch()
        operations_in_batch = 0
        
        for item in level_items:
            # Prepare document data
            doc_data = {
                'name': item['name'],
                'level': item['level'],
                'isActive': item.get('isActive', True),
                'status': item.get('status', 'ACTIVE'),
                'order': item.get('order', 0),
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            
            # Add parent reference if exists
            if item.get('parentId'):
                # Map to custom parent ID
                custom_parent_id = id_mapping.get(item['parentId'])
                if custom_parent_id:
                    doc_data['parentId'] = custom_parent_id
            
            # Add to appropriate collection
            if level == 0:
                # Root level goes to 'filters'
                doc_ref = db.collection('filters').document(item['custom_id'])
            else:
                # All other levels go to 'subFilters'
                doc_data['filterId'] = id_mapping.get(item.get('filterId', ''))
                doc_ref = db.collection('subFilters').document(item['custom_id'])
            
            batch.set(doc_ref, doc_data)
            operations_in_batch += 1
            imported_count += 1
            
            if operations_in_batch >= batch_size:
                batch.commit()
                print(f"   💾 Batch de {operations_in_batch} itens importados")
                batch = db.batch()
                operations_in_batch = 0
                time.sleep(0.5)
        
        if operations_in_batch > 0:
            batch.commit()
            print(f"   💾 Batch final de {operations_in_batch} itens importados")
    
    print(f"\n🎉 IMPORTAÇÃO CONCLUÍDA!")
    print(f"📊 {imported_count} itens importados com IDs personalizados")
    print(f"✅ Hierarquia de 6 níveis estabelecida")
    print(f"🔤 IDs baseados na árvore hierárquica")
    
    # Save ID mapping for reference
    with open('id_mapping.json', 'w', encoding='utf-8') as f:
        json.dump(id_mapping, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Mapeamento de IDs salvo em: id_mapping.json")
    
    return True

if __name__ == "__main__":
    import_with_custom_ids() 