#!/usr/bin/env python3
"""
Análise Hierárquica Completa dos Subfiltros
Identifica todos os padrões hierárquicos nos dados do merged_filters.json
"""

import json
import re
from collections import defaultdict, Counter

def analyze_hierarchy():
    print("🔍 ANÁLISE HIERÁRQUICA COMPLETA DOS SUBFILTROS")
    print("=" * 60)
    
    # Carregar o JSON
    with open('merged_filters.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Coletar todos os assuntos de todas as especialidades
    all_subjects = []
    for especialidade in data:
        esp_name = especialidade.get('especialidade', '')
        for subesp in especialidade.get('subespecialidades', []):
            subesp_name = subesp.get('nome', '')
            for assunto in subesp.get('assuntos', []):
                all_subjects.append({
                    'especialidade': esp_name,
                    'subespecialidade': subesp_name,
                    'assunto': assunto
                })

    print(f"📊 Total de assuntos encontrados: {len(all_subjects)}")
    print()

    # Analisar padrões hierárquicos
    patterns = {
        'dash_pattern': [],      # Assunto - Subassunto
        'parentheses_pattern': [], # Assunto (Subassunto)
        'colon_pattern': [],     # Assunto: Subassunto
        'ampersand_pattern': [], # Assunto & Subassunto
        'slash_pattern': [],     # Assunto / Subassunto
    }

    for item in all_subjects:
        assunto = item['assunto']
        
        # Padrão com hífen
        if ' - ' in assunto:
            parts = assunto.split(' - ')
            if len(parts) >= 2:
                patterns['dash_pattern'].append({
                    'original': assunto,
                    'parent': parts[0].strip(),
                    'child': ' - '.join(parts[1:]).strip(),
                    'levels': len(parts),
                    'context': f"{item['especialidade']} > {item['subespecialidade']}"
                })
        
        # Padrão com parênteses
        if '(' in assunto and ')' in assunto:
            match = re.match(r'^([^(]+)\s*\(([^)]+)\)(.*)$', assunto)
            if match:
                patterns['parentheses_pattern'].append({
                    'original': assunto,
                    'parent': match.group(1).strip(),
                    'child': match.group(2).strip(),
                    'suffix': match.group(3).strip(),
                    'context': f"{item['especialidade']} > {item['subespecialidade']}"
                })
        
        # Padrão com dois pontos
        if ': ' in assunto:
            parts = assunto.split(': ', 1)
            if len(parts) == 2:
                patterns['colon_pattern'].append({
                    'original': assunto,
                    'parent': parts[0].strip(),
                    'child': parts[1].strip(),
                    'context': f"{item['especialidade']} > {item['subespecialidade']}"
                })
        
        # Padrão com &
        if ' & ' in assunto:
            patterns['ampersand_pattern'].append(assunto)
        
        # Padrão com /
        if ' / ' in assunto:
            patterns['slash_pattern'].append(assunto)

    print("🎯 PADRÕES HIERÁRQUICOS ENCONTRADOS:")
    print(f"- Hífen (-): {len(patterns['dash_pattern'])} itens")
    print(f"- Parênteses: {len(patterns['parentheses_pattern'])} itens")
    print(f"- Dois pontos: {len(patterns['colon_pattern'])} itens")
    print(f"- Ampersand (&): {len(patterns['ampersand_pattern'])} itens")
    print(f"- Barra (/): {len(patterns['slash_pattern'])} itens")
    print()

    # Analisar níveis do padrão hífen (mais comum)
    if patterns['dash_pattern']:
        print("📈 ANÁLISE DO PADRÃO HÍFEN (mais comum):")
        level_counts = defaultdict(int)
        parent_groups = defaultdict(list)

        for item in patterns['dash_pattern']:
            level_counts[item['levels']] += 1
            parent_groups[item['parent']].append(item)

        print("Níveis encontrados:")
        for level in sorted(level_counts.keys()):
            print(f"- {level} níveis: {level_counts[level]} itens")
        print()

        print("🏆 Pais com mais filhos (top 15):")
        sorted_parents = sorted(parent_groups.items(), key=lambda x: len(x[1]), reverse=True)
        for i, (parent, children) in enumerate(sorted_parents[:15], 1):
            print(f"{i:2}. {parent}: {len(children)} filhos")
            
            # Mostrar exemplos dos filhos
            if len(children) <= 3:
                for child in children:
                    print(f"    ├─ {child['child']}")
            else:
                for child in children[:2]:
                    print(f"    ├─ {child['child']}")
                print(f"    └─ ... e mais {len(children)-2} itens")
            print()

    # Analisar padrão de parênteses
    if patterns['parentheses_pattern']:
        print("🔗 ANÁLISE DO PADRÃO PARÊNTESES:")
        parent_groups_paren = defaultdict(list)
        for item in patterns['parentheses_pattern']:
            parent_groups_paren[item['parent']].append(item)
        
        print("Top 10 pais com parênteses:")
        sorted_paren = sorted(parent_groups_paren.items(), key=lambda x: len(x[1]), reverse=True)
        for i, (parent, children) in enumerate(sorted_paren[:10], 1):
            print(f"{i:2}. {parent}: {len(children)} variações")
            for child in children[:2]:
                print(f"    ├─ ({child['child']})")
            if len(children) > 2:
                print(f"    └─ ... e mais {len(children)-2}")
            print()

    # Analisar padrão de dois pontos
    if patterns['colon_pattern']:
        print("🎯 ANÁLISE DO PADRÃO DOIS PONTOS:")
        parent_groups_colon = defaultdict(list)
        for item in patterns['colon_pattern']:
            parent_groups_colon[item['parent']].append(item)
        
        print("Top 10 pais com dois pontos:")
        sorted_colon = sorted(parent_groups_colon.items(), key=lambda x: len(x[1]), reverse=True)
        for i, (parent, children) in enumerate(sorted_colon[:10], 1):
            print(f"{i:2}. {parent}: {len(children)} filhos")
            for child in children[:2]:
                print(f"    ├─ {child['child']}")
            if len(children) > 2:
                print(f"    └─ ... e mais {len(children)-2}")
            print()

    # Detectar hierarquias múltiplas (níveis aninhados)
    print("🏗️ DETECTANDO HIERARQUIAS MÚLTIPLAS:")
    nested_hierarchies = []
    
    for item in patterns['dash_pattern']:
        # Verificar se o "child" também pode ser pai de outros
        child_as_parent = item['child'].split(' - ')[0].strip()
        
        # Procurar outros itens que têm este como pai
        children_of_child = []
        for other_item in patterns['dash_pattern']:
            if other_item['parent'] == child_as_parent and other_item != item:
                children_of_child.append(other_item)
        
        if children_of_child:
            nested_hierarchies.append({
                'grandparent': item['parent'],
                'parent': child_as_parent,
                'children': children_of_child
            })

    if nested_hierarchies:
        print(f"Encontradas {len(nested_hierarchies)} hierarquias de 3+ níveis:")
        for hierarchy in nested_hierarchies[:10]:  # Top 10
            print(f"📂 {hierarchy['grandparent']}")
            print(f"  └─ {hierarchy['parent']}")
            for child in hierarchy['children'][:3]:
                print(f"     └─ {child['child']}")
            if len(hierarchy['children']) > 3:
                print(f"     └─ ... e mais {len(hierarchy['children'])-3}")
            print()
    else:
        print("Nenhuma hierarquia de 3+ níveis detectada com certeza.")

    print("=" * 60)
    print("✅ Análise concluída!")
    
    return patterns

if __name__ == "__main__":
    patterns = analyze_hierarchy() 