#!/usr/bin/env python3
"""
Lista TODOS os subfiltros que foram numerados por duplicatas
Para análise manual do usuário
"""

import json
import re

def list_all_numbered_items():
    print("📋 LISTANDO TODOS OS ITENS NUMERADOS POR DUPLICATAS")
    print("=" * 70)
    
    # Carregar arquivo final limpo
    with open('firestore_CLEAN.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    id_to_item = {item['id']: item for item in items}
    
    # Encontrar todos os itens numerados
    numbered_items = []
    
    # Padrões para detectar numeração
    patterns = [
        r'\s+\(\d+\)$',  # " (1)", " (2)", etc. no final
        r'\s+\d+$',      # " 1", " 2", etc. no final
        r'\s+-\s+\d+$',  # " - 1", " - 2", etc. no final
    ]
    
    for item in items:
        name = item['name']
        
        # Verificar se o nome termina com numeração
        is_numbered = False
        for pattern in patterns:
            if re.search(pattern, name):
                is_numbered = True
                break
        
        if is_numbered:
            numbered_items.append(item)
    
    print(f"📊 TOTAL DE ITENS NUMERADOS ENCONTRADOS: {len(numbered_items)}")
    
    if numbered_items:
        print(f"\n🔍 LISTA DETALHADA PARA ANÁLISE MANUAL:")
        print(f"=" * 70)
        
        # Agrupar por nível para melhor organização
        by_level = {}
        for item in numbered_items:
            level = item['level']
            if level not in by_level:
                by_level[level] = []
            by_level[level].append(item)
        
        for level in sorted(by_level.keys()):
            items_in_level = by_level[level]
            
            print(f"\n📋 NÍVEL {level} - {len(items_in_level)} itens numerados:")
            print(f"-" * 50)
            
            for i, item in enumerate(items_in_level, 1):
                # Buscar nome do pai
                parent_name = "SEM PAI"
                if item.get('parentId') and item['parentId'] in id_to_item:
                    parent = id_to_item[item['parentId']]
                    parent_name = parent['name']
                    # Simplificar nome do pai se muito longo
                    if len(parent_name) > 40:
                        parent_name = parent_name[:40] + "..."
                
                # Verificar se tem filhos
                children = [child for child in items if child.get('parentId') == item['id']]
                children_count = len(children)
                
                print(f"\n   {i}. ITEM NUMERADO:")
                print(f"      📝 Nome: '{item['name']}'")
                print(f"      🆔 ID: {item['id']}")
                print(f"      👨‍👩‍👧‍👦 Pai: {parent_name}")
                print(f"      👶 Filhos: {children_count}")
                
                if children_count > 0:
                    print(f"      📋 Alguns filhos:")
                    for j, child in enumerate(children[:3]):  # Mostrar até 3 filhos
                        print(f"         - {child['name']}")
                    if children_count > 3:
                        print(f"         ... e mais {children_count - 3} filhos")
        
        # Buscar possíveis duplicatas relacionadas
        print(f"\n🔍 ANÁLISE DE POSSÍVEIS ORIGINAIS:")
        print(f"=" * 70)
        
        for item in numbered_items:
            original_name = re.sub(r'\s+\(\d+\)$', '', item['name'])  # Remove (1), (2), etc.
            original_name = re.sub(r'\s+\d+$', '', original_name)      # Remove 1, 2, etc.
            original_name = re.sub(r'\s+-\s+\d+$', '', original_name)  # Remove - 1, - 2, etc.
            
            # Buscar item com nome original (sem numeração)
            possible_original = None
            for other_item in items:
                if (other_item['id'] != item['id'] and 
                    other_item['level'] == item['level'] and
                    other_item['name'] == original_name):
                    possible_original = other_item
                    break
            
            if possible_original:
                print(f"\n🔗 PAR DE DUPLICATAS ENCONTRADO:")
                print(f"   ✅ Original: '{possible_original['name']}'")
                print(f"      ID: {possible_original['id']}")
                print(f"      Filhos: {len([c for c in items if c.get('parentId') == possible_original['id']])}")
                
                print(f"   🔢 Numerado: '{item['name']}'")
                print(f"      ID: {item['id']}")
                print(f"      Filhos: {len([c for c in items if c.get('parentId') == item['id']])}")
                
                print(f"   💡 RECOMENDAÇÃO: Verifique se ambos são necessários ou se pode excluir um")
    
    else:
        print(f"\n✅ Nenhum item numerado encontrado!")
        print(f"🎉 Todos os nomes são únicos!")
    
    return numbered_items

if __name__ == "__main__":
    list_all_numbered_items() 