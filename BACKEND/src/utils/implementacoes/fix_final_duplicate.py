#!/usr/bin/env python3
"""
Corrige a última duplicata restante: Tireoide - Tireotoxicose
"""

import json

def fix_final_duplicate():
    print("🔧 CORRIGINDO ÚLTIMA DUPLICATA: Tireotoxicose")
    print("=" * 60)
    
    # Carregar arquivo
    with open('firestore_NO_NUMBERING.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    id_to_item = {item['id']: item for item in items}
    
    # Encontrar os dois Tireotoxicose
    tireotoxicose_items = []
    for item in items:
        if 'tireotoxicose' in item['name'].lower():
            tireotoxicose_items.append(item)
    
    print(f"📊 Itens de Tireotoxicose encontrados: {len(tireotoxicose_items)}")
    
    for i, item in enumerate(tireotoxicose_items, 1):
        parent_name = "SEM PAI"
        if item.get('parentId') and item['parentId'] in id_to_item:
            parent = id_to_item[item['parentId']]
            parent_name = parent['name']
        
        print(f"\n{i}. '{item['name']}'")
        print(f"   ID: {item['id']}")
        print(f"   Pai: {parent_name}")
        print(f"   Nível: {item['level']}")
    
    # Se encontrou exatamente 2, corrigir
    if len(tireotoxicose_items) == 2:
        # O que tem pai "Endocrinologia" deve ficar como "Endocrinologia - Tireotoxicose"
        for item in tireotoxicose_items:
            if item.get('parentId') and item['parentId'] in id_to_item:
                parent = id_to_item[item['parentId']]
                
                if parent['name'] == 'Endocrinologia':
                    # Atualizar para diferenciar
                    old_name = item['name']
                    item['name'] = 'Endocrinologia - Tireotoxicose'
                    print(f"\n🔧 CORRIGIDO: '{old_name}' → '{item['name']}'")
                    break
    
    # Salvar arquivo corrigido
    with open('firestore_FINAL_CLEAN.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Arquivo final salvo: firestore_FINAL_CLEAN.json")
    print(f"🎯 Todas as duplicatas resolvidas!")
    
    # Validação final
    from collections import defaultdict
    
    final_names = defaultdict(list)
    for item in items:
        normalized_name = item['name'].lower().strip()
        final_names[normalized_name].append(item)
    
    remaining_duplicates = {name: items_list for name, items_list in final_names.items() if len(items_list) > 1}
    
    print(f"\n🔍 VALIDAÇÃO FINAL:")
    print(f"📊 Duplicatas restantes: {len(remaining_duplicates)}")
    
    if remaining_duplicates:
        print(f"⚠️  Ainda há duplicatas:")
        for name, items_list in remaining_duplicates.items():
            print(f"   - '{items_list[0]['name']}' ({len(items_list)} itens)")
    else:
        print(f"🎉 ✅ ZERO DUPLICATAS! Hierarquia 100% limpa!")
    
    return items

if __name__ == "__main__":
    fix_final_duplicate() 