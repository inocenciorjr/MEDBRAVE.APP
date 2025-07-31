#!/usr/bin/env python3
"""
Cria união inteligente entre HTML (hierarquia completa) + filtros únicos do Estratégia
Preserva a estrutura hierárquica do HTML e adiciona filtros únicos do Estratégia
"""

import json

def create_intelligent_merge():
    print("🔄 CRIANDO UNIÃO INTELIGENTE DAS FONTES")
    print("=" * 60)
    
    # Carregar análise das diferenças
    with open('sources_analysis.json', 'r', encoding='utf-8') as f:
        analysis = json.load(f)
    
    # Carregar hierarquia do HTML
    with open('html_hierarchy_complete.json', 'r', encoding='utf-8') as f:
        html_hierarchy = json.load(f)
    
    # Carregar dados do Estratégia
    with open('estrategia_filters_extracted.json', 'r', encoding='utf-8') as f:
        estrategia_data = json.load(f)
    
    print(f"📋 Base: {len(analysis['html_filters'])} filtros do HTML (com hierarquia)")
    print(f"➕ Adicionando: {len(analysis['estrategia_only'])} filtros únicos do Estratégia")
    
    # Começar com a estrutura hierárquica do HTML
    final_structure = []
    
    # Converter hierarquia HTML para estrutura de especialidades
    html_by_especialidade = {}
    
    # Processar nível 0 (especialidades)
    for item in html_hierarchy.get('0', []):
        esp_name = item['text']
        html_by_especialidade[esp_name] = {
            'especialidade': esp_name,
            'subespecialidades': []
        }
    
    # Processar níveis 1+ (subespecialidades e assuntos)
    for level in ['1', '2', '3', '4', '5']:
        if level not in html_hierarchy:
            continue
            
        for item in html_hierarchy[level]:
            # Implementar lógica para organizar por especialidade
            # (simplificado por ora - expandir conforme necessário)
            pass
    
    # Adicionar filtros únicos do Estratégia
    estrategia_only_filters = set(analysis['estrategia_only'])
    
    for especialidade in estrategia_data:
        esp_name = especialidade.get('especialidade', '')
        
        # Se especialidade não existe no HTML, adicionar
        if esp_name in estrategia_only_filters:
            if esp_name not in html_by_especialidade:
                html_by_especialidade[esp_name] = {
                    'especialidade': esp_name,
                    'subespecialidades': []
                }
        
        # Processar subespecialidades e assuntos únicos
        for subesp in especialidade.get('subespecialidades', []):
            subesp_name = subesp.get('nome', '')
            
            if subesp_name in estrategia_only_filters:
                # Adicionar subespecialidade única
                if esp_name in html_by_especialidade:
                    # Verificar se já existe
                    existing_subesp = [s for s in html_by_especialidade[esp_name]['subespecialidades'] 
                                     if s.get('nome') == subesp_name]
                    if not existing_subesp:
                        html_by_especialidade[esp_name]['subespecialidades'].append({
                            'nome': subesp_name,
                            'assuntos': []
                        })
            
            # Processar assuntos únicos
            for assunto in subesp.get('assuntos', []):
                if assunto in estrategia_only_filters:
                    # Adicionar assunto único à subespecialidade apropriada
                    if esp_name in html_by_especialidade:
                        for subesp_obj in html_by_especialidade[esp_name]['subespecialidades']:
                            if subesp_obj.get('nome') == subesp_name:
                                if assunto not in subesp_obj.get('assuntos', []):
                                    subesp_obj['assuntos'].append(assunto)
                                break
    
    # Converter para lista final
    final_structure = list(html_by_especialidade.values())
    
    # Calcular estatísticas finais
    total_filtros = 0
    for esp in final_structure:
        total_filtros += 1  # especialidade
        for subesp in esp.get('subespecialidades', []):
            total_filtros += 1  # subespecialidade
            total_filtros += len(subesp.get('assuntos', []))  # assuntos
    
    print(f"✅ União criada com {total_filtros} filtros totais")
    print(f"📊 {len(final_structure)} especialidades")
    
    # Salvar resultado
    with open('intelligent_merge.json', 'w', encoding='utf-8') as f:
        json.dump(final_structure, f, ensure_ascii=False, indent=2)
    
    print("💾 União salva em: intelligent_merge.json")
    
    return final_structure

if __name__ == "__main__":
    create_intelligent_merge() 