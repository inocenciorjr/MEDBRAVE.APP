#!/usr/bin/env python3
"""
Encontra TODOS os itens que foram renomeados durante o processo de correção de duplicatas
Comparando com arquivos anteriores para identificar todas as alterações
"""

import json
import re

def find_all_renamed_items():
    print("🔍 ENCONTRANDO TODOS OS ITENS RENOMEADOS POR DUPLICATAS")
    print("=" * 80)
    
    # Carregar arquivo final limpo
    with open('firestore_CLEAN.json', 'r', encoding='utf-8') as f:
        final_data = json.load(f)
    
    final_items = final_data['items']
    id_to_final = {item['id']: item for item in final_items}
    
    print(f"📊 Total de itens no arquivo final: {len(final_items)}")
    
    # Encontrar itens com padrões de renomeação
    renamed_items = []
    
    for item in final_items:
        name = item['name']
        
        # Detectar vários padrões de renomeação
        patterns_detected = []
        
        # 1. Padrão (1), (2), etc.
        if re.search(r'\(\d+\)$', name):
            patterns_detected.append("Numeração com parênteses")
        
        # 2. Padrão com hífen e contexto de pai
        if ' - ' in name and len(name.split(' - ')) >= 2:
            parts = name.split(' - ')
            if len(parts) >= 2:
                patterns_detected.append("Contexto do pai adicionado")
        
        # 3. Padrão com #ID no final
        if re.search(r'#[a-f0-9]{4}$', name):
            patterns_detected.append("ID único adicionado")
        
        # 4. Nomes muito longos (provavelmente concatenados)
        if len(name) > 80:
            patterns_detected.append("Nome muito longo (possível concatenação)")
        
        # 5. Múltiplos hífens (indicativo de contexto múltiplo)
        if name.count(' - ') >= 2:
            patterns_detected.append("Múltiplos contextos")
        
        if patterns_detected:
            renamed_items.append({
                'item': item,
                'patterns': patterns_detected
            })
    
    print(f"📊 Itens com padrões de renomeação: {len(renamed_items)}")
    
    if renamed_items:
        # Agrupar por tipo de padrão
        by_pattern = {}
        for renamed in renamed_items:
            for pattern in renamed['patterns']:
                if pattern not in by_pattern:
                    by_pattern[pattern] = []
                by_pattern[pattern].append(renamed['item'])
        
        print(f"\n📋 ANÁLISE POR TIPO DE RENOMEAÇÃO:")
        print(f"=" * 80)
        
        for pattern, items in by_pattern.items():
            print(f"\n🔸 {pattern.upper()} - {len(items)} itens:")
            print(f"-" * 60)
            
            for i, item in enumerate(items[:10], 1):  # Mostrar até 10 por tipo
                # Buscar nome do pai
                parent_name = "SEM PAI"
                if item.get('parentId') and item['parentId'] in id_to_final:
                    parent = id_to_final[item['parentId']]
                    parent_name = parent['name']
                    if len(parent_name) > 40:
                        parent_name = parent_name[:40] + "..."
                
                # Verificar filhos
                children = [child for child in final_items if child.get('parentId') == item['id']]
                
                print(f"\n   {i}. 📝 '{item['name']}'")
                print(f"      🆔 ID: {item['id']}")
                print(f"      📋 Nível: {item['level']}")
                print(f"      👨‍👩‍👧‍👦 Pai: {parent_name}")
                print(f"      👶 Filhos: {len(children)}")
                
                # Tentar extrair nome "original" sem contexto
                original_candidate = item['name']
                if ' - ' in original_candidate:
                    parts = original_candidate.split(' - ')
                    # Pegar a última parte (provavelmente o nome original)
                    original_candidate = parts[-1]
                
                print(f"      🔤 Nome provável original: '{original_candidate}'")
            
            if len(items) > 10:
                print(f"\n      ... e mais {len(items) - 10} itens deste tipo")
    
    # Buscar por duplicatas específicas que podem ter escapado
    print(f"\n🔍 BUSCA POR POSSÍVEIS DUPLICATAS REMANESCENTES:")
    print(f"=" * 80)
    
    # Agrupar por nome para encontrar possíveis duplicatas
    names_count = {}
    for item in final_items:
        name = item['name'].lower().strip()
        if name not in names_count:
            names_count[name] = []
        names_count[name].append(item)
    
    true_duplicates = []
    for name, items in names_count.items():
        if len(items) > 1:
            true_duplicates.extend(items)
    
    if true_duplicates:
        print(f"\n⚠️  AINDA EXISTEM {len(true_duplicates)} DUPLICATAS REAIS:")
        for item in true_duplicates:
            parent_name = "SEM PAI"
            if item.get('parentId') and item['parentId'] in id_to_final:
                parent_name = id_to_final[item['parentId']]['name'][:40]
            
            print(f"   - '{item['name']}' (Pai: {parent_name})")
    else:
        print(f"\n✅ Nenhuma duplicata real encontrada!")
    
    return renamed_items

if __name__ == "__main__":
    find_all_renamed_items() 