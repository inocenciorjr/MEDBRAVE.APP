#!/usr/bin/env python3
"""
Merge inteligente entre hierarquia HTML (6 níveis) e estrategia_filters_extracted.json
Adiciona apenas filtros que NÃO existem no HTML, mantendo estrutura médica correta
"""

import json
import re
from difflib import SequenceMatcher

def normalize_text(text):
    """Normaliza texto para comparação"""
    # Remove acentos, caracteres especiais, converte para minúsculo
    normalized = re.sub(r'[^a-zA-Z0-9\s]', '', text.lower().strip())
    # Remove espaços extras
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized

def similarity(a, b):
    """Calcula similaridade entre dois textos"""
    norm_a = normalize_text(a)
    norm_b = normalize_text(b)
    return SequenceMatcher(None, norm_a, norm_b).ratio()

def extract_all_items_html(hierarchy):
    """Extrai todos os itens da hierarquia HTML em formato plano"""
    items = set()
    
    def extract_recursive(node, path=""):
        if isinstance(node, dict):
            name = node.get('name', '')
            if name:
                current_path = f"{path}/{name}" if path else name
                items.add(normalize_text(name))
                
                # Processar todos os tipos de children
                for child_type in ['subespecialidades', 'subgrupos', 'topicos', 'subtopicos', 'detalhes']:
                    if child_type in node:
                        for child in node[child_type]:
                            extract_recursive(child, current_path)
        elif isinstance(node, list):
            for item in node:
                extract_recursive(item, path)
    
    extract_recursive(hierarchy)
    return items

def extract_all_items_estrategia(hierarchy):
    """Extrai todos os itens da hierarquia estrategia em formato plano"""
    items = set()
    
    for especialidade in hierarchy:
        esp_name = especialidade.get('especialidade', '')
        items.add(normalize_text(esp_name))
        
        for subesp in especialidade.get('subespecialidades', []):
            sub_name = subesp.get('nome', '')
            items.add(normalize_text(sub_name))
            
            for assunto in subesp.get('assuntos', []):
                items.add(normalize_text(assunto))
    
    return items

def find_similar_item(target, items_list, threshold=0.8):
    """Encontra item similar na lista com threshold de similaridade"""
    target_norm = normalize_text(target)
    
    for item in items_list:
        if similarity(target, item) >= threshold:
            return item
    return None

def merge_intelligent_hierarchies():
    print("🔄 MERGE INTELIGENTE DE HIERARQUIAS")
    print("=" * 60)
    
    # Carregar hierarquia HTML (6 níveis)
    with open('html_6_levels_complete.json', 'r', encoding='utf-8') as f:
        html_data = json.load(f)
    html_hierarchy = html_data['hierarchy']
    
    # Carregar hierarquia estrategia
    with open('estrategia_filters_extracted.json', 'r', encoding='utf-8') as f:
        estrategia_hierarchy = json.load(f)
    
    print(f"📊 HTML: {len(html_hierarchy)} especialidades")
    print(f"📊 Estratégia: {len(estrategia_hierarchy)} especialidades")
    
    # Extrair todos os itens de cada hierarquia
    html_items = extract_all_items_html(html_hierarchy)
    estrategia_items = extract_all_items_estrategia(estrategia_hierarchy)
    
    print(f"📊 Itens únicos HTML: {len(html_items)}")
    print(f"📊 Itens únicos Estratégia: {len(estrategia_items)}")
    
    # Encontrar itens que existem APENAS na estratégia
    missing_in_html = []
    existing_in_both = []
    
    for esp in estrategia_hierarchy:
        esp_name = esp.get('especialidade', '')
        
        # Verificar se especialidade existe no HTML
        similar_esp = find_similar_item(esp_name, [item['name'] for item in html_hierarchy])
        
        if not similar_esp:
            print(f"🆕 Especialidade faltante: {esp_name}")
            missing_in_html.append(('especialidade', esp_name, esp))
        else:
            existing_in_both.append(esp_name)
            
            # Verificar subespecialidades
            for subesp in esp.get('subespecialidades', []):
                sub_name = subesp.get('nome', '')
                
                if normalize_text(sub_name) not in html_items:
                    print(f"  🆕 Subespecialidade faltante: {sub_name} (de {esp_name})")
                    missing_in_html.append(('subespecialidade', sub_name, subesp, esp_name))
                    
                    # Verificar assuntos
                    for assunto in subesp.get('assuntos', []):
                        if normalize_text(assunto) not in html_items:
                            print(f"    🆕 Assunto faltante: {assunto} (de {sub_name})")
                            missing_in_html.append(('assunto', assunto, assunto, sub_name, esp_name))
                else:
                    # Subespecialidade existe, verificar apenas assuntos
                    for assunto in subesp.get('assuntos', []):
                        if normalize_text(assunto) not in html_items:
                            print(f"    🆕 Assunto faltante: {assunto} (de {sub_name} existente)")
                            missing_in_html.append(('assunto', assunto, assunto, sub_name, esp_name))
    
    print(f"\n📊 RESUMO DO MERGE:")
    print(f"   ✅ Especialidades comuns: {len(existing_in_both)}")
    print(f"   🆕 Itens faltantes no HTML: {len(missing_in_html)}")
    
    # Adicionar itens faltantes à hierarquia HTML
    merged_hierarchy = json.loads(json.dumps(html_hierarchy))  # Deep copy
    
    def find_especialidade_in_merged(esp_name):
        """Encontra especialidade na hierarquia merged"""
        for esp in merged_hierarchy:
            if similarity(esp['name'], esp_name) >= 0.8:
                return esp
        return None
    
    def find_subespecialidade_in_merged(esp, sub_name):
        """Encontra subespecialidade na especialidade"""
        for sub in esp.get('subespecialidades', []):
            if similarity(sub['name'], sub_name) >= 0.8:
                return sub
        return None
    
    items_added = 0
    
    for item_info in missing_in_html:
        item_type = item_info[0]
        
        if item_type == 'especialidade':
            # Adicionar especialidade completa
            esp_name, esp_data = item_info[1], item_info[2]
            
            new_esp = {
                'name': esp_name,
                'level': 0,
                'children': [],
                'subespecialidades': []
            }
            
            # Converter subespecialidades
            for subesp in esp_data.get('subespecialidades', []):
                new_sub = {
                    'name': subesp['nome'],
                    'level': 1,
                    'children': [],
                    'subgrupos': []
                }
                
                # Converter assuntos para subgrupos
                for assunto in subesp.get('assuntos', []):
                    new_sub['subgrupos'].append({
                        'name': assunto,
                        'level': 2,
                        'children': []
                    })
                
                new_esp['subespecialidades'].append(new_sub)
            
            merged_hierarchy.append(new_esp)
            items_added += 1
            print(f"  ✅ Adicionada especialidade: {esp_name}")
            
        elif item_type == 'subespecialidade':
            # Adicionar subespecialidade à especialidade existente
            sub_name, sub_data, esp_name = item_info[1], item_info[2], item_info[3]
            
            esp_target = find_especialidade_in_merged(esp_name)
            if esp_target:
                new_sub = {
                    'name': sub_name,
                    'level': 1,
                    'children': [],
                    'subgrupos': []
                }
                
                # Converter assuntos para subgrupos
                for assunto in sub_data.get('assuntos', []):
                    new_sub['subgrupos'].append({
                        'name': assunto,
                        'level': 2,
                        'children': []
                    })
                
                if 'subespecialidades' not in esp_target:
                    esp_target['subespecialidades'] = []
                esp_target['subespecialidades'].append(new_sub)
                items_added += 1
                print(f"  ✅ Adicionada subespecialidade: {sub_name} → {esp_name}")
                
        elif item_type == 'assunto':
            # Adicionar assunto à subespecialidade existente
            assunto, sub_name, esp_name = item_info[1], item_info[3], item_info[4]
            
            esp_target = find_especialidade_in_merged(esp_name)
            if esp_target:
                sub_target = find_subespecialidade_in_merged(esp_target, sub_name)
                if sub_target:
                    if 'subgrupos' not in sub_target:
                        sub_target['subgrupos'] = []
                    sub_target['subgrupos'].append({
                        'name': assunto,
                        'level': 2,
                        'children': []
                    })
                    items_added += 1
                    print(f"  ✅ Adicionado assunto: {assunto} → {sub_name} → {esp_name}")
    
    # Estatísticas finais
    def count_items_final(hierarchy):
        stats = {
            'especialidades': len(hierarchy),
            'subespecialidades': 0,
            'subgrupos': 0,
            'topicos': 0,
            'subtopicos': 0,
            'detalhes': 0,
            'total': 0
        }
        
        for esp in hierarchy:
            stats['total'] += 1
            for sub in esp.get('subespecialidades', []):
                stats['subespecialidades'] += 1
                stats['total'] += 1
                for subgrupo in sub.get('subgrupos', []):
                    stats['subgrupos'] += 1
                    stats['total'] += 1
                    for topico in subgrupo.get('topicos', []):
                        stats['topicos'] += 1
                        stats['total'] += 1
                        for subtopico in topico.get('subtopicos', []):
                            stats['subtopicos'] += 1
                            stats['total'] += 1
                            for detalhe in subtopico.get('detalhes', []):
                                stats['detalhes'] += 1
                                stats['total'] += 1
        
        return stats
    
    final_stats = count_items_final(merged_hierarchy)
    
    print(f"\n📊 HIERARQUIA FINAL MERGED:")
    print(f"   Especialidades: {final_stats['especialidades']}")
    print(f"   Subespecialidades: {final_stats['subespecialidades']}")
    print(f"   Subgrupos: {final_stats['subgrupos']}")
    print(f"   Tópicos: {final_stats['topicos']}")
    print(f"   Subtópicos: {final_stats['subtopicos']}")
    print(f"   Detalhes: {final_stats['detalhes']}")
    print(f"   TOTAL: {final_stats['total']} itens")
    print(f"   🆕 Itens adicionados: {items_added}")
    
    # Salvar resultado final
    final_structure = {
        'hierarchy': merged_hierarchy,
        'stats': final_stats,
        'source': 'html_6_levels + estrategia_intelligent_merge',
        'levels': 6,
        'items_added_from_estrategia': items_added,
        'merge_method': 'intelligent_no_duplicates'
    }
    
    with open('final_complete_hierarchy.json', 'w', encoding='utf-8') as f:
        json.dump(final_structure, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Hierarquia final completa salva em: final_complete_hierarchy.json")
    
    return final_structure

if __name__ == "__main__":
    merge_intelligent_hierarchies() 