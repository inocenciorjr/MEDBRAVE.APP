#!/usr/bin/env python3
"""
Constrói hierarquia COMPLETA de 6 níveis baseada na sequência e padding do HTML
Reconstrói a estrutura hierárquica real e adiciona filtros únicos do Estratégia
"""

import json

def build_complete_6_level_hierarchy():
    print("🔄 CONSTRUINDO HIERARQUIA COMPLETA DE 6 NÍVEIS")
    print("=" * 60)
    
    # Carregar estrutura HTML analisada
    with open('html_structure_analysis.json', 'r', encoding='utf-8') as f:
        html_analysis = json.load(f)
    
    # Carregar análise das diferenças
    with open('sources_analysis.json', 'r', encoding='utf-8') as f:
        analysis = json.load(f)
    
    # Carregar dados do Estratégia
    with open('estrategia_filters_extracted.json', 'r', encoding='utf-8') as f:
        estrategia_data = json.load(f)
    
    print(f"📋 Base HTML: {html_analysis['hierarchy_analysis']['total_items']} filtros (6 níveis)")
    print(f"➕ Adicionando: {len(analysis['estrategia_only'])} filtros únicos do Estratégia")
    
    # Acessar mapeamento de padding para nível
    padding_to_level = {int(k): v for k, v in html_analysis['padding_to_level_map'].items()}
    items_by_padding = html_analysis['items_by_padding']
    
    # Criar lista plana de todos os itens em ordem sequencial
    all_items_sequence = []
    
    # Primeiro, precisamos reconstruir a ordem sequencial original do HTML
    # Vamos concatenar todos os itens de todos os níveis em ordem
    for level_str in ['0', '1', '2', '3', '4', '5']:
        if level_str in items_by_padding:
            for item in items_by_padding[level_str]:
                item['level'] = padding_to_level[item.get('padding', 0)]
                all_items_sequence.append(item)
    
    print(f"📊 Total de itens em sequência: {len(all_items_sequence)}")
    
    # Agora construir hierarquia baseada na sequência e níveis
    def build_hierarchy_from_sequence(items):
        """Constrói hierarquia baseada na sequência e níveis de padding"""
        result = []
        stack = []  # Stack para manter contexto hierárquico
        
        for item in items:
            level = item.get('level', 0)
            text = item.get('text', '')
            
            # Criar objeto do item
            item_obj = {
                'nome': text,
                'nivel': level,
                'padding': item.get('padding', 0),
                'children': []
            }
            
            # Ajustar stack para o nível atual
            while len(stack) > level:
                stack.pop()
            
            if level == 0:
                # Item raiz (especialidade)
                result.append(item_obj)
                stack = [item_obj]
            else:
                # Item filho - adicionar ao pai correto no stack
                if len(stack) >= level:
                    parent = stack[level - 1]
                    parent['children'].append(item_obj)
                    
                    # Atualizar stack
                    if len(stack) > level:
                        stack[level] = item_obj
                    else:
                        stack.append(item_obj)
                else:
                    # Se não há pai apropriado, adicionar ao último pai disponível
                    if stack:
                        stack[-1]['children'].append(item_obj)
                        stack.append(item_obj)
        
        return result
    
    # Construir hierarquia completa
    print("🏗️  Construindo hierarquia recursiva...")
    complete_hierarchy = build_hierarchy_from_sequence(all_items_sequence)
    
    # Adicionar filtros únicos do Estratégia
    estrategia_only_filters = set(analysis['estrategia_only'])
    
    print(f"🔧 Adicionando {len(estrategia_only_filters)} filtros únicos do Estratégia...")
    
    def find_especialidade_by_name(hierarchy, name):
        """Encontra especialidade por nome"""
        for esp in hierarchy:
            if esp['nome'] == name:
                return esp
        return None
    
    def find_subespecialidade_by_name(especialidade, name):
        """Encontra subespecialidade por nome dentro de uma especialidade"""
        for child in especialidade.get('children', []):
            if child['nome'] == name and child['nivel'] == 1:
                return child
        return None
    
    # Processar filtros únicos do Estratégia
    for especialidade in estrategia_data:
        esp_name = especialidade.get('especialidade', '')
        
        # Encontrar ou criar especialidade
        target_esp = find_especialidade_by_name(complete_hierarchy, esp_name)
        
        if esp_name in estrategia_only_filters and not target_esp:
            # Criar nova especialidade
            target_esp = {
                'nome': esp_name,
                'nivel': 0,
                'padding': 0,
                'children': []
            }
            complete_hierarchy.append(target_esp)
            print(f"  + Nova especialidade: {esp_name}")
        
        if target_esp:
            # Processar subespecialidades
            for subesp in especialidade.get('subespecialidades', []):
                subesp_name = subesp.get('nome', '')
                
                # Encontrar ou criar subespecialidade
                target_subesp = find_subespecialidade_by_name(target_esp, subesp_name)
                
                if subesp_name in estrategia_only_filters and not target_subesp:
                    target_subesp = {
                        'nome': subesp_name,
                        'nivel': 1,
                        'padding': 40,
                        'children': []
                    }
                    target_esp['children'].append(target_subesp)
                    print(f"  + Nova subespecialidade: {esp_name} > {subesp_name}")
                
                if target_subesp:
                    # Adicionar assuntos únicos
                    for assunto in subesp.get('assuntos', []):
                        if assunto in estrategia_only_filters:
                            assunto_obj = {
                                'nome': assunto,
                                'nivel': 2,
                                'padding': 80,
                                'children': []
                            }
                            target_subesp['children'].append(assunto_obj)
                            print(f"  + Novo assunto: {esp_name} > {subesp_name} > {assunto}")
    
    # Calcular estatísticas finais
    def count_items_recursive(items, level=0):
        """Conta itens recursivamente por nível"""
        counts = {level: len(items)}
        
        for item in items:
            children = item.get('children', [])
            if children:
                child_counts = count_items_recursive(children, level + 1)
                for lvl, count in child_counts.items():
                    counts[lvl] = counts.get(lvl, 0) + count
        
        return counts
    
    level_counts = count_items_recursive(complete_hierarchy)
    total_items = sum(level_counts.values())
    
    # Estrutura final
    final_structure = {
        'especialidades': complete_hierarchy,
        'total_levels': 6,
        'level_counts': level_counts,
        'total_items': total_items,
        'source_info': {
            'html_items': html_analysis['hierarchy_analysis']['total_items'],
            'estrategia_unique_items': len(estrategia_only_filters),
            'merged_total': total_items
        }
    }
    
    print()
    print("=== RESULTADO FINAL ===")
    print(f"📊 Total de níveis: {final_structure['total_levels']}")
    print(f"📊 Total de itens: {final_structure['total_items']}")
    
    for level, count in sorted(final_structure['level_counts'].items()):
        print(f"   Nível {level}: {count} itens")
    
    print(f"\n📈 COMPARAÇÃO:")
    print(f"   HTML original: {final_structure['source_info']['html_items']} itens")
    print(f"   Estratégia únicos: {final_structure['source_info']['estrategia_unique_items']} itens")
    print(f"   Total final: {final_structure['source_info']['merged_total']} itens")
    
    # Salvar resultado
    with open('complete_6_level_hierarchy.json', 'w', encoding='utf-8') as f:
        json.dump(final_structure, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Hierarquia completa de 6 níveis salva em: complete_6_level_hierarchy.json")
    
    return final_structure

if __name__ == "__main__":
    build_complete_6_level_hierarchy() 