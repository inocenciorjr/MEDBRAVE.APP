#!/usr/bin/env python3
"""
Corrige duplicatas na hierarquia adicionando contexto dos pais
aos nomes genéricos (Introdução, Tratamento, etc.)
"""

import json

def fix_duplicates():
    print("🔧 CORRIGINDO DUPLICATAS NA HIERARQUIA")
    print("=" * 50)
    
    # Carregar dados
    with open('firestore_final_import.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    
    # Criar mapa de IDs para nomes dos pais
    id_to_item = {item['id']: item for item in items}
    
    # Nomes genéricos que precisam de contexto
    generic_names = {
        'introdução', 'tratamento', 'epidemiologia', 'diagnóstico', 
        'fisiopatologia', 'quadro clínico', 'manifestações clínicas',
        'exames complementares', 'complicações', 'prevenção', 'prognóstico',
        'etiologia', 'classificação', 'apresentação clínica', 'definição',
        'conceitos', 'avaliação', 'manejo', 'conduta'
    }
    
    def get_parent_context(item):
        """Obtém contexto do pai para criar nome único"""
        parent_id = item.get('parentId')
        if not parent_id or parent_id not in id_to_item:
            return ""
        
        parent = id_to_item[parent_id]
        parent_name = parent['name']
        
        # Se o pai também é genérico, pegar o avô
        if parent_name.lower() in generic_names:
            grandparent_context = get_parent_context(parent)
            if grandparent_context:
                return f"{grandparent_context} - {parent_name}"
            return parent_name
        
        return parent_name
    
    # Contar duplicatas por nível
    names_by_level = {}
    for item in items:
        level = item['level']
        name = item['name'].lower()
        
        if level not in names_by_level:
            names_by_level[level] = {}
        
        if name not in names_by_level[level]:
            names_by_level[level][name] = []
        
        names_by_level[level][name].append(item)
    
    # Identificar e corrigir duplicatas
    total_fixed = 0
    
    for level, names_dict in names_by_level.items():
        for name, item_list in names_dict.items():
            if len(item_list) > 1:  # Duplicata encontrada
                print(f"🔧 Corrigindo {len(item_list)} duplicatas de '{name}' no nível {level}")
                
                for item in item_list:
                    original_name = item['name']
                    
                    # Se é nome genérico, adicionar contexto do pai
                    if name in generic_names:
                        parent_context = get_parent_context(item)
                        if parent_context:
                            # Manter capitalização original
                            new_name = f"{parent_context} - {original_name}"
                            item['name'] = new_name
                            print(f"   ✅ '{original_name}' → '{new_name}'")
                            total_fixed += 1
                        else:
                            # Se não tem pai, adicionar ID único
                            new_name = f"{original_name} #{item['id'][-4:]}"
                            item['name'] = new_name
                            print(f"   ⚠️  '{original_name}' → '{new_name}' (sem contexto)")
                            total_fixed += 1
    
    print(f"\n📊 RESUMO:")
    print(f"   ✅ {total_fixed} duplicatas corrigidas")
    print(f"   📋 {len(items)} itens totais")
    
    # Salvar arquivo corrigido
    with open('firestore_final_import_fixed.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Arquivo corrigido salvo: firestore_final_import_fixed.json")
    
    return data

if __name__ == "__main__":
    fix_duplicates() 