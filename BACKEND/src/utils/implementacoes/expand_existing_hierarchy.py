#!/usr/bin/env python3
"""
Expande a hierarquia existente (estrategia_filters_extracted.json) 
adicionando os novos filtros do HTML de forma inteligente
"""

import json
import re
from difflib import SequenceMatcher

def load_data():
    """Carrega os dados existentes"""
    # Carregar hierarquia existente (correta)
    with open('estrategia_filters_extracted.json', 'r', encoding='utf-8') as f:
        existing_hierarchy = json.load(f)
    
    # Carregar merge completo (com todos os filtros)
    with open('complete_merge.json', 'r', encoding='utf-8') as f:
        complete_merge = json.load(f)
    
    return existing_hierarchy, complete_merge

def normalize_text(text):
    """Normaliza texto para comparação"""
    return re.sub(r'[^\w\s]', '', text.lower().strip())

def similarity(a, b):
    """Calcula similaridade entre duas strings"""
    return SequenceMatcher(None, normalize_text(a), normalize_text(b)).ratio()

def find_best_match(item_name, candidates, threshold=0.7):
    """Encontra a melhor correspondência para um item"""
    best_match = None
    best_score = 0
    
    for candidate in candidates:
        score = similarity(item_name, candidate)
        if score > best_score and score >= threshold:
            best_score = score
            best_match = candidate
    
    return best_match, best_score

def categorize_medical_content(item_name):
    """Categoriza conteúdo médico baseado em padrões conhecidos"""
    item_lower = item_name.lower()
    
    # Padrões de categorização médica
    categories = {
        'cardiologia': ['cardio', 'coração', 'arritmia', 'hipertensão', 'insuficiência cardíaca'],
        'pneumologia': ['pneumo', 'pulmão', 'respirat', 'asma', 'dpoc', 'tosse'],
        'gastroenterologia': ['gastro', 'estômago', 'intestin', 'digestão', 'gastrite'],
        'neurologia': ['neuro', 'cérebro', 'cabeça', 'coma', 'epilepsia', 'avc'],
        'endocrinologia': ['endocrin', 'diabetes', 'tireoide', 'hormônio', 'metabol'],
        'dermatologia': ['dermato', 'pele', 'lesão', 'eczema', 'psoríase'],
        'infectologia': ['infect', 'febre', 'vírus', 'bactéria', 'antibiótico'],
        'reumatologia': ['reumato', 'artrite', 'articulação', 'dor'],
        'hematologia': ['hemato', 'sangue', 'anemia', 'leucemia'],
        'nefrologia': ['nefro', 'rim', 'urina', 'renal'],
        'cirurgia': ['cirurg', 'operação', 'trauma', 'fratura', 'sutura'],
        'pediatria': ['pediatr', 'criança', 'infantil', 'neonato', 'recém-nascido'],
        'ginecologia': ['gineco', 'útero', 'ovário', 'menstruação', 'mama'],
        'obstetrícia': ['obstetr', 'gravidez', 'parto', 'gestação', 'pré-natal'],
        'psiquiatria': ['psiquiatr', 'mental', 'depressão', 'ansiedade', 'esquizofrenia'],
        'ortopedia': ['ortoped', 'osso', 'fratura', 'articulação', 'músculo'],
        'oftalmologia': ['oftalmo', 'olho', 'visão', 'retina', 'glaucoma'],
        'otorrinolaringologia': ['otorrino', 'ouvido', 'nariz', 'garganta', 'sinusite'],
        'urologia': ['urolog', 'próstata', 'bexiga', 'uretral'],
        'medicina_preventiva': ['preventiv', 'sus', 'epidemio', 'saúde pública', 'vacinação']
    }
    
    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword in item_lower:
                return category
    
    return 'outros'

def expand_hierarchy():
    """Expande a hierarquia existente com novos filtros"""
    print("🔄 EXPANDINDO HIERARQUIA EXISTENTE")
    print("=" * 50)
    
    existing_hierarchy, complete_merge = load_data()
    
    # Criar mapeamento dos filtros existentes
    existing_items = set()
    
    def collect_existing_items(items, level_name=""):
        """Coleta todos os itens existentes recursivamente"""
        for item in items:
            if isinstance(item, dict):
                if 'especialidade' in item:
                    # Nível especialidade
                    existing_items.add(normalize_text(item['especialidade']))
                    if 'subespecialidades' in item:
                        for sub in item['subespecialidades']:
                            existing_items.add(normalize_text(sub['nome']))
                            if 'assuntos' in sub:
                                for assunto in sub['assuntos']:
                                    existing_items.add(normalize_text(assunto))
                elif 'nome' in item:
                    existing_items.add(normalize_text(item['nome']))
                elif 'name' in item:
                    existing_items.add(normalize_text(item['name']))
            elif isinstance(item, str):
                existing_items.add(normalize_text(item))
    
    collect_existing_items(existing_hierarchy)
    
    print(f"📊 Itens existentes: {len(existing_items)}")
    
    # Encontrar itens novos do complete_merge
    new_items = []
    total_merge_items = 0
    
    for filter_item in complete_merge:
        if 'name' in filter_item:
            total_merge_items += 1
            normalized_name = normalize_text(filter_item['name'])
            if normalized_name not in existing_items:
                new_items.append(filter_item)
    
    print(f"📊 Total merge: {total_merge_items}")
    print(f"🆕 Novos itens encontrados: {len(new_items)}")
    
    # Categorizar e adicionar novos itens
    expanded_hierarchy = existing_hierarchy.copy()
    
    # Criar mapa de especialidades para facilitar adições
    especialidades_map = {}
    for esp in expanded_hierarchy:
        especialidades_map[normalize_text(esp['especialidade'])] = esp
    
    added_count = 0
    
    for new_item in new_items:
        item_name = new_item['name']
        category = categorize_medical_content(item_name)
        
        # Tentar encontrar especialidade correspondente
        target_especialidade = None
        
        if category == 'cardiologia':
            target_especialidade = 'clínica médica'
        elif category in ['pneumologia', 'gastroenterologia', 'neurologia', 'endocrinologia', 
                         'dermatologia', 'infectologia', 'reumatologia', 'hematologia', 'nefrologia']:
            target_especialidade = 'clínica médica'
        elif category == 'cirurgia':
            target_especialidade = 'cirurgia'
        elif category == 'pediatria':
            target_especialidade = 'pediatria'
        elif category == 'ginecologia':
            target_especialidade = 'ginecologia'
        elif category == 'obstetrícia':
            target_especialidade = 'obstetrícia'
        elif category == 'medicina_preventiva':
            target_especialidade = 'medicina preventiva'
        else:
            target_especialidade = 'outros'
        
        # Encontrar a especialidade no mapa
        esp_key = normalize_text(target_especialidade)
        if esp_key in especialidades_map:
            especialidade = especialidades_map[esp_key]
            
            # Tentar encontrar subespecialidade correspondente
            subesp_encontrada = None
            
            if category != 'outros':
                # Procurar subespecialidade por similaridade
                for sub in especialidade['subespecialidades']:
                    if similarity(category, sub['nome']) > 0.6 or category.lower() in sub['nome'].lower():
                        subesp_encontrada = sub
                        break
            
            if subesp_encontrada:
                # Adicionar como assunto na subespecialidade
                if item_name not in subesp_encontrada['assuntos']:
                    subesp_encontrada['assuntos'].append(item_name)
                    added_count += 1
                    print(f"  + Adicionado '{item_name}' em {especialidade['especialidade']} > {subesp_encontrada['nome']}")
            else:
                # Criar nova subespecialidade ou adicionar em "Geral"
                geral_sub = None
                for sub in especialidade['subespecialidades']:
                    if 'geral' in sub['nome'].lower() or 'básica' in sub['nome'].lower():
                        geral_sub = sub
                        break
                
                if geral_sub:
                    if item_name not in geral_sub['assuntos']:
                        geral_sub['assuntos'].append(item_name)
                        added_count += 1
                        print(f"  + Adicionado '{item_name}' em {especialidade['especialidade']} > {geral_sub['nome']}")
                else:
                    # Criar subespecialidade "Outros" na especialidade
                    outros_sub = {
                        'nome': 'Outros',
                        'assuntos': [item_name]
                    }
                    especialidade['subespecialidades'].append(outros_sub)
                    added_count += 1
                    print(f"  + Criada subesp 'Outros' com '{item_name}' em {especialidade['especialidade']}")
    
    print(f"\n✅ Itens adicionados: {added_count}")
    
    # Salvar hierarquia expandida
    with open('expanded_hierarchy.json', 'w', encoding='utf-8') as f:
        json.dump(expanded_hierarchy, f, ensure_ascii=False, indent=2)
    
    # Calcular estatísticas finais
    def count_items_recursive(hierarchy):
        """Conta itens recursivamente"""
        total = 0
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
    
    stats = count_items_recursive(expanded_hierarchy)
    
    print(f"\n📊 HIERARQUIA FINAL:")
    print(f"   Total: {stats['total']} itens")
    print(f"   Especialidades: {stats['especialidades']}")
    print(f"   Subespecialidades: {stats['subespecialidades']}")
    print(f"   Assuntos: {stats['assuntos']}")
    
    print(f"\n✅ Hierarquia expandida salva em: expanded_hierarchy.json")
    
    return expanded_hierarchy

if __name__ == "__main__":
    expand_hierarchy() 