#!/usr/bin/env python3
"""
Analisa profundamente a estrutura hierárquica do HTML para entender
como os 6 níveis se relacionam entre si
"""

import json

def analyze_html_structure():
    print("🔍 ANÁLISE PROFUNDA DA ESTRUTURA HTML")
    print("=" * 60)
    
    # Carregar hierarquia HTML
    with open('html_hierarchy_complete.json', 'r', encoding='utf-8') as f:
        html_hierarchy = json.load(f)
    
    # Analisar cada nível e suas relações
    for level_str in sorted(html_hierarchy.keys(), key=int):
        level_num = int(level_str)
        items = html_hierarchy[level_str]
        
        print(f"\n📊 NÍVEL {level_num} ({len(items)} itens):")
        print(f"   Padding base: {items[0].get('padding', 0)}px")
        
        # Mostrar primeiros 5 itens como exemplo
        for i, item in enumerate(items[:5]):
            text = item.get('text', '')
            padding = item.get('padding', 0)
            print(f"   {i+1}. '{text}' (padding: {padding}px)")
        
        if len(items) > 5:
            print(f"   ... e mais {len(items) - 5} itens")
        
        # Analisar padrões nos nomes para identificar hierarquia
        if level_num > 0:
            print(f"   📋 Análise de padrões:")
            
            # Contar itens que contêm hífen (possível pai-filho)
            with_hyphen = [item for item in items if ' - ' in item.get('text', '')]
            print(f"   - Com hífen: {len(with_hyphen)} itens")
            
            # Contar itens que podem ser pais
            potential_parents = []
            for item in items:
                text = item.get('text', '')
                # Procurar se este item é pai de outros no mesmo nível
                children = [i for i in items if i.get('text', '').startswith(text + ' - ')]
                if children:
                    potential_parents.append((text, len(children)))
            
            print(f"   - Pais potenciais: {len(potential_parents)}")
            if potential_parents:
                for parent, child_count in potential_parents[:3]:
                    print(f"     '{parent}' -> {child_count} filhos")
                if len(potential_parents) > 3:
                    print(f"     ... e mais {len(potential_parents) - 3} pais")
    
    # Analisar sequência de paddings para entender hierarquia
    print(f"\n🔧 ANÁLISE DE PADDINGS:")
    all_paddings = set()
    for level_items in html_hierarchy.values():
        for item in level_items:
            all_paddings.add(item.get('padding', 0))
    
    sorted_paddings = sorted(all_paddings)
    print(f"Paddings únicos encontrados: {sorted_paddings}")
    
    # Mapear padding -> nível
    padding_to_level = {}
    for i, padding in enumerate(sorted_paddings):
        padding_to_level[padding] = i
        print(f"   Padding {padding}px = Nível {i}")
    
    # Criar mapeamento completo da hierarquia
    print(f"\n🗂️  MAPEAMENTO HIERÁRQUICO:")
    
    # Organizar todos os itens por padding
    items_by_padding = {}
    for level_str, level_items in html_hierarchy.items():
        for item in level_items:
            padding = item.get('padding', 0)
            if padding not in items_by_padding:
                items_by_padding[padding] = []
            items_by_padding[padding].append(item)
    
    # Salvar estrutura organizada por padding
    organized_structure = {
        'padding_to_level_map': padding_to_level,
        'items_by_padding': {str(k): v for k, v in items_by_padding.items()},
        'total_levels': len(sorted_paddings),
        'hierarchy_analysis': {
            'total_items': sum(len(items) for items in items_by_padding.values()),
            'levels_distribution': {str(padding): len(items) for padding, items in items_by_padding.items()}
        }
    }
    
    with open('html_structure_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(organized_structure, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Análise detalhada salva em: html_structure_analysis.json")
    
    return organized_structure

if __name__ == "__main__":
    analyze_html_structure() 