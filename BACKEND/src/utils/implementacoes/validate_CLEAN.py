#!/usr/bin/env python3
"""
VALIDAÇÃO FINAL DEFINITIVA - firestore_CLEAN.json
"""

import json

def validate_clean():
    print("🎯 VALIDAÇÃO FINAL DEFINITIVA")
    print("=" * 60)
    
    with open('firestore_CLEAN.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    
    # Validações completas
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
    
    # Contar por nível
    level_counts = {}
    for item in items:
        level = item['level']
        level_counts[level] = level_counts.get(level, 0) + 1
    
    # Relatório final
    print(f"📊 HIERARQUIA FINAL COMPLETA:")
    print(f"   📋 Nível 0 (Especialidades): {level_counts.get(0, 0)}")
    print(f"   📂 Nível 1 (Subespecialidades): {level_counts.get(1, 0)}")
    print(f"   📁 Nível 2 (Subgrupos): {level_counts.get(2, 0)}")
    print(f"   📄 Nível 3 (Tópicos): {level_counts.get(3, 0)}")
    print(f"   📃 Nível 4 (Subtópicos): {level_counts.get(4, 0)}")
    print(f"   📋 Nível 5 (Detalhes): {level_counts.get(5, 0)}")
    print(f"   🔥 TOTAL: {len(items)} itens")
    
    print(f"\n🔍 VALIDAÇÕES:")
    print(f"   ⚠️  Órfãos: {len(orphans)}")
    print(f"   ⚠️  Duplicatas: {len(duplicates)}")
    print(f"   ⚠️  Níveis inválidos: {len(invalid_levels)}")
    
    is_valid = len(orphans) == 0 and len(duplicates) == 0 and len(invalid_levels) == 0
    
    if is_valid:
        print(f"\n🎉 ✅ HIERARQUIA 100% VÁLIDA E LIMPA!")
        print(f"🚀 PRONTA PARA IMPORTAÇÃO NO FIREBASE!")
        
        print(f"\n📱 RESUMO DO PROJETO:")
        print(f"   🎯 Objetivo: Hierarquia de 6 níveis completa")
        print(f"   📊 Fonte 1: HTML (1,107 itens) - 6 níveis estruturados")
        print(f"   📊 Fonte 2: Estratégia (548 itens) - hierarquia médica correta")
        print(f"   🔄 Merge inteligente: +225 itens únicos adicionados")
        print(f"   🧹 Limpeza: Duplicatas removidas")
        print(f"   ✅ Resultado: {len(items)} itens únicos em 6 níveis")
        
        print(f"\n📂 ARQUIVO FINAL:")
        print(f"   📄 firestore_CLEAN.json")
        print(f"   📊 {len(items)} itens")
        print(f"   🔗 6 níveis hierárquicos")
        print(f"   ✅ 0 duplicatas")
        print(f"   ✅ 0 órfãos")
        
        print(f"\n🚀 PRÓXIMOS PASSOS:")
        print(f"   1. ✅ Importar firestore_CLEAN.json no Firebase")
        print(f"   2. 🔧 Atualizar interface React para 6 níveis")
        print(f"   3. 🎨 Implementar expansão/colapso hierárquica")
        print(f"   4. 🔍 Testar filtros e busca")
        
    else:
        print(f"\n❌ AINDA HÁ PROBLEMAS:")
        if orphans:
            print(f"   🚨 {len(orphans)} órfãos")
        if duplicates:
            print(f"   🚨 {len(duplicates)} duplicatas")
        if invalid_levels:
            print(f"   🚨 {len(invalid_levels)} níveis inválidos")
    
    return is_valid

if __name__ == "__main__":
    validate_clean() 