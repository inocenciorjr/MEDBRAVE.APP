#!/usr/bin/env python3
"""
Extração robusta de TODOS os 6 níveis hierárquicos do HTML original
Preserva a estrutura completa e relações pai-filho corretas
"""

import json
import re
from bs4 import BeautifulSoup

def extract_html_6_levels():
    print("🔄 EXTRAÇÃO ROBUSTA DOS 6 NÍVEIS DO HTML")
    print("=" * 60)
    
    # Ler arquivo HTML
    with open('filters novo.txt', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Parse com BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Encontrar TODOS os elementos em ordem sequencial
    filter_elements = []
    
    # Padrão mais específico para capturar elementos com padding
    for element in soup.find_all(['div', 'span'], style=True):
        style = element.get('style', '')
        
        # Procurar por padding-left
        padding_match = re.search(r'padding-left:\s*(\d+)px', style)
        if padding_match:
            padding = int(padding_match.group(1))
            level = padding // 40  # Calcular nível
            text = element.get_text(strip=True)
            
            if text:  # Só adicionar se tiver texto
                filter_elements.append({
                    'text': text,
                    'padding': padding,
                    'level': level,
                    'order': len(filter_elements)
                })
    
    print(f"📊 Elementos encontrados: {len(filter_elements)}")
    
    # Verificar distribuição por nível
    level_counts = {}
    for elem in filter_elements:
        level = elem['level']
        level_counts[level] = level_counts.get(level, 0) + 1
    
    print(f"📊 Distribuição por nível:")
    for level in sorted(level_counts.keys()):
        print(f"   Nível {level}: {level_counts[level]} itens")
    
    # Construir hierarquia de 6 níveis
    def build_6_level_hierarchy(elements):
        """Constrói hierarquia respeitando TODOS os 6 níveis"""
        hierarchy = []
        stack = [None] * 6  # Stack para cada nível (0 a 5)
        
        for elem in elements:
            level = elem['level']
            text = elem['text']
            
            # Validar nível
            if level < 0 or level > 5:
                print(f"⚠️  Nível inválido {level} para '{text}'")
                continue
            
            # Criar nó
            node = {
                'name': text,
                'level': level,
                'children': []
            }
            
            # Limpar stack dos níveis superiores
            for i in range(level + 1, 6):
                stack[i] = None
            
            # Definir parent baseado no nível
            if level == 0:
                # Especialidade (raiz)
                hierarchy.append(node)
                stack[0] = node
                print(f"📋 Nível 0 - Especialidade: '{text}'")
                
            elif level == 1:
                # Subespecialidade
                parent = stack[0]
                if parent:
                    if 'subespecialidades' not in parent:
                        parent['subespecialidades'] = []
                    parent['subespecialidades'].append(node)
                    stack[1] = node
                    print(f"  📂 Nível 1 - Subespecialidade: '{text}' → '{parent['name']}'")
                else:
                    print(f"⚠️  Órfão nível 1: '{text}'")
                    
            elif level == 2:
                # Subgrupo
                parent = stack[1]
                if parent:
                    if 'subgrupos' not in parent:
                        parent['subgrupos'] = []
                    parent['subgrupos'].append(node)
                    stack[2] = node
                    print(f"    📁 Nível 2 - Subgrupo: '{text}' → '{parent['name']}'")
                else:
                    print(f"⚠️  Órfão nível 2: '{text}'")
                    
            elif level == 3:
                # Tópico
                parent = stack[2]
                if parent:
                    if 'topicos' not in parent:
                        parent['topicos'] = []
                    parent['topicos'].append(node)
                    stack[3] = node
                    print(f"      📄 Nível 3 - Tópico: '{text}' → '{parent['name']}'")
                else:
                    print(f"⚠️  Órfão nível 3: '{text}'")
                    
            elif level == 4:
                # Subtópico
                parent = stack[3]
                if parent:
                    if 'subtopicos' not in parent:
                        parent['subtopicos'] = []
                    parent['subtopicos'].append(node)
                    stack[4] = node
                    print(f"        📃 Nível 4 - Subtópico: '{text}' → '{parent['name']}'")
                else:
                    print(f"⚠️  Órfão nível 4: '{text}'")
                    
            elif level == 5:
                # Detalhe
                parent = stack[4]
                if parent:
                    if 'detalhes' not in parent:
                        parent['detalhes'] = []
                    parent['detalhes'].append(node)
                    stack[5] = node
                    print(f"          📋 Nível 5 - Detalhe: '{text}' → '{parent['name']}'")
                else:
                    print(f"⚠️  Órfão nível 5: '{text}'")
        
        return hierarchy
    
    # Construir hierarquia
    print(f"\n🏗️  CONSTRUINDO HIERARQUIA DE 6 NÍVEIS...")
    hierarchy = build_6_level_hierarchy(filter_elements)
    
    # Calcular estatísticas recursivas
    def count_items_recursive(items, level_name=""):
        """Conta itens em todos os níveis recursivamente"""
        stats = {
            'nivel_0': 0, 'nivel_1': 0, 'nivel_2': 0,
            'nivel_3': 0, 'nivel_4': 0, 'nivel_5': 0, 'total': 0
        }
        
        for item in items:
            stats['nivel_0'] += 1
            stats['total'] += 1
            
            # Subespecialidades (nível 1)
            for sub in item.get('subespecialidades', []):
                stats['nivel_1'] += 1
                stats['total'] += 1
                
                # Subgrupos (nível 2)
                for subgrupo in sub.get('subgrupos', []):
                    stats['nivel_2'] += 1
                    stats['total'] += 1
                    
                    # Tópicos (nível 3)
                    for topico in subgrupo.get('topicos', []):
                        stats['nivel_3'] += 1
                        stats['total'] += 1
                        
                        # Subtópicos (nível 4)
                        for subtopico in topico.get('subtopicos', []):
                            stats['nivel_4'] += 1
                            stats['total'] += 1
                            
                            # Detalhes (nível 5)
                            for detalhe in subtopico.get('detalhes', []):
                                stats['nivel_5'] += 1
                                stats['total'] += 1
        
        return stats
    
    stats = count_items_recursive(hierarchy)
    
    print(f"\n📊 HIERARQUIA EXTRAÍDA:")
    print(f"   Nível 0 (Especialidades): {stats['nivel_0']}")
    print(f"   Nível 1 (Subespecialidades): {stats['nivel_1']}")
    print(f"   Nível 2 (Subgrupos): {stats['nivel_2']}")
    print(f"   Nível 3 (Tópicos): {stats['nivel_3']}")
    print(f"   Nível 4 (Subtópicos): {stats['nivel_4']}")
    print(f"   Nível 5 (Detalhes): {stats['nivel_5']}")
    print(f"   TOTAL: {stats['total']} itens")
    
    # Estrutura final
    final_structure = {
        'hierarchy': hierarchy,
        'stats': stats,
        'source': 'filters_novo_html',
        'levels': 6,
        'extraction_method': 'sequential_padding_based'
    }
    
    # Salvar resultado
    with open('html_6_levels_complete.json', 'w', encoding='utf-8') as f:
        json.dump(final_structure, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Hierarquia de 6 níveis salva em: html_6_levels_complete.json")
    
    return final_structure

if __name__ == "__main__":
    extract_html_6_levels() 