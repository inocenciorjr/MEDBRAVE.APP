#!/usr/bin/env python3
"""
Analisa o arquivo HTML original 'filters novo.txt' 
para contar exatamente quantos níveis hierárquicos existem
"""

import re
from collections import Counter

def count_html_levels():
    print("🔍 ANALISANDO NÍVEIS NO HTML ORIGINAL")
    print("=" * 50)
    
    # Ler arquivo HTML
    with open('filters novo.txt', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Padrão para encontrar padding-left
    padding_pattern = r'padding-left:\s*(\d+)px'
    
    # Encontrar todos os valores de padding
    padding_values = re.findall(padding_pattern, html_content)
    padding_values = [int(p) for p in padding_values]
    
    # Contar frequência de cada padding
    padding_counter = Counter(padding_values)
    
    # Ordenar por valor de padding
    sorted_paddings = sorted(padding_counter.items())
    
    print(f"📊 NÍVEIS ENCONTRADOS (baseado em padding-left):")
    
    total_items = 0
    for padding, count in sorted_paddings:
        level = padding // 40  # Assumindo incremento de 40px por nível
        print(f"   Nível {level} (padding: {padding}px): {count} itens")
        total_items += count
    
    print(f"\n📊 RESUMO:")
    print(f"   Total de níveis: {len(sorted_paddings)}")
    print(f"   Total de itens: {total_items}")
    print(f"   Padding mínimo: {min(padding_values)}px")
    print(f"   Padding máximo: {max(padding_values)}px")
    
    # Verificar se há padrão consistente
    if len(sorted_paddings) > 1:
        increments = []
        for i in range(1, len(sorted_paddings)):
            increment = sorted_paddings[i][0] - sorted_paddings[i-1][0]
            increments.append(increment)
        
        if len(set(increments)) == 1:
            print(f"   Incremento consistente: {increments[0]}px por nível")
        else:
            print(f"   Incrementos variados: {set(increments)}")
    
    # Mostrar alguns exemplos de cada nível
    print(f"\n🔍 EXEMPLOS POR NÍVEL:")
    
    # Padrão para encontrar elementos com padding e seu texto
    element_pattern = r'<div[^>]*padding-left:\s*(\d+)px[^>]*>([^<]+)</div>'
    elements = re.findall(element_pattern, html_content)
    
    # Agrupar por nível
    levels_examples = {}
    for padding_str, text in elements:
        padding = int(padding_str)
        level = padding // 40
        
        if level not in levels_examples:
            levels_examples[level] = []
        
        levels_examples[level].append(text.strip())
    
    # Mostrar até 5 exemplos por nível
    for level in sorted(levels_examples.keys()):
        examples = levels_examples[level][:5]
        print(f"\n   Nível {level}:")
        for i, example in enumerate(examples, 1):
            print(f"      {i}. {example}")
        
        if len(levels_examples[level]) > 5:
            print(f"      ... e mais {len(levels_examples[level]) - 5} itens")
    
    return sorted_paddings, total_items

if __name__ == "__main__":
    count_html_levels() 