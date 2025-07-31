#!/usr/bin/env python3
"""
Script final para organizar a hierarquia completa de 6 níveis no Firestore
Baseado na final_complete_hierarchy.json (HTML + Estrategia merged)
"""

import json
import uuid
from datetime import datetime

def generate_unique_id():
    """Gera ID único baseado em timestamp + UUID"""
    timestamp = int(datetime.now().timestamp() * 1000)
    unique_suffix = str(uuid.uuid4())[:8]
    return f"{timestamp}_{unique_suffix}"

def normalize_name(name):
    """Normaliza nome para evitar problemas"""
    return name.strip() if name else ""

def organize_firestore_final():
    print("🔄 ORGANIZANDO HIERARQUIA FINAL NO FIRESTORE")
    print("=" * 60)
    
    # Carregar hierarquia final merged
    with open('final_complete_hierarchy.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    hierarchy = data['hierarchy']
    stats = data['stats']
    
    print(f"📊 Hierarquia carregada:")
    print(f"   Especialidades: {stats['especialidades']}")
    print(f"   Subespecialidades: {stats['subespecialidades']}")
    print(f"   Subgrupos: {stats['subgrupos']}")
    print(f"   Tópicos: {stats['topicos']}")
    print(f"   Subtópicos: {stats['subtopicos']}")
    print(f"   Detalhes: {stats['detalhes']}")
    print(f"   Total: {stats['total']} itens")
    
    # Lista final para Firestore
    firestore_items = []
    
    def add_firestore_item(name, level, parent_id=None, subcategories=None):
        """Adiciona item formatado para Firestore"""
        item = {
            'id': generate_unique_id(),
            'name': normalize_name(name),
            'level': level,
            'parentId': parent_id,
            'subcategories': subcategories or [],
            'isExpanded': False,
            'createdAt': datetime.now().isoformat(),
            'source': 'final_6_level_hierarchy'
        }
        firestore_items.append(item)
        return item['id']
    
    # Processar hierarquia recursivamente
    for especialidade in hierarchy:
        esp_name = especialidade.get('name', '')
        esp_id = add_firestore_item(esp_name, 0)
        
        print(f"📋 Processando especialidade: {esp_name}")
        
        # Subespecialidades (Nível 1)
        for subesp in especialidade.get('subespecialidades', []):
            subesp_name = subesp.get('name', '')
            subesp_id = add_firestore_item(subesp_name, 1, esp_id)
            
            print(f"  📂 Subespecialidade: {subesp_name}")
            
            # Subgrupos (Nível 2)
            for subgrupo in subesp.get('subgrupos', []):
                subgrupo_name = subgrupo.get('name', '')
                subgrupo_id = add_firestore_item(subgrupo_name, 2, subesp_id)
                
                print(f"    📁 Subgrupo: {subgrupo_name}")
                
                # Tópicos (Nível 3)
                for topico in subgrupo.get('topicos', []):
                    topico_name = topico.get('name', '')
                    topico_id = add_firestore_item(topico_name, 3, subgrupo_id)
                    
                    print(f"      📄 Tópico: {topico_name}")
                    
                    # Subtópicos (Nível 4)
                    for subtopico in topico.get('subtopicos', []):
                        subtopico_name = subtopico.get('name', '')
                        subtopico_id = add_firestore_item(subtopico_name, 4, topico_id)
                        
                        print(f"        📃 Subtópico: {subtopico_name}")
                        
                        # Detalhes (Nível 5)
                        for detalhe in subtopico.get('detalhes', []):
                            detalhe_name = detalhe.get('name', '')
                            detalhe_id = add_firestore_item(detalhe_name, 5, subtopico_id)
                            
                            print(f"          📋 Detalhe: {detalhe_name}")
    
    # Calcular estatísticas finais
    level_counts = {}
    for item in firestore_items:
        level = item['level']
        level_counts[level] = level_counts.get(level, 0) + 1
    
    print(f"\n📊 HIERARQUIA FIRESTORE ORGANIZADA:")
    print(f"   Nível 0 (Especialidades): {level_counts.get(0, 0)}")
    print(f"   Nível 1 (Subespecialidades): {level_counts.get(1, 0)}")
    print(f"   Nível 2 (Subgrupos): {level_counts.get(2, 0)}")
    print(f"   Nível 3 (Tópicos): {level_counts.get(3, 0)}")
    print(f"   Nível 4 (Subtópicos): {level_counts.get(4, 0)}")
    print(f"   Nível 5 (Detalhes): {level_counts.get(5, 0)}")
    print(f"   TOTAL: {len(firestore_items)} itens")
    
    # Estrutura final para Firebase
    firebase_structure = {
        'items': firestore_items,
        'metadata': {
            'totalItems': len(firestore_items),
            'levels': 6,
            'levelCounts': level_counts,
            'source': 'html_6_levels + estrategia_intelligent_merge',
            'generatedAt': datetime.now().isoformat(),
            'version': '1.0.0'
        },
        'stats': {
            'originalHtml': 1107,
            'originalEstrategia': 548,
            'finalMerged': len(firestore_items),
            'itemsAdded': len(firestore_items) - 1107
        }
    }
    
    # Salvar para importação no Firebase
    with open('firestore_final_import.json', 'w', encoding='utf-8') as f:
        json.dump(firebase_structure, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Estrutura Firestore salva em: firestore_final_import.json")
    print(f"📊 Pronto para importação no Firebase!")
    
    # Criar script de validação
    create_validation_script(firestore_items)
    
    return firebase_structure

def create_validation_script(items):
    """Cria script para validar a hierarquia antes da importação"""
    
    validation_script = '''#!/usr/bin/env python3
"""
Script de validação da hierarquia antes da importação no Firebase
"""

import json

def validate_hierarchy():
    print("🔍 VALIDANDO HIERARQUIA FIRESTORE")
    print("=" * 50)
    
    with open('firestore_final_import.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    
    # Validações
    orphans = []
    duplicates = []
    invalid_levels = []
    
    # Criar mapa de IDs
    id_map = {item['id']: item for item in items}
    names_by_level = {}
    
    for item in items:
        level = item['level']
        name = item['name']
        parent_id = item['parentId']
        
        # Validar nível
        if level not in [0, 1, 2, 3, 4, 5]:
            invalid_levels.append(item)
        
        # Validar órfãos (exceto nível 0)
        if level > 0 and parent_id and parent_id not in id_map:
            orphans.append(item)
        
        # Validar duplicatas por nível
        if level not in names_by_level:
            names_by_level[level] = set()
        
        if name in names_by_level[level]:
            duplicates.append(item)
        else:
            names_by_level[level].add(name)
    
    # Relatório
    print(f"📊 Total de itens: {len(items)}")
    print(f"⚠️  Órfãos encontrados: {len(orphans)}")
    print(f"⚠️  Duplicatas encontradas: {len(duplicates)}")
    print(f"⚠️  Níveis inválidos: {len(invalid_levels)}")
    
    if orphans:
        print("\\n🚨 ÓRFÃOS:")
        for orphan in orphans[:5]:
            print(f"   - {orphan['name']} (nível {orphan['level']})")
    
    if duplicates:
        print("\\n🚨 DUPLICATAS:")
        for dup in duplicates[:5]:
            print(f"   - {dup['name']} (nível {dup['level']})")
    
    is_valid = len(orphans) == 0 and len(duplicates) == 0 and len(invalid_levels) == 0
    
    if is_valid:
        print("\\n✅ HIERARQUIA VÁLIDA! Pronta para importação.")
    else:
        print("\\n❌ HIERARQUIA INVÁLIDA! Corrija os problemas antes da importação.")
    
    return is_valid

if __name__ == "__main__":
    validate_hierarchy()
'''
    
    with open('validate_hierarchy.py', 'w', encoding='utf-8') as f:
        f.write(validation_script)
    
    print(f"📋 Script de validação criado: validate_hierarchy.py")

if __name__ == "__main__":
    organize_firestore_final() 