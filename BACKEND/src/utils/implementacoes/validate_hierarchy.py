#!/usr/bin/env python3
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
        print("\n🚨 ÓRFÃOS:")
        for orphan in orphans[:5]:
            print(f"   - {orphan['name']} (nível {orphan['level']})")
    
    if duplicates:
        print("\n🚨 DUPLICATAS:")
        for dup in duplicates[:5]:
            print(f"   - {dup['name']} (nível {dup['level']})")
    
    is_valid = len(orphans) == 0 and len(duplicates) == 0 and len(invalid_levels) == 0
    
    if is_valid:
        print("\n✅ HIERARQUIA VÁLIDA! Pronta para importação.")
    else:
        print("\n❌ HIERARQUIA INVÁLIDA! Corrija os problemas antes da importação.")
    
    return is_valid

if __name__ == "__main__":
    validate_hierarchy()
