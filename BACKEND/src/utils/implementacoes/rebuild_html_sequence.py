#!/usr/bin/env python3
"""
Reconstrói a sequência original do HTML combinando todos os níveis em ordem
"""

import json

def rebuild_html_sequence():
    print("🔄 RECONSTRUINDO SEQUÊNCIA ORIGINAL DO HTML")
    print("=" * 60)
    
    # Carregar hierarquia HTML original
    with open('html_hierarchy_complete.json', 'r', encoding='utf-8') as f:
        html_hierarchy = json.load(f)
    
    # Converter a estrutura de níveis em uma lista sequencial
    all_items = []
    
    # Coletar todos os itens de todos os níveis
    for level_str in sorted(html_hierarchy.keys(), key=int):
        level_items = html_hierarchy[level_str]
        print(f"📊 Nível {level_str}: {len(level_items)} itens")
        
        for item in level_items:
            # Adicionar informação de nível ao item
            item['level'] = int(level_str)
            all_items.append(item)
    
    print(f"\n📋 Total de itens coletados: {len(all_items)}")
    
    # Agora vamos tentar reconstruir a hierarquia baseada na sequência e padding
    def build_tree_structure(items):
        """Constrói árvore hierárquica a partir da sequência de itens"""
        result = []
        stack = []  # Stack para contexto hierárquico atual
        
        for item in items:
            level = item.get('level', 0)
            text = item.get('text', '')
            padding = item.get('padding', 0)
            
            # Criar nó
            node = {
                'nome': text,
                'nivel': level,
                'padding': padding,
                'children': []
            }
            
            # Ajustar stack para o nível atual
            while len(stack) > level:
                stack.pop()
            
            # Adicionar ao local correto
            if level == 0:
                # Raiz
                result.append(node)
                stack = [node]
            else:
                # Filho - encontrar pai apropriado
                if stack and len(stack) >= level:
                    parent = stack[level - 1]
                    parent['children'].append(node)
                    
                    # Ajustar stack
                    if len(stack) > level:
                        stack[level] = node
                    else:
                        stack.append(node)
                else:
                    print(f"⚠️  Órfão encontrado: '{text}' (nível {level})")
                    # Adicionar ao último pai disponível
                    if stack:
                        stack[-1]['children'].append(node)
                        stack.append(node)
        
        return result
    
    # Construir árvore
    print("\n🏗️  Construindo árvore hierárquica...")
    tree_structure = build_tree_structure(all_items)
    
    # Calcular estatísticas
    def count_nodes_by_level(nodes, current_level=0):
        """Conta nós por nível recursivamente"""
        counts = {}
        
        if nodes:
            counts[current_level] = len(nodes)
        
        for node in nodes:
            children = node.get('children', [])
            if children:
                child_counts = count_nodes_by_level(children, current_level + 1)
                for level, count in child_counts.items():
                    counts[level] = counts.get(level, 0) + count
        
        return counts
    
    level_counts = count_nodes_by_level(tree_structure)
    total_nodes = sum(level_counts.values())
    
    print(f"\n📊 RESULTADO DA RECONSTRUÇÃO:")
    print(f"Total de nós: {total_nodes}")
    
    for level in sorted(level_counts.keys()):
        count = level_counts[level]
        print(f"   Nível {level}: {count} nós")
    
    # Salvar estrutura reconstruída
    reconstructed_data = {
        'tree_structure': tree_structure,
        'level_counts': level_counts,
        'total_nodes': total_nodes,
        'original_items_count': len(all_items)
    }
    
    with open('html_tree_reconstructed.json', 'w', encoding='utf-8') as f:
        json.dump(reconstructed_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Árvore reconstruída salva em: html_tree_reconstructed.json")
    
    return reconstructed_data

if __name__ == "__main__":
    rebuild_html_sequence() 