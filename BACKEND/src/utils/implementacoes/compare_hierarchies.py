#!/usr/bin/env python3
"""
Compara as hierarquias estrategia_filters_extracted.json e complete_merge.json
para identificar diferenças e criar uma hierarquia unificada
"""

import json
import re
from difflib import SequenceMatcher

def normalize_text(text):
    """Normaliza texto para comparação"""
    return re.sub(r'[^\w\s]', '', text.lower().strip())

def load_hierarchies():
    """Carrega as duas hierarquias"""
    with open('estrategia_filters_extracted.json', 'r', encoding='utf-8') as f:
        estrategia = json.load(f)
    
    with open('complete_merge.json', 'r', encoding='utf-8') as f:
        complete = json.load(f)
    
    return estrategia, complete

def extract_all_items(hierarchy, prefix=""):
    """Extrai todos os itens de uma hierarquia"""
    items = set()
    
    for esp in hierarchy:
        esp_name = esp['especialidade']
        items.add(normalize_text(esp_name))
        
        for sub in esp.get('subespecialidades', []):
            sub_name = sub['nome']
            items.add(normalize_text(sub_name))
            
            for assunto in sub.get('assuntos', []):
                items.add(normalize_text(assunto))
    
    return items

def find_new_items():
    """Encontra itens que estão no complete_merge mas não no estrategia"""
    print("🔄 COMPARANDO HIERARQUIAS")
    print("=" * 50)
    
    estrategia, complete = load_hierarchies()
    
    # Extrair todos os itens de cada hierarquia
    estrategia_items = extract_all_items(estrategia)
    complete_items = extract_all_items(complete)
    
    print(f"📊 Estratégia: {len(estrategia_items)} itens únicos")
    print(f"📊 Complete: {len(complete_items)} itens únicos")
    
    # Encontrar diferenças
    only_in_complete = complete_items - estrategia_items
    only_in_estrategia = estrategia_items - complete_items
    common_items = estrategia_items & complete_items
    
    print(f"📊 Comum: {len(common_items)} itens")
    print(f"🆕 Só no Complete: {len(only_in_complete)} itens")
    print(f"⚠️  Só na Estratégia: {len(only_in_estrategia)} itens")
    
    # Mostrar alguns exemplos
    if only_in_complete:
        print(f"\n🔍 EXEMPLOS DE ITENS NOVOS NO COMPLETE:")
        for i, item in enumerate(sorted(only_in_complete)[:10]):
            # Encontrar o item original (não normalizado) no complete
            original = find_original_text(item, complete)
            print(f"   {i+1}. {original}")
        if len(only_in_complete) > 10:
            print(f"   ... e mais {len(only_in_complete) - 10} itens")
    
    # Criar hierarquia unificada
    print(f"\n🏗️  CRIANDO HIERARQUIA UNIFICADA...")
    unified = create_unified_hierarchy(estrategia, complete, only_in_complete)
    
    return unified

def find_original_text(normalized_text, hierarchy):
    """Encontra o texto original a partir do texto normalizado"""
    for esp in hierarchy:
        if normalize_text(esp['especialidade']) == normalized_text:
            return esp['especialidade']
        
        for sub in esp.get('subespecialidades', []):
            if normalize_text(sub['nome']) == normalized_text:
                return sub['nome']
            
            for assunto in sub.get('assuntos', []):
                if normalize_text(assunto) == normalized_text:
                    return assunto
    
    return normalized_text

def create_unified_hierarchy(estrategia_base, complete_source, new_items):
    """Cria hierarquia unificada baseada na estratégia + itens novos do complete"""
    unified = json.loads(json.dumps(estrategia_base))  # Deep copy
    
    added_count = 0
    
    # Para cada item novo, encontrar onde ele está no complete_source
    for new_item_norm in new_items:
        original_text = find_original_text(new_item_norm, complete_source)
        location = find_item_location(original_text, complete_source)
        
        if location:
            esp_name, sub_name, is_assunto = location
            
            # Encontrar a especialidade correspondente no unified
            esp_found = None
            for esp in unified:
                if normalize_text(esp['especialidade']) == normalize_text(esp_name):
                    esp_found = esp
                    break
            
            if esp_found:
                if is_assunto:
                    # É um assunto, adicionar à subespecialidade
                    sub_found = None
                    for sub in esp_found['subespecialidades']:
                        if normalize_text(sub['nome']) == normalize_text(sub_name):
                            sub_found = sub
                            break
                    
                    if sub_found:
                        if original_text not in sub_found['assuntos']:
                            sub_found['assuntos'].append(original_text)
                            added_count += 1
                            print(f"  + {original_text} → {esp_name} > {sub_name}")
                    else:
                        print(f"  ⚠️  Subesp não encontrada: {sub_name} em {esp_name}")
                else:
                    # É uma subespecialidade
                    sub_exists = any(normalize_text(sub['nome']) == normalize_text(original_text) 
                                   for sub in esp_found['subespecialidades'])
                    
                    if not sub_exists:
                        # Buscar a subespecialidade completa no complete_source
                        complete_sub = find_complete_subspecialty(esp_name, original_text, complete_source)
                        if complete_sub:
                            esp_found['subespecialidades'].append(complete_sub)
                            added_count += 1
                            print(f"  + Subesp: {original_text} → {esp_name}")
            else:
                print(f"  ⚠️  Especialidade não encontrada: {esp_name}")
    
    print(f"\n✅ Itens adicionados: {added_count}")
    
    # Salvar hierarquia unificada
    with open('unified_hierarchy.json', 'w', encoding='utf-8') as f:
        json.dump(unified, f, ensure_ascii=False, indent=2)
    
    # Calcular estatísticas
    stats = calculate_stats(unified)
    print(f"\n📊 HIERARQUIA UNIFICADA:")
    print(f"   Total: {stats['total']} itens")
    print(f"   Especialidades: {stats['especialidades']}")
    print(f"   Subespecialidades: {stats['subespecialidades']}")
    print(f"   Assuntos: {stats['assuntos']}")
    
    print(f"\n✅ Hierarquia unificada salva em: unified_hierarchy.json")
    
    return unified

def find_item_location(item_text, hierarchy):
    """Encontra a localização de um item na hierarquia"""
    for esp in hierarchy:
        esp_name = esp['especialidade']
        
        # Verificar se é uma especialidade
        if normalize_text(esp_name) == normalize_text(item_text):
            return (esp_name, None, False)
        
        for sub in esp.get('subespecialidades', []):
            sub_name = sub['nome']
            
            # Verificar se é uma subespecialidade
            if normalize_text(sub_name) == normalize_text(item_text):
                return (esp_name, sub_name, False)
            
            # Verificar se é um assunto
            for assunto in sub.get('assuntos', []):
                if normalize_text(assunto) == normalize_text(item_text):
                    return (esp_name, sub_name, True)
    
    return None

def find_complete_subspecialty(esp_name, sub_name, hierarchy):
    """Encontra uma subespecialidade completa na hierarquia"""
    for esp in hierarchy:
        if normalize_text(esp['especialidade']) == normalize_text(esp_name):
            for sub in esp.get('subespecialidades', []):
                if normalize_text(sub['nome']) == normalize_text(sub_name):
                    return sub
    return None

def calculate_stats(hierarchy):
    """Calcula estatísticas da hierarquia"""
    especialidades = len(hierarchy)
    subespecialidades = 0
    assuntos = 0
    
    for esp in hierarchy:
        subs = esp.get('subespecialidades', [])
        subespecialidades += len(subs)
        
        for sub in subs:
            assuntos += len(sub.get('assuntos', []))
    
    total = especialidades + subespecialidades + assuntos
    
    return {
        'total': total,
        'especialidades': especialidades,
        'subespecialidades': subespecialidades,
        'assuntos': assuntos
    }

if __name__ == "__main__":
    find_new_items() 