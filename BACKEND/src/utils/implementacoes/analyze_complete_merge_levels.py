#!/usr/bin/env python3
"""
Analisa os níveis hierárquicos presentes no complete_merge.json
Verifica se conseguimos capturar todos os 6 níveis da hierarquia original
"""

import json
from collections import defaultdict

def analyze_complete_merge_levels():
    print("🔍 ANÁLISE DOS NÍVEIS HIERÁRQUICOS NO COMPLETE_MERGE.JSON")
    print("=" * 60)
    
    # Carregar complete_merge.json
    with open('complete_merge.json', 'r', encoding='utf-8') as f:
        complete_data = json.load(f)
    
    print(f"📊 ESTRUTURA ATUAL:")
    print(f"Especialidades: {len(complete_data)}")
    
    total_subespecialidades = 0
    total_assuntos = 0
    hierarchy_analysis = defaultdict(int)
    
    # Analisar cada especialidade
    for esp in complete_data:
        esp_name = esp.get('especialidade', '')
        hierarchy_analysis['nivel_1_especialidades'] += 1
        
        subespecialidades = esp.get('subespecialidades', [])
        total_subespecialidades += len(subespecialidades)
        
        # Analisar cada subespecialidade
        for subesp in subespecialidades:
            subesp_name = subesp.get('nome', '')
            hierarchy_analysis['nivel_2_subespecialidades'] += 1
            
            assuntos = subesp.get('assuntos', [])
            total_assuntos += len(assuntos)
            hierarchy_analysis['nivel_3_assuntos'] += len(assuntos)
            
            # Verificar se há padrões hierárquicos nos assuntos (4º, 5º, 6º níveis)
            assuntos_pais = set()
            assuntos_filhos = []
            
            for assunto in assuntos:
                if ' - ' in assunto:
                    # Este é um assunto filho (4º nível)
                    pai = assunto.split(' - ')[0]
                    assuntos_pais.add(pai)
                    assuntos_filhos.append(assunto)
                    hierarchy_analysis['nivel_4_assuntos_filhos'] += 1
                else:
                    # Pode ser um assunto pai (3º nível) ou independente
                    if pai in [a.split(' - ')[0] for a in assuntos if ' - ' in a]:
                        hierarchy_analysis['nivel_3_assuntos_pais'] += 1
                    else:
                        hierarchy_analysis['nivel_3_assuntos_independentes'] += 1
            
            # Identificar assuntos órfãos (que deveriam ser pais mas não existem)
            for pai in assuntos_pais:
                if pai not in assuntos:
                    hierarchy_analysis['assuntos_pais_orfaos'] += 1
                    print(f"  ⚠️  PAI ÓRFÃO: '{pai}' em {esp_name} > {subesp_name}")
    
    print(f"Subespecialidades: {total_subespecialidades}")
    print(f"Assuntos: {total_assuntos}")
    print()
    
    print("📋 ANÁLISE HIERÁRQUICA DETALHADA:")
    print(f"NÍVEL 1 - Especialidades: {hierarchy_analysis['nivel_1_especialidades']}")
    print(f"NÍVEL 2 - Subespecialidades: {hierarchy_analysis['nivel_2_subespecialidades']}")
    print(f"NÍVEL 3 - Assuntos Pais: {hierarchy_analysis['nivel_3_assuntos_pais']}")
    print(f"NÍVEL 3 - Assuntos Independentes: {hierarchy_analysis['nivel_3_assuntos_independentes']}")
    print(f"NÍVEL 4 - Assuntos Filhos (com hífen): {hierarchy_analysis['nivel_4_assuntos_filhos']}")
    print(f"⚠️  PROBLEMA - Pais Órfãos: {hierarchy_analysis['assuntos_pais_orfaos']}")
    print()
    
    # Comparar com HTML original
    with open('html_hierarchy_complete.json', 'r', encoding='utf-8') as f:
        html_hierarchy = json.load(f)
    
    print("📈 COMPARAÇÃO COM HTML ORIGINAL:")
    for level, items in html_hierarchy.items():
        print(f"HTML Nível {level}: {len(items)} itens")
    
    print()
    print("🎯 CONCLUSÃO:")
    if hierarchy_analysis['assuntos_pais_orfaos'] > 0:
        print(f"❌ PROBLEMA: {hierarchy_analysis['assuntos_pais_orfaos']} pais órfãos identificados")
        print("   Precisamos criar esses pais como subfiltros independentes no Firebase")
    
    total_nivels_merged = 0
    if hierarchy_analysis['nivel_1_especialidades'] > 0:
        total_nivels_merged = max(total_nivels_merged, 1)
    if hierarchy_analysis['nivel_2_subespecialidades'] > 0:
        total_nivels_merged = max(total_nivels_merged, 2)
    if hierarchy_analysis['nivel_3_assuntos_pais'] > 0 or hierarchy_analysis['nivel_3_assuntos_independentes'] > 0:
        total_nivels_merged = max(total_nivels_merged, 3)
    if hierarchy_analysis['nivel_4_assuntos_filhos'] > 0:
        total_nivels_merged = max(total_nivels_merged, 4)
    
    print(f"📊 MERGED: {total_nivels_merged} níveis capturados")
    print(f"📊 HTML ORIGINAL: {len(html_hierarchy)} níveis (0-{max(html_hierarchy.keys())})")
    
    if total_nivels_merged < len(html_hierarchy):
        print(f"⚠️  PERDEMOS {len(html_hierarchy) - total_nivels_merged} níveis na união!")
    else:
        print("✅ Todos os níveis foram preservados!")
    
    return hierarchy_analysis

if __name__ == "__main__":
    analyze_complete_merge_levels() 