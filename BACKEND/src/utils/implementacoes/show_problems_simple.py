#!/usr/bin/env python3
"""
Mostrar apenas os casos problematicos (pais orfaos) para revisao
"""

import json

def show_problems_only():
    print("CASOS PROBLEMATICOS IDENTIFICADOS")
    print("=" * 60)
    
    # Carregar o JSON
    with open('merged_filters.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    total_problemas = 0
    total_filhos_afetados = 0
    
    for especialidade in data:
        esp_name = especialidade.get('especialidade', '')
        
        for subesp in especialidade.get('subespecialidades', []):
            subesp_name = subesp.get('nome', '')
            assuntos = subesp.get('assuntos', [])
            
            # Analisar hierarquia dentro dos assuntos
            assuntos_pais = set()
            assuntos_filhos = []
            
            for assunto in assuntos:
                if ' - ' in assunto:
                    parts = assunto.split(' - ', 1)
                    pai = parts[0].strip()
                    filho = parts[1].strip()
                    
                    assuntos_pais.add(pai)
                    assuntos_filhos.append({
                        'pai': pai,
                        'filho': filho,
                        'nome_completo': assunto
                    })
            
            # Verificar pais órfãos
            pais_orfaos = []
            for pai in assuntos_pais:
                if pai not in assuntos:
                    pais_orfaos.append(pai)
            
            if pais_orfaos:
                print(f"\nX {esp_name} > {subesp_name}")
                print(f"   Pais orfaos: {len(pais_orfaos)}")
                
                for pai_orfao in pais_orfaos:
                    # Contar filhos deste pai
                    filhos_do_pai = [af for af in assuntos_filhos if af['pai'] == pai_orfao]
                    total_filhos_afetados += len(filhos_do_pai)
                    
                    print(f"\n   PASTA: '{pai_orfao}' -> {len(filhos_do_pai)} filhos:")
                    
                    # Mostrar todos os filhos se poucos, ou apenas alguns exemplos se muitos
                    if len(filhos_do_pai) <= 8:
                        for filho in filhos_do_pai:
                            print(f"      - {filho['filho']}")
                    else:
                        for filho in filhos_do_pai[:5]:
                            print(f"      - {filho['filho']}")
                        print(f"      - ... e mais {len(filhos_do_pai)-5} filhos")
                        print(f"      TOTAL: {len(filhos_do_pai)} filhos")
                
                total_problemas += len(pais_orfaos)

    print(f"\n" + "=" * 60)
    print(f"RESUMO COMPLETO:")
    print(f"Total de pais orfaos: {total_problemas}")
    print(f"Total de filhos afetados: {total_filhos_afetados}")
    print("=" * 60)
    
    print(f"\nO QUE O SCRIPT FARA:")
    print(f"1. Criar {total_problemas} novos subfiltros como 'pais'")
    print(f"2. Reorganizar {total_filhos_afetados} subfiltros como 'filhos'")
    print(f"3. Estabelecer hierarquia de 4 niveis correta")
    
    print(f"\nATENCAO:")
    print("- Todos os pais orfaos serao criados como subfiltros independentes")
    print("- Os filhos serao conectados aos seus respectivos pais")
    print("- A estrutura final sera: Especialidade > Subespecialidade > Pai > Filho")
    
    return total_problemas, total_filhos_afetados

if __name__ == "__main__":
    show_problems_only() 