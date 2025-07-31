#!/usr/bin/env python3
"""
Resolve definitivamente a duplicata de Tireotoxicose
"""

import json

def fix_tireotoxicose_final():
    print("🔧 RESOLVENDO DEFINITIVAMENTE: Tireotoxicose")
    print("=" * 60)
    
    # Carregar arquivo
    with open('firestore_NO_NUMBERING.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    id_to_item = {item['id']: item for item in items}
    
    # Encontrar todos os itens relacionados a Tireotoxicose
    tireotoxicose_items = []
    for item in items:
        if 'tireotoxicose' in item['name'].lower():
            tireotoxicose_items.append(item)
    
    print(f"📊 Itens relacionados a Tireotoxicose: {len(tireotoxicose_items)}")
    
    for i, item in enumerate(tireotoxicose_items, 1):
        parent_name = "SEM PAI"
        parent_level = -1
        if item.get('parentId') and item['parentId'] in id_to_item:
            parent = id_to_item[item['parentId']]
            parent_name = parent['name']
            parent_level = parent['level']
        
        print(f"\n{i}. '{item['name']}'")
        print(f"   ID: {item['id']}")
        print(f"   Pai: {parent_name} (Nível {parent_level})")
        print(f"   Nível do item: {item['level']}")
    
    # Identificar e renomear os duplicados
    renamed_count = 0
    
    for item in tireotoxicose_items:
        if item['name'] == 'Tireoide - Tireotoxicose':
            # Verificar o pai
            if item.get('parentId') and item['parentId'] in id_to_item:
                parent = id_to_item[item['parentId']]
                
                if parent['name'] == 'Endocrinologia':
                    # Este está mal categorizado, deve ser "Endocrinologia - Tireotoxicose"
                    old_name = item['name']
                    item['name'] = 'Endocrinologia - Tireotoxicose (Geral)'
                    print(f"\n🔧 RENOMEADO: '{old_name}' → '{item['name']}'")
                    print(f"   Razão: Pai é Endocrinologia, não Tireoide")
                    renamed_count += 1
    
    # Se ainda houver duplicatas exatas, adicionar sufixos específicos
    from collections import defaultdict
    
    name_counts = defaultdict(list)
    for item in items:
        name_counts[item['name'].lower()].append(item)
    
    for name_lower, items_with_name in name_counts.items():
        if len(items_with_name) > 1:
            print(f"\n⚠️  Ainda duplicado: '{items_with_name[0]['name']}' ({len(items_with_name)} itens)")
            
            # Renomear com base no contexto específico
            for i, item in enumerate(items_with_name):
                if i > 0:  # Manter o primeiro, renomear os outros
                    parent_name = "SEM PAI"
                    if item.get('parentId') and item['parentId'] in id_to_item:
                        parent = id_to_item[item['parentId']]
                        parent_name = parent['name']
                    
                    old_name = item['name']
                    # Adicionar sufixo baseado no nível ou contexto
                    if 'tireoide' in item['name'].lower():
                        item['name'] = f"{item['name']} (Específica)"
                    else:
                        item['name'] = f"{item['name']} ({i+1})"
                    
                    print(f"🔧 RENOMEADO: '{old_name}' → '{item['name']}'")
                    renamed_count += 1
    
    print(f"\n📊 Total de itens renomeados: {renamed_count}")
    
    # Salvar arquivo final
    with open('firestore_FINAL_CLEAN.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Arquivo salvo: firestore_FINAL_CLEAN.json")
    
    # Validação final
    final_name_counts = defaultdict(int)
    for item in items:
        final_name_counts[item['name'].lower()] += 1
    
    duplicates_final = {name: count for name, count in final_name_counts.items() if count > 1}
    
    print(f"\n🔍 VALIDAÇÃO FINAL:")
    print(f"📊 Duplicatas restantes: {len(duplicates_final)}")
    
    if duplicates_final:
        print(f"⚠️  Ainda há duplicatas:")
        for name, count in duplicates_final.items():
            print(f"   - '{name}' ({count} itens)")
    else:
        print(f"🎉 ✅ ZERO DUPLICATAS! Hierarquia 100% limpa!")
        print(f"🚀 PRONTO PARA FIREBASE!")
    
    return items

if __name__ == "__main__":
    fix_tireotoxicose_final() 