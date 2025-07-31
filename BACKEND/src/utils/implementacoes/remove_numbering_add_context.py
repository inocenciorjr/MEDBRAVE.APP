#!/usr/bin/env python3
"""
Remove numerações e usa apenas contexto do pai para diferenciar duplicatas
Mantém ambos os filtros necessários mas sem numeração
"""

import json
import re
from collections import defaultdict

def remove_numbering_add_context():
    print("🔧 REMOVENDO NUMERAÇÕES E ADICIONANDO CONTEXTO DO PAI")
    print("=" * 80)
    
    # Carregar arquivo
    with open('firestore_CLEAN.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    id_to_item = {item['id']: item for item in items}
    
    print(f"📊 Total de itens: {len(items)}")
    
    # Encontrar duplicatas por nome (case-insensitive)
    name_groups = defaultdict(list)
    for item in items:
        normalized_name = item['name'].lower().strip()
        name_groups[normalized_name].append(item)
    
    duplicate_groups = {name: items_list for name, items_list in name_groups.items() if len(items_list) > 1}
    
    print(f"📊 Grupos com duplicatas: {len(duplicate_groups)}")
    
    # Processar cada grupo de duplicatas
    items_updated = []
    
    for item in items:
        normalized_name = item['name'].lower().strip()
        
        # Se é duplicata, aplicar lógica especial
        if normalized_name in duplicate_groups:
            duplicate_items = duplicate_groups[normalized_name]
            
            # Se há múltiplos itens com mesmo nome
            if len(duplicate_items) > 1:
                # Buscar nome do pai
                parent_context = ""
                if item.get('parentId') and item['parentId'] in id_to_item:
                    parent = id_to_item[item['parentId']]
                    parent_context = parent['name']
                
                # Remover numerações existentes do nome original
                clean_name = item['name']
                
                # Remove padrões de numeração
                clean_name = re.sub(r'\s*\(\d+\)$', '', clean_name)  # Remove (1), (2), etc.
                clean_name = re.sub(r'\s*\d+$', '', clean_name)      # Remove 1, 2, etc.
                clean_name = re.sub(r'\s*-\s*\d+$', '', clean_name)  # Remove - 1, - 2, etc.
                
                # Verificar se precisa de contexto do pai
                needs_context = False
                
                # Contar quantos itens com mesmo nome limpo existem no mesmo nível
                same_clean_name_count = 0
                for other_item in duplicate_items:
                    other_clean_name = other_item['name']
                    other_clean_name = re.sub(r'\s*\(\d+\)$', '', other_clean_name)
                    other_clean_name = re.sub(r'\s*\d+$', '', other_clean_name)
                    other_clean_name = re.sub(r'\s*-\s*\d+$', '', other_clean_name)
                    
                    if other_clean_name.lower().strip() == clean_name.lower().strip():
                        same_clean_name_count += 1
                
                # Se há múltiplos com mesmo nome limpo, adicionar contexto
                if same_clean_name_count > 1 and parent_context:
                    # Verificar se já tem contexto do pai
                    if not clean_name.startswith(parent_context + " - "):
                        new_name = f"{parent_context} - {clean_name}"
                    else:
                        new_name = clean_name
                else:
                    new_name = clean_name
                
                # Atualizar item
                updated_item = item.copy()
                updated_item['name'] = new_name
                items_updated.append(updated_item)
                
                print(f"🔧 '{item['name']}' → '{new_name}'")
            else:
                # Item único, apenas limpar numeração se houver
                clean_name = item['name']
                clean_name = re.sub(r'\s*\(\d+\)$', '', clean_name)
                clean_name = re.sub(r'\s*\d+$', '', clean_name)
                clean_name = re.sub(r'\s*-\s*\d+$', '', clean_name)
                
                updated_item = item.copy()
                updated_item['name'] = clean_name
                items_updated.append(updated_item)
                
                if clean_name != item['name']:
                    print(f"🧹 '{item['name']}' → '{clean_name}'")
        else:
            # Item único, apenas limpar numeração se houver
            clean_name = item['name']
            original_name = clean_name
            
            clean_name = re.sub(r'\s*\(\d+\)$', '', clean_name)
            clean_name = re.sub(r'\s*\d+$', '', clean_name)
            clean_name = re.sub(r'\s*-\s*\d+$', '', clean_name)
            
            updated_item = item.copy()
            updated_item['name'] = clean_name
            items_updated.append(updated_item)
            
            if clean_name != original_name:
                print(f"🧹 '{original_name}' → '{clean_name}'")
    
    # Verificar se ainda há duplicatas após o processamento
    print(f"\n🔍 VERIFICANDO DUPLICATAS APÓS PROCESSAMENTO:")
    
    final_names = defaultdict(list)
    for item in items_updated:
        normalized_name = item['name'].lower().strip()
        final_names[normalized_name].append(item)
    
    remaining_duplicates = {name: items_list for name, items_list in final_names.items() if len(items_list) > 1}
    
    print(f"📊 Duplicatas restantes: {len(remaining_duplicates)} grupos")
    
    if remaining_duplicates:
        print(f"\n⚠️  DUPLICATAS QUE AINDA EXISTEM:")
        for name, items_list in remaining_duplicates.items():
            print(f"   - '{items_list[0]['name']}' ({len(items_list)} itens)")
            for item in items_list:
                parent_name = "SEM PAI"
                if item.get('parentId') and item['parentId'] in id_to_item:
                    parent_name = id_to_item[item['parentId']]['name'][:40]
                print(f"     - ID: {item['id']} - Pai: {parent_name}")
    else:
        print(f"✅ Nenhuma duplicata restante!")
    
    # Atualizar dados
    data['items'] = items_updated
    
    # Salvar arquivo sem numerações
    with open('firestore_NO_NUMBERING.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Arquivo salvo: firestore_NO_NUMBERING.json")
    print(f"📊 Total de itens: {len(items_updated)}")
    print(f"🎯 Numerações removidas, contexto do pai adicionado onde necessário")
    
    return items_updated

if __name__ == "__main__":
    remove_numbering_add_context() 