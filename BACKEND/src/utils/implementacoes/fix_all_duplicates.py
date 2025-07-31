#!/usr/bin/env python3
"""
Corrige TODAS as duplicatas na hierarquia adicionando contexto dos pais
"""

import json

def fix_all_duplicates():
    print("🔧 CORRIGINDO TODAS AS DUPLICATAS")
    print("=" * 50)
    
    # Carregar dados
    with open('firestore_final_import_fixed.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    
    # Criar mapa de IDs para nomes dos pais
    id_to_item = {item['id']: item for item in items}
    
    def get_parent_context(item):
        """Obtém contexto completo do pai para criar nome único"""
        parent_id = item.get('parentId')
        if not parent_id or parent_id not in id_to_item:
            return ""
        
        parent = id_to_item[parent_id]
        parent_name = parent['name']
        
        # Simplificar nomes muito longos dos pais
        if len(parent_name) > 50:
            # Pegar primeiro nome significativo
            parent_name = parent_name.split(' - ')[0]
            if len(parent_name) > 30:
                parent_name = parent_name[:30] + "..."
        
        return parent_name
    
    # Identificar duplicatas por nível
    names_by_level = {}
    for item in items:
        level = item['level']
        name = item['name']
        
        if level not in names_by_level:
            names_by_level[level] = {}
        
        if name not in names_by_level[level]:
            names_by_level[level][name] = []
        
        names_by_level[level][name].append(item)
    
    # Corrigir TODAS as duplicatas
    total_fixed = 0
    
    for level, names_dict in names_by_level.items():
        for name, item_list in names_dict.items():
            if len(item_list) > 1:  # Duplicata encontrada
                print(f"🔧 Corrigindo {len(item_list)} duplicatas de '{name}' no nível {level}")
                
                for i, item in enumerate(item_list):
                    original_name = item['name']
                    
                    # Para todos os itens duplicados (não apenas genéricos)
                    parent_context = get_parent_context(item)
                    
                    if parent_context:
                        # Adicionar contexto do pai
                        new_name = f"{parent_context} - {original_name}"
                        item['name'] = new_name
                        print(f"   ✅ '{original_name}' → '{new_name}'")
                        total_fixed += 1
                    else:
                        # Se não tem pai, adicionar número sequencial
                        new_name = f"{original_name} ({i+1})"
                        item['name'] = new_name
                        print(f"   ⚠️  '{original_name}' → '{new_name}' (numerado)")
                        total_fixed += 1
    
    print(f"\n📊 RESUMO:")
    print(f"   ✅ {total_fixed} duplicatas corrigidas")
    print(f"   📋 {len(items)} itens totais")
    
    # Salvar arquivo final
    with open('firestore_final_ready.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Arquivo FINAL salvo: firestore_final_ready.json")
    
    return data

if __name__ == "__main__":
    fix_all_duplicates() 