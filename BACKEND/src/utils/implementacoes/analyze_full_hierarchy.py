#!/usr/bin/env python3
"""
Análise Hierárquica COMPLETA - 4 Níveis
Analisa: Especialidade > Subespecialidade > Assunto Pai > Assunto Filho
"""

import json
import re
from collections import defaultdict

def analyze_complete_hierarchy():
    print("🔍 ANÁLISE HIERÁRQUICA COMPLETA - 4 NÍVEIS")
    print("Especialidade > Subespecialidade > Assunto Pai > Assunto Filho")
    print("=" * 70)
    
    # Carregar o JSON
    with open('merged_filters.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Estrutura para análise completa
    hierarchy_analysis = {
        'total_especialidades': len(data),
        'total_subespecialidades': 0,
        'total_assuntos': 0,
        'assuntos_com_hierarquia': 0,  # Assuntos que são "Pai - Filho"
        'assuntos_simples': 0,         # Assuntos sem hierarquia interna
        'detalhes_por_especialidade': []
    }

    print(f"📊 ESTRUTURA GERAL:")
    print(f"Total de especialidades: {len(data)}")
    
    for especialidade in data:
        esp_name = especialidade.get('especialidade', '')
        subespecialidades = especialidade.get('subespecialidades', [])
        
        esp_details = {
            'nome': esp_name,
            'total_subespecialidades': len(subespecialidades),
            'subespecialidades_detalhes': []
        }
        
        hierarchy_analysis['total_subespecialidades'] += len(subespecialidades)
        
        for subesp in subespecialidades:
            subesp_name = subesp.get('nome', '')
            assuntos = subesp.get('assuntos', [])
            
            # Analisar hierarquia dentro dos assuntos
            assuntos_pais = set()  # Assuntos que são pais (aparecem antes do hífen)
            assuntos_filhos = []   # Assuntos que são filhos (têm hífen)
            assuntos_simples = []  # Assuntos sem hierarquia
            
            for assunto in assuntos:
                hierarchy_analysis['total_assuntos'] += 1
                
                if ' - ' in assunto:
                    # É um assunto filho
                    parts = assunto.split(' - ', 1)
                    pai = parts[0].strip()
                    filho = parts[1].strip()
                    
                    assuntos_pais.add(pai)
                    assuntos_filhos.append({
                        'pai': pai,
                        'filho': filho,
                        'completo': assunto
                    })
                    hierarchy_analysis['assuntos_com_hierarquia'] += 1
                else:
                    # É um assunto simples
                    assuntos_simples.append(assunto)
                    hierarchy_analysis['assuntos_simples'] += 1
            
            # Verificar se existem pais "órfãos" (que não têm entrada própria)
            pais_orfaos = []
            for pai in assuntos_pais:
                if pai not in assuntos:  # O pai não existe como assunto independente
                    pais_orfaos.append(pai)
            
            subesp_details = {
                'nome': subesp_name,
                'total_assuntos': len(assuntos),
                'assuntos_simples': len(assuntos_simples),
                'assuntos_com_hierarquia': len(assuntos_filhos),
                'pais_identificados': len(assuntos_pais),
                'pais_orfaos': pais_orfaos,
                'hierarquia_detalhada': {}
            }
            
            # Organizar hierarquia por pai
            for pai in assuntos_pais:
                filhos_do_pai = [af for af in assuntos_filhos if af['pai'] == pai]
                subesp_details['hierarquia_detalhada'][pai] = {
                    'existe_como_assunto': pai in assuntos,
                    'filhos': filhos_do_pai
                }
            
            esp_details['subespecialidades_detalhes'].append(subesp_details)
        
        hierarchy_analysis['detalhes_por_especialidade'].append(esp_details)

    # Relatório resumido
    print(f"Total de subespecialidades: {hierarchy_analysis['total_subespecialidades']}")
    print(f"Total de assuntos: {hierarchy_analysis['total_assuntos']}")
    print(f"Assuntos com hierarquia (Pai - Filho): {hierarchy_analysis['assuntos_com_hierarquia']}")
    print(f"Assuntos simples: {hierarchy_analysis['assuntos_simples']}")
    print()

    print("🎯 ESPECIALIDADES COM MAIS HIERARQUIA:")
    print("=" * 50)
    
    for esp_details in hierarchy_analysis['detalhes_por_especialidade']:
        total_hierarquico = sum(sub['assuntos_com_hierarquia'] for sub in esp_details['subespecialidades_detalhes'])
        
        if total_hierarquico > 0:
            print(f"\n📂 {esp_details['nome']}")
            print(f"   Total hierárquico: {total_hierarquico} assuntos")
            
            # Mostrar subespecialidades com hierarquia
            for sub in esp_details['subespecialidades_detalhes']:
                if sub['assuntos_com_hierarquia'] > 0:
                    print(f"   └─ {sub['nome']}: {sub['assuntos_com_hierarquia']} assuntos hierárquicos")
                    
                    # Mostrar os pais e quantos filhos têm
                    for pai, info in sub['hierarquia_detalhada'].items():
                        status = "✅ Existe" if info['existe_como_assunto'] else "❌ Órfão"
                        print(f"      ├─ {pai} ({len(info['filhos'])} filhos) {status}")
                        
                        # Mostrar alguns filhos como exemplo
                        for i, filho in enumerate(info['filhos'][:3]):
                            print(f"      │  ├─ {filho['filho']}")
                        if len(info['filhos']) > 3:
                            print(f"      │  └─ ... e mais {len(info['filhos'])-3} filhos")

    print("\n" + "=" * 70)
    print("🔧 PROBLEMAS IDENTIFICADOS PARA CORREÇÃO:")
    print("=" * 70)
    
    problemas_encontrados = 0
    
    for esp_details in hierarchy_analysis['detalhes_por_especialidade']:
        for sub in esp_details['subespecialidades_detalhes']:
            if sub['pais_orfaos']:
                problemas_encontrados += len(sub['pais_orfaos'])
                print(f"\n❌ {esp_details['nome']} > {sub['nome']}:")
                print(f"   Pais órfãos (precisam ser criados): {len(sub['pais_orfaos'])}")
                for pai_orfao in sub['pais_orfaos']:
                    filhos_count = len(sub['hierarquia_detalhada'][pai_orfao]['filhos'])
                    print(f"   ├─ '{pai_orfao}' ({filhos_count} filhos)")

    if problemas_encontrados == 0:
        print("✅ Nenhum problema encontrado! Todos os pais existem como assuntos independentes.")
    else:
        print(f"\n📊 RESUMO: {problemas_encontrados} pais órfãos encontrados")
        print("Estes pais precisam ser criados como subfiltros independentes no Firebase.")

    print("\n" + "=" * 70)
    print("✅ Análise da hierarquia completa concluída!")
    
    return hierarchy_analysis

if __name__ == "__main__":
    resultado = analyze_complete_hierarchy() 