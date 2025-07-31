#!/usr/bin/env python3
"""
Script para extrair filtros hierárquicos de HTML e converter para JSON
compatível com o formato do estrategia_filters_extracted.json
"""

import re
import json
from typing import List, Dict, Any

def extract_text_from_html(html_content: str) -> List[Dict[str, Any]]:
    """
    Extrai os nomes dos filtros e subfiltros do HTML usando regex.
    """
    # Padrão para extrair padding-left e texto
    padding_pattern = r'style="padding-left: (\d+)px;"[^>]*>.*?<div class="ui-w-full ui-text-left">([^<]+)</div>'
    padding_matches = re.findall(padding_pattern, html_content, re.DOTALL)
    
    print(f"🔍 Encontradas {len(padding_matches)} entradas com hierarquia")
    
    # Estrutura para armazenar hierarquia
    hierarchy = []
    current_especialidade = None
    current_subespecialidade = None
    
    for padding_str, text in padding_matches:
        try:
            padding = int(padding_str)
            text = text.strip()
            
            if not text:
                continue
                
            print(f"  📏 Padding: {padding}px - Texto: '{text[:50]}{'...' if len(text) > 50 else ''}'")
            
            if padding == 0:  # Especialidade (nível raiz)
                current_especialidade = {
                    "especialidade": text,
                    "subespecialidades": []
                }
                hierarchy.append(current_especialidade)
                current_subespecialidade = None
                print(f"    ✅ Nova especialidade: {text}")
                
            elif padding == 40:  # Subespecialidade (nível 1)
                if current_especialidade:
                    current_subespecialidade = {
                        "nome": text,
                        "assuntos": []
                    }
                    current_especialidade["subespecialidades"].append(current_subespecialidade)
                    print(f"    📚 Nova subespecialidade: {text}")
                    
            elif padding >= 80:  # Assuntos (níveis 2+)
                if current_subespecialidade:
                    current_subespecialidade["assuntos"].append(text)
                    print(f"    📝 Novo assunto: {text}")
                    
        except Exception as e:
            print(f"    ❌ Erro processando entrada: {e}")
            continue
    
    return hierarchy

def merge_with_existing_data(new_data: List[Dict], existing_file_path: str) -> List[Dict]:
    """
    Faz merge inteligente dos novos dados com os existentes.
    """
    # Carregar dados existentes
    try:
        with open(existing_file_path, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
        print(f"📖 Carregados dados existentes: {len(existing_data)} especialidades")
    except FileNotFoundError:
        print(f"📄 Arquivo {existing_file_path} não encontrado, usando apenas novos dados")
        return new_data
    except Exception as e:
        print(f"❌ Erro lendo arquivo existente: {e}")
        return new_data
    
    # Criar dicionário para facilitar busca por especialidade
    existing_dict = {item["especialidade"]: item for item in existing_data}
    
    # Contadores
    novas_especialidades = 0
    novas_subespecialidades = 0
    novos_assuntos = 0
    
    # Processar novos dados
    for new_especialidade in new_data:
        esp_name = new_especialidade["especialidade"]
        
        if esp_name in existing_dict:
            # Especialidade já existe - fazer merge das subespecialidades
            print(f"🔄 Fazendo merge da especialidade existente: {esp_name}")
            existing_esp = existing_dict[esp_name]
            existing_sub_dict = {sub["nome"]: sub for sub in existing_esp["subespecialidades"]}
            
            for new_sub in new_especialidade["subespecialidades"]:
                sub_name = new_sub["nome"]
                
                if sub_name in existing_sub_dict:
                    # Subespecialidade já existe - fazer merge dos assuntos
                    existing_sub = existing_sub_dict[sub_name]
                    existing_assuntos = set(existing_sub["assuntos"])
                    
                    # Adicionar novos assuntos que não existem
                    for assunto in new_sub["assuntos"]:
                        if assunto not in existing_assuntos:
                            existing_sub["assuntos"].append(assunto)
                            novos_assuntos += 1
                else:
                    # Nova subespecialidade - adicionar
                    existing_esp["subespecialidades"].append(new_sub)
                    novas_subespecialidades += 1
                    novos_assuntos += len(new_sub["assuntos"])
        else:
            # Nova especialidade - adicionar
            existing_data.append(new_especialidade)
            novas_especialidades += 1
            novas_subespecialidades += len(new_especialidade["subespecialidades"])
            novos_assuntos += sum(len(sub["assuntos"]) for sub in new_especialidade["subespecialidades"])
    
    print(f"✅ Merge concluído:")
    print(f"  🆕 Novas especialidades: {novas_especialidades}")
    print(f"  📚 Novas subespecialidades: {novas_subespecialidades}")
    print(f"  📝 Novos assuntos: {novos_assuntos}")
    
    return existing_data

def clean_and_validate_data(data: List[Dict]) -> List[Dict]:
    """
    Limpa e valida os dados extraídos.
    """
    cleaned_data = []
    
    for especialidade in data:
        if not especialidade.get("especialidade"):
            continue
            
        cleaned_esp = {
            "especialidade": especialidade["especialidade"].strip(),
            "subespecialidades": []
        }
        
        for subespecialidade in especialidade.get("subespecialidades", []):
            if not subespecialidade.get("nome"):
                continue
                
            cleaned_sub = {
                "nome": subespecialidade["nome"].strip(),
                "assuntos": []
            }
            
            # Limpar e dedplicar assuntos
            assuntos_set = set()
            for assunto in subespecialidade.get("assuntos", []):
                if assunto and assunto.strip():
                    assuntos_set.add(assunto.strip())
            
            cleaned_sub["assuntos"] = sorted(list(assuntos_set))
            cleaned_esp["subespecialidades"].append(cleaned_sub)
        
        cleaned_data.append(cleaned_esp)
    
    return cleaned_data

def main():
    print("🚀 Iniciando conversão de HTML para JSON...")
    
    html_file_path = "filters novo.txt"
    existing_json_path = "estrategia_filters_extracted.json"
    output_file_path = "merged_filters.json"
    
    print("🔄 Lendo arquivo HTML...")
    try:
        with open(html_file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        print(f"📄 Arquivo HTML carregado: {len(html_content)} caracteres")
    except FileNotFoundError:
        print(f"❌ Arquivo {html_file_path} não encontrado!")
        return False
    except Exception as e:
        print(f"❌ Erro lendo arquivo HTML: {e}")
        return False
    
    print("🔍 Extraindo dados do HTML...")
    try:
        extracted_data = extract_text_from_html(html_content)
    except Exception as e:
        print(f"❌ Erro extraindo dados: {e}")
        return False
    
    if not extracted_data:
        print("❌ Nenhum dado foi extraído do HTML!")
        return False
    
    print(f"✅ Extraídas {len(extracted_data)} especialidades do HTML")
    
    print("🧹 Limpando e validando dados...")
    try:
        cleaned_data = clean_and_validate_data(extracted_data)
    except Exception as e:
        print(f"❌ Erro limpando dados: {e}")
        return False
    
    print("🔀 Fazendo merge com dados existentes...")
    try:
        merged_data = merge_with_existing_data(cleaned_data, existing_json_path)
    except Exception as e:
        print(f"❌ Erro no merge: {e}")
        return False
    
    print("💾 Salvando dados mesclados...")
    try:
        with open(output_file_path, 'w', encoding='utf-8') as f:
            json.dump(merged_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"❌ Erro salvando arquivo: {e}")
        return False
    
    # Estatísticas
    total_especialidades = len(merged_data)
    total_subespecialidades = sum(len(esp["subespecialidades"]) for esp in merged_data)
    total_assuntos = sum(
        len(sub["assuntos"]) 
        for esp in merged_data 
        for sub in esp["subespecialidades"]
    )
    
    print("\n" + "="*50)
    print("📊 RESUMO DO MERGE")
    print("="*50)
    print(f"📁 Arquivo gerado: {output_file_path}")
    print(f"🎓 Total de Especialidades: {total_especialidades}")
    print(f"📚 Total de Subespecialidades: {total_subespecialidades}")
    print(f"📝 Total de Assuntos: {total_assuntos}")
    print("="*50)
    
    # Mostrar algumas especialidades para verificação
    print("\n🔍 Primeiras 3 especialidades processadas:")
    for i, esp in enumerate(merged_data[:3]):
        print(f"  {i+1}. {esp['especialidade']} ({len(esp['subespecialidades'])} subespecialidades)")
        if esp['subespecialidades']:
            print(f"     - Exemplo: {esp['subespecialidades'][0]['nome']}")
    
    print(f"\n✅ Processamento concluído! Use o arquivo '{output_file_path}' com o importer.")
    return True

if __name__ == "__main__":
    try:
        success = main()
        exit(0 if success else 1)
    except Exception as e:
        print(f"💥 Erro fatal: {e}")
        import traceback
        traceback.print_exc()
        exit(1) 