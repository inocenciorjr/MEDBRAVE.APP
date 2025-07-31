#!/usr/bin/env python3
"""
Verifica como as duplicatas foram resolvidas
Mostra qual item foi mantido e qual foi renomeado
"""

import json

def check_duplicate_resolution():
    print("🔍 VERIFICANDO RESOLUÇÃO DE DUPLICATAS")
    print("=" * 60)
    
    # Carregar arquivo original (antes da limpeza)
    with open('firestore_final_ready.json', 'r', encoding='utf-8') as f:
        original_data = json.load(f)
    
    # Carregar arquivo final (após limpeza)
    with open('firestore_FINAL.json', 'r', encoding='utf-8') as f:
        final_data = json.load(f)
    
    original_items = original_data['items']
    final_items = final_data['items']
    
    # Criar mapa por ID para comparar
    original_by_id = {item['id']: item for item in original_items}
    final_by_id = {item['id']: item for item in final_items}
    
    # Encontrar itens que tiveram nomes alterados
    changed_items = []
    
    for item_id, original_item in original_by_id.items():
        if item_id in final_by_id:
            final_item = final_by_id[item_id]
            
            if original_item['name'] != final_item['name']:
                changed_items.append({
                    'id': item_id,
                    'original_name': original_item['name'],
                    'final_name': final_item['name'],
                    'level': original_item['level'],
                    'parent_id': original_item.get('parentId')
                })
    
    print(f"📊 Itens com nomes alterados: {len(changed_items)}")
    
    if changed_items:
        print(f"\n🔧 ALTERAÇÕES REALIZADAS:")
        
        for item in changed_items:
            # Buscar contexto do pai
            parent_name = "Sem pai"
            if item['parent_id'] and item['parent_id'] in original_by_id:
                parent_name = original_by_id[item['parent_id']]['name']
            
            print(f"\n   📋 Nível {item['level']} - Pai: {parent_name}")
            print(f"      ❌ Original: '{item['original_name']}'")
            print(f"      ✅ Final: '{item['final_name']}'")
    
    # Verificar especificamente o caso de "Segurança das crianças e adolescentes"
    print(f"\n🎯 CASO ESPECÍFICO: 'Segurança das crianças e adolescentes'")
    
    security_items_original = []
    security_items_final = []
    
    for item in original_items:
        if 'segurança das crianças' in item['name'].lower():
            security_items_original.append(item)
    
    for item in final_items:
        if 'segurança das crianças' in item['name'].lower():
            security_items_final.append(item)
    
    print(f"\n📊 Itens encontrados:")
    print(f"   Original: {len(security_items_original)} itens")
    print(f"   Final: {len(security_items_final)} itens")
    
    print(f"\n📋 DETALHES DOS ITENS:")
    
    for i, item in enumerate(security_items_final):
        parent_name = "Sem pai"
        if item.get('parentId') and item['parentId'] in final_by_id:
            parent_name = final_by_id[item['parentId']]['name']
        
        print(f"\n   Item {i+1}:")
        print(f"      ID: {item['id']}")
        print(f"      Nome: '{item['name']}'")
        print(f"      Nível: {item['level']}")
        print(f"      Pai: {parent_name}")
    
    return changed_items

if __name__ == "__main__":
    check_duplicate_resolution() 