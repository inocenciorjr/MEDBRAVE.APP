#!/usr/bin/env python3
"""
Parser do HTML para identificar a hierarquia completa dos filtros
Analisa o arquivo filters novo.txt e extrai a estrutura hierárquica real
"""

import re
from bs4 import BeautifulSoup
import json

def parse_html_hierarchy():
    print("ANALISANDO A HIERARQUIA COMPLETA DO HTML ORIGINAL")
    print("=" * 60)
    
    # Ler o arquivo HTML
    with open('filters novo.txt', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Usar BeautifulSoup para parse
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Encontrar todos os elementos com padding-left para identificar níveis
    hierarchy = {}
    current_path = []
    
    # Extrair todos os elementos de filtro
    filter_items = soup.find_all('div', class_='ui-w-full ui-text-left')
    
    hierarchy_levels = {}
    total_items = 0
    
    for item in filter_items:
        if item.get_text().strip():
            # Encontrar o padding-left do elemento pai
            parent_div = item.find_parent('div', style=lambda x: x and 'padding-left' in x)
            if parent_div and parent_div.get('style'):
                padding_match = re.search(r'padding-left:\s*(\d+)px', parent_div.get('style'))
                if padding_match:
                    padding = int(padding_match.group(1))
                    level = padding // 40  # Cada nível tem 40px de diferença
                    
                    text = item.get_text().strip()
                    
                    if level not in hierarchy_levels:
                        hierarchy_levels[level] = []
                    
                    hierarchy_levels[level].append({
                        'text': text,
                        'padding': padding,
                        'level': level
                    })
                    
                    total_items += 1
    
    # Exibir resultado
    print(f"TOTAL DE ITENS ENCONTRADOS: {total_items}")
    print()
    
    for level in sorted(hierarchy_levels.keys()):
        items = hierarchy_levels[level]
        print(f"NIVEL {level} (padding: {level * 40}px) - {len(items)} itens:")
        for i, item in enumerate(items[:10]):  # Mostrar só os primeiros 10
            print(f"  {i+1}. {item['text']}")
        if len(items) > 10:
            print(f"  ... e mais {len(items) - 10} itens")
        print()
    
    # Identificar problemas na estrutura atual
    print("PROBLEMAS IDENTIFICADOS:")
    print("-" * 40)
    
    # Salvar hierarquia completa em JSON
    with open('html_hierarchy_complete.json', 'w', encoding='utf-8') as f:
        json.dump(hierarchy_levels, f, ensure_ascii=False, indent=2)
    
    print(f"Hierarquia completa salva em: html_hierarchy_complete.json")
    
    return hierarchy_levels

if __name__ == "__main__":
    parse_html_hierarchy() 