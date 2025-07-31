#!/usr/bin/env python3
"""
Parser sequencial do HTML original que preserva a ordem hierárquica exata
Processa o HTML linha por linha para manter as relações pai-filho corretas
"""

import json
from bs4 import BeautifulSoup

def parse_html_sequential():
    print("🔄 PARSER SEQUENCIAL DO HTML ORIGINAL")
    print("=" * 60)
    
    # Ler o arquivo HTML original
    with open('filters novo.txt', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Parse com BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Encontrar todos os elementos de filtro em ordem sequencial
    # Procurar por divs que tenham padding-left (indicam hierarquia)
    filter_elements = []
    
    # Buscar elementos com diferentes padrões de padding
    for padding in [0, 40, 80, 120, 160, 200]:
        # Buscar elementos com este padding específico
        elements_with_padding = soup.find_all('div', style=lambda value: value and f'padding-left: {padding}px' in value)
        
        for elem in elements_with_padding:
            # Extrair texto do elemento
            text = elem.get_text(strip=True)
            if text:  # Só adicionar se tiver texto
                filter_elements.append({
                    'text': text,
                    'padding': padding,
                    'level': padding // 40,  # Calcular nível baseado no padding
                    'html_position': len(filter_elements)  # Posição no HTML
                })
    
    print(f"📊 Elementos encontrados: {len(filter_elements)}")
    
    # Construir hierarquia baseada na sequência
    def build_hierarchy_sequential(elements):
        """Constrói hierarquia baseada na sequência exata dos elementos"""
        result = []
        stack = []  # Stack para manter contexto hierárquico
        
        for i, elem in enumerate(elements):
            level = elem['level']
            text = elem['text']
            padding = elem['padding']
            
            # Criar nó
            node = {
                'nome': text,
                'nivel': level,
                'padding': padding,
                'position': i,
                'children': []
            }
            
            # Ajustar stack para o nível atual
            while len(stack) > level:
                stack.pop()
            
            # Adicionar ao local correto
            if level == 0:
                # Especialidade (raiz)
                result.append(node)
                stack = [node]
                print(f"📋 Especialidade encontrada: '{text}'")
            else:
                # Elemento filho
                if len(stack) >= level:
                    parent = stack[level - 1]
                    parent['children'].append(node)
                    
                    # Atualizar stack
                    if len(stack) > level:
                        stack[level] = node
                    else:
                        stack.append(node)
                    
                    # Debug: mostrar relação pai-filho
                    if level == 1:
                        print(f"  + Subespecialidade: '{text}' -> '{parent['nome']}'")
                else:
                    print(f"⚠️  Órfão encontrado: '{text}' (nível {level})")
                    # Adicionar ao último pai disponível
                    if stack:
                        stack[-1]['children'].append(node)
                        stack.append(node)
        
        return result
    
    # Ordenar elementos por posição original
    filter_elements.sort(key=lambda x: x['html_position'])
    
    # Construir hierarquia
    print("\n🏗️  Construindo hierarquia sequencial...")
    hierarchy = build_hierarchy_sequential(filter_elements)
    
    # Calcular estatísticas
    def count_items_by_level(nodes, current_level=0):
        """Conta itens por nível recursivamente"""
        counts = {}
        
        if nodes:
            counts[current_level] = len(nodes)
        
        for node in nodes:
            children = node.get('children', [])
            if children:
                child_counts = count_items_by_level(children, current_level + 1)
                for lvl, count in child_counts.items():
                    counts[lvl] = counts.get(lvl, 0) + count
        
        return counts
    
    level_counts = count_items_by_level(hierarchy)
    total_items = sum(level_counts.values())
    
    print(f"\n📊 HIERARQUIA RECONSTRUÍDA:")
    print(f"Total de itens: {total_items}")
    
    for level in sorted(level_counts.keys()):
        count = level_counts[level]
        print(f"   Nível {level}: {count} itens")
    
    # Estrutura final
    final_structure = {
        'hierarchy': hierarchy,
        'level_counts': level_counts,
        'total_items': total_items,
        'elements_processed': len(filter_elements)
    }
    
    # Salvar resultado
    with open('html_sequential_hierarchy.json', 'w', encoding='utf-8') as f:
        json.dump(final_structure, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Hierarquia sequencial salva em: html_sequential_hierarchy.json")
    
    return final_structure

if __name__ == "__main__":
    parse_html_sequential() 