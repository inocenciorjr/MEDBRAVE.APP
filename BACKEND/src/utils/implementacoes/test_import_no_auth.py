#!/usr/bin/env python3
"""
Script de teste para verificar a estrutura dos dados mesclados
Mostra como seria a importação sem conectar com a API
"""

import json
from typing import Dict, List

def analyze_merged_data():
    """Analisa os dados mesclados e mostra estatísticas."""
    
    print("🔍 ANÁLISE DOS DADOS MESCLADOS")
    print("="*50)
    
    # Carregar dados mesclados
    with open("merged_filters.json", "r", encoding="utf-8") as f:
        merged_data = json.load(f)
    
    # Estatísticas gerais
    total_especialidades = len(merged_data)
    total_subespecialidades = sum(len(esp["subespecialidades"]) for esp in merged_data)
    total_assuntos = sum(
        len(sub["assuntos"]) 
        for esp in merged_data 
        for sub in esp["subespecialidades"]
    )
    
    print(f"📊 ESTATÍSTICAS GERAIS:")
    print(f"   • Especialidades: {total_especialidades}")
    print(f"   • Subespecialidades: {total_subespecialidades}")
    print(f"   • Assuntos: {total_assuntos}")
    print()
    
    # Análise por especialidade
    print("📚 DETALHES POR ESPECIALIDADE:")
    print("-"*50)
    
    for i, esp in enumerate(merged_data, 1):
        esp_name = esp["especialidade"]
        esp_subs = len(esp["subespecialidades"])
        esp_assuntos = sum(len(sub["assuntos"]) for sub in esp["subespecialidades"])
        
        print(f"{i:2}. {esp_name}")
        print(f"     Subespecialidades: {esp_subs}")
        print(f"     Assuntos: {esp_assuntos}")
        
        # Mostrar subespecialidades com mais assuntos
        subs_com_assuntos = [
            (sub["nome"], len(sub["assuntos"])) 
            for sub in esp["subespecialidades"] 
            if sub["assuntos"]
        ]
        
        if subs_com_assuntos:
            subs_com_assuntos.sort(key=lambda x: x[1], reverse=True)
            print(f"     Principais subs:")
            for sub_name, sub_count in subs_com_assuntos[:3]:
                print(f"       - {sub_name}: {sub_count} assuntos")
        print()
    
    # Verificar quais especialidades ganharam mais conteúdo
    print("🆕 ESPECIALIDADES COM MAIS NOVOS ASSUNTOS:")
    print("-"*50)
    
    especialidades_rankeadas = [
        (esp["especialidade"], sum(len(sub["assuntos"]) for sub in esp["subespecialidades"]))
        for esp in merged_data
    ]
    especialidades_rankeadas.sort(key=lambda x: x[1], reverse=True)
    
    for esp_name, count in especialidades_rankeadas[:5]:
        print(f"   • {esp_name}: {count} assuntos")
    
    print()
    print("✅ Análise concluída! Os dados estão prontos para importação.")
    print("📝 Para importar, resolva primeiro a questão da autenticação Firebase.")

if __name__ == "__main__":
    try:
        analyze_merged_data()
    except Exception as e:
        print(f"❌ Erro na análise: {e}") 