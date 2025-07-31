#!/usr/bin/env python3
"""
Analisa se os itens duplicados de "Segurança das crianças e adolescentes" 
são realmente idênticos ou têm diferenças
"""

import json

def analyze_security_duplicates():
    print("🔍 ANALISANDO DUPLICATAS DE SEGURANÇA")
    print("=" * 60)
    
    # Carregar arquivo final
    with open('firestore_FINAL.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    
    # Encontrar os dois itens de segurança
    security_items = []
    for item in items:
        if 'segurança das crianças' in item['name'].lower():
            security_items.append(item)
    
    print(f"📊 Encontrados {len(security_items)} itens de segurança")
    
    if len(security_items) == 2:
        item1, item2 = security_items
        
        print(f"\n📋 COMPARAÇÃO DETALHADA:")
        print(f"\n🔸 ITEM 1:")
        print(f"   ID: {item1['id']}")
        print(f"   Nome: '{item1['name']}'")
        print(f"   Nível: {item1['level']}")
        print(f"   ParentId: {item1.get('parentId')}")
        print(f"   Subcategorias: {len(item1.get('subcategories', []))}")
        print(f"   Expandido: {item1.get('isExpanded')}")
        print(f"   Fonte: {item1.get('source')}")
        
        print(f"\n🔸 ITEM 2:")
        print(f"   ID: {item2['id']}")
        print(f"   Nome: '{item2['name']}'")
        print(f"   Nível: {item2['level']}")
        print(f"   ParentId: {item2.get('parentId')}")
        print(f"   Subcategorias: {len(item2.get('subcategories', []))}")
        print(f"   Expandido: {item2.get('isExpanded')}")
        print(f"   Fonte: {item2.get('source')}")
        
        # Verificar se são idênticos (exceto ID e nome)
        identical = True
        differences = []
        
        # Comparar campos importantes
        fields_to_compare = ['level', 'parentId', 'subcategories', 'isExpanded', 'source']
        
        for field in fields_to_compare:
            val1 = item1.get(field)
            val2 = item2.get(field)
            
            if val1 != val2:
                identical = False
                differences.append(f"{field}: '{val1}' vs '{val2}'")
        
        print(f"\n🔍 ANÁLISE:")
        if identical:
            print(f"   ✅ Os itens são IDÊNTICOS (exceto ID e nome)")
            print(f"   💡 RECOMENDAÇÃO: Remover a duplicata")
        else:
            print(f"   ⚠️  Os itens têm DIFERENÇAS:")
            for diff in differences:
                print(f"      - {diff}")
            print(f"   💡 RECOMENDAÇÃO: Manter ambos se as diferenças são significativas")
        
        # Verificar filhos (subcategorias)
        children1 = [item for item in items if item.get('parentId') == item1['id']]
        children2 = [item for item in items if item.get('parentId') == item2['id']]
        
        print(f"\n👶 FILHOS:")
        print(f"   Item 1: {len(children1)} filhos")
        print(f"   Item 2: {len(children2)} filhos")
        
        if len(children1) == 0 and len(children2) == 0:
            print(f"   💡 Nenhum dos dois tem filhos - seguro remover duplicata")
        elif len(children1) > 0 and len(children2) == 0:
            print(f"   💡 Manter Item 1 (tem filhos), remover Item 2")
        elif len(children1) == 0 and len(children2) > 0:
            print(f"   💡 Manter Item 2 (tem filhos), remover Item 1")
        else:
            print(f"   ⚠️  Ambos têm filhos - verificar se são os mesmos")
    
    return security_items

if __name__ == "__main__":
    analyze_security_duplicates() 