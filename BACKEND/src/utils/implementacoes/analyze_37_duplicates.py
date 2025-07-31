#!/usr/bin/env python3
"""
Analisa detalhadamente as 37 duplicatas reais encontradas
Sugere qual manter/remover para cada par de duplicatas
"""

import json
from collections import defaultdict

def analyze_37_duplicates():
    print("🔍 ANÁLISE DETALHADA DAS 37 DUPLICATAS REAIS")
    print("=" * 80)
    
    # Carregar arquivo
    with open('firestore_CLEAN.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    id_to_item = {item['id']: item for item in items}
    
    # Agrupar por nome (case-insensitive) para encontrar duplicatas
    name_groups = defaultdict(list)
    for item in items:
        normalized_name = item['name'].lower().strip()
        name_groups[normalized_name].append(item)
    
    # Filtrar apenas grupos com duplicatas
    duplicate_groups = {name: items_list for name, items_list in name_groups.items() if len(items_list) > 1}
    
    print(f"📊 Grupos de duplicatas encontrados: {len(duplicate_groups)}")
    print(f"📊 Total de itens duplicados: {sum(len(items_list) for items_list in duplicate_groups.values())}")
    
    # Analisar cada grupo de duplicatas
    recommendations = []
    
    for i, (normalized_name, duplicate_items) in enumerate(duplicate_groups.items(), 1):
        print(f"\n" + "="*80)
        print(f"🔍 DUPLICATA {i}/{len(duplicate_groups)}")
        print(f"📝 Nome: '{duplicate_items[0]['name']}' ({len(duplicate_items)} itens)")
        print("="*80)
        
        # Analisar cada item do grupo
        for j, item in enumerate(duplicate_items, 1):
            # Buscar pai
            parent_name = "SEM PAI"
            parent_level = -1
            if item.get('parentId') and item['parentId'] in id_to_item:
                parent = id_to_item[item['parentId']]
                parent_name = parent['name']
                parent_level = parent['level']
            
            # Buscar filhos
            children = [child for child in items if child.get('parentId') == item['id']]
            
            print(f"\n   📋 ITEM {j}:")
            print(f"      🆔 ID: {item['id']}")
            print(f"      📝 Nome exato: '{item['name']}'")
            print(f"      📊 Nível: {item['level']}")
            print(f"      👨‍👩‍👧‍👦 Pai: {parent_name} (Nível {parent_level})")
            print(f"      👶 Filhos: {len(children)}")
            print(f"      🔖 Fonte: {item.get('source', 'N/A')}")
            
            if children:
                print(f"      📋 Alguns filhos:")
                for child in children[:3]:
                    print(f"         - {child['name']}")
                if len(children) > 3:
                    print(f"         ... e mais {len(children) - 3} filhos")
        
        # CRITÉRIOS DE DECISÃO
        print(f"\n   🤖 ANÁLISE AUTOMÁTICA:")
        
        # Critério 1: Diferenças de capitalização
        exact_names = [item['name'] for item in duplicate_items]
        if len(set(exact_names)) > 1:
            print(f"      ⚠️  Diferenças de capitalização detectadas:")
            for name in set(exact_names):
                count = exact_names.count(name)
                print(f"         - '{name}' ({count}x)")
        
        # Critério 2: Diferenças de pai
        parent_info = []
        for item in duplicate_items:
            if item.get('parentId') and item['parentId'] in id_to_item:
                parent = id_to_item[item['parentId']]
                parent_info.append((parent['name'], parent['level']))
            else:
                parent_info.append(("SEM PAI", -1))
        
        unique_parents = list(set(parent_info))
        if len(unique_parents) > 1:
            print(f"      ⚠️  Diferentes pais detectados:")
            for parent_name, parent_level in unique_parents:
                count = parent_info.count((parent_name, parent_level))
                print(f"         - '{parent_name}' (Nível {parent_level}) - {count} item(s)")
        
        # Critério 3: Diferenças de filhos
        children_counts = []
        for item in duplicate_items:
            children = [child for child in items if child.get('parentId') == item['id']]
            children_counts.append(len(children))
        
        if len(set(children_counts)) > 1:
            print(f"      ⚠️  Diferentes quantidades de filhos:")
            for i, count in enumerate(children_counts, 1):
                print(f"         - Item {i}: {count} filhos")
        
        # RECOMENDAÇÃO
        print(f"\n   💡 RECOMENDAÇÃO:")
        
        # Decidir baseado em critérios
        keep_item = None
        remove_items = []
        reason = ""
        
        # Regra 1: Manter o que tem mais filhos
        max_children = max(children_counts)
        items_with_max_children = [item for i, item in enumerate(duplicate_items) if children_counts[i] == max_children]
        
        if len(items_with_max_children) == 1 and max_children > 0:
            keep_item = items_with_max_children[0]
            remove_items = [item for item in duplicate_items if item != keep_item]
            reason = f"Manter o que tem mais filhos ({max_children})"
        
        # Regra 2: Se empate em filhos, manter o que tem pai mais específico (nível mais alto)
        elif not keep_item:
            parent_levels = []
            for item in duplicate_items:
                if item.get('parentId') and item['parentId'] in id_to_item:
                    parent = id_to_item[item['parentId']]
                    parent_levels.append(parent['level'])
                else:
                    parent_levels.append(-1)
            
            max_parent_level = max(parent_levels)
            items_with_best_parent = [item for i, item in enumerate(duplicate_items) if parent_levels[i] == max_parent_level]
            
            if len(items_with_best_parent) == 1:
                keep_item = items_with_best_parent[0]
                remove_items = [item for item in duplicate_items if item != keep_item]
                reason = f"Manter o que tem pai mais específico (nível {max_parent_level})"
        
        # Regra 3: Se ainda empate, manter o primeiro alfabeticamente (mais consistente)
        if not keep_item:
            # Ordenar por nome exato (capitalização importa para consistência)
            sorted_items = sorted(duplicate_items, key=lambda x: x['name'])
            keep_item = sorted_items[0]
            remove_items = sorted_items[1:]
            reason = "Manter o primeiro alfabeticamente (por consistência)"
        
        # Mostrar recomendação
        if keep_item:
            print(f"      ✅ MANTER: '{keep_item['name']}'")
            print(f"         ID: {keep_item['id']}")
            print(f"         Razão: {reason}")
            
            print(f"      ❌ REMOVER:")
            for item in remove_items:
                print(f"         - '{item['name']}' (ID: {item['id']})")
            
            recommendations.append({
                'group_name': normalized_name,
                'keep': keep_item,
                'remove': remove_items,
                'reason': reason
            })
        else:
            print(f"      ⚠️  DECISÃO MANUAL NECESSÁRIA")
    
    # RESUMO FINAL
    print(f"\n" + "="*80)
    print(f"📊 RESUMO DAS RECOMENDAÇÕES")
    print(f"="*80)
    
    total_to_remove = sum(len(rec['remove']) for rec in recommendations)
    print(f"📋 Total de grupos analisados: {len(recommendations)}")
    print(f"📋 Total de itens a manter: {len(recommendations)}")
    print(f"📋 Total de itens a remover: {total_to_remove}")
    print(f"📋 Redução: {len(items)} → {len(items) - total_to_remove} itens")
    
    print(f"\n🔍 LISTA DE REMOÇÕES RECOMENDADAS:")
    for i, rec in enumerate(recommendations, 1):
        print(f"\n{i}. Grupo: '{rec['group_name']}'")
        print(f"   ✅ Manter: '{rec['keep']['name']}' (ID: {rec['keep']['id']})")
        for item in rec['remove']:
            print(f"   ❌ Remover: '{item['name']}' (ID: {item['id']})")
        print(f"   💡 Razão: {rec['reason']}")
    
    return recommendations

if __name__ == "__main__":
    analyze_37_duplicates() 