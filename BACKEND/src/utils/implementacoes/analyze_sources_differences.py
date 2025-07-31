#!/usr/bin/env python3
"""
Analisa diferenças entre as duas fontes de dados:
1. HTML (filters novo.txt) - 1.107 itens com hierarquia completa
2. Estratégia (estrategia_filters_extracted.json) - filtros únicos da 1ª leva
"""

import json

def analyze_sources_differences():
    print("🔍 ANÁLISE DAS DIFERENÇAS ENTRE AS FONTES")
    print("=" * 60)
    
    # Carregar dados do HTML (já processado)
    with open('html_hierarchy_complete.json', 'r', encoding='utf-8') as f:
        html_hierarchy = json.load(f)
    
    # Carregar dados do Estratégia
    with open('estrategia_filters_extracted.json', 'r', encoding='utf-8') as f:
        estrategia_data = json.load(f)
    
    # Extrair todos os nomes dos filtros do HTML
    html_filters = set()
    for level_items in html_hierarchy.values():
        for item in level_items:
            html_filters.add(item['text'])
    
    # Extrair todos os nomes dos filtros do Estratégia
    estrategia_filters = set()
    
    for especialidade in estrategia_data:
        esp_name = especialidade.get('especialidade', '')
        estrategia_filters.add(esp_name)
        
        for subesp in especialidade.get('subespecialidades', []):
            subesp_name = subesp.get('nome', '')
            estrategia_filters.add(subesp_name)
            
            for assunto in subesp.get('assuntos', []):
                estrategia_filters.add(assunto)
    
    # Calcular diferenças
    html_only = html_filters - estrategia_filters
    estrategia_only = estrategia_filters - html_filters
    common = html_filters & estrategia_filters
    
    print(f"📊 ESTATÍSTICAS:")
    print(f"- HTML: {len(html_filters)} filtros únicos")
    print(f"- Estratégia: {len(estrategia_filters)} filtros únicos")
    print(f"- Comuns: {len(common)} filtros")
    print(f"- Só no HTML: {len(html_only)} filtros")
    print(f"- Só no Estratégia: {len(estrategia_only)} filtros")
    print()
    
    print("🔹 FILTROS EXCLUSIVOS DO HTML (primeiros 20):")
    for i, filter_name in enumerate(sorted(html_only)[:20]):
        print(f"  {i+1}. {filter_name}")
    if len(html_only) > 20:
        print(f"  ... e mais {len(html_only) - 20} filtros")
    print()
    
    print("🔸 FILTROS EXCLUSIVOS DO ESTRATÉGIA (primeiros 20):")
    for i, filter_name in enumerate(sorted(estrategia_only)[:20]):
        print(f"  {i+1}. {filter_name}")
    if len(estrategia_only) > 20:
        print(f"  ... e mais {len(estrategia_only) - 20} filtros")
    print()
    
    # Salvar resultados
    analysis_result = {
        'html_filters': sorted(list(html_filters)),
        'estrategia_filters': sorted(list(estrategia_filters)),
        'common_filters': sorted(list(common)),
        'html_only': sorted(list(html_only)),
        'estrategia_only': sorted(list(estrategia_only)),
        'stats': {
            'html_count': len(html_filters),
            'estrategia_count': len(estrategia_filters),
            'common_count': len(common),
            'html_only_count': len(html_only),
            'estrategia_only_count': len(estrategia_only)
        }
    }
    
    with open('sources_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(analysis_result, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Análise salva em: sources_analysis.json")
    
    return analysis_result

if __name__ == "__main__":
    analyze_sources_differences() 