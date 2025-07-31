#!/usr/bin/env python3
"""
Remove a duplicata desnecessária de "Segurança das crianças e adolescentes"
Mantém apenas o item original
"""

import json

def remove_duplicate():
    print("🗑️  REMOVENDO DUPLICATA DESNECESSÁRIA")
    print("=" * 60)
    
    # Carregar arquivo
    with open('firestore_FINAL.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    
    # Encontrar os dois itens de segurança
    security_items = []
    for item in items:
        if 'segurança das crianças' in item['name'].lower():
            security_items.append(item)
    
    if len(security_items) == 2:
        # Manter o primeiro (nome original) e remover o segundo (numerado)
        item_to_keep = None
        item_to_remove = None
        
        for item in security_items:
            if '(1)' in item['name']:
                item_to_remove = item
            else:
                item_to_keep = item
        
        if item_to_remove:
            print(f"🗑️  Removendo: '{item_to_remove['name']}'")
            print(f"✅ Mantendo: '{item_to_keep['name']}'")
            
            # Remover o item duplicado
            items_filtered = [item for item in items if item['id'] != item_to_remove['id']]
            
            print(f"\n📊 ANTES: {len(items)} itens")
            print(f"📊 DEPOIS: {len(items_filtered)} itens")
            print(f"📊 REMOVIDOS: {len(items) - len(items_filtered)} item")
            
            # Atualizar dados
            data['items'] = items_filtered
            
            # Atualizar metadados
            if 'metadata' in data:
                data['metadata']['totalItems'] = len(items_filtered)
            
            # Salvar arquivo limpo
            with open('firestore_CLEAN.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"\n✅ Arquivo limpo salvo: firestore_CLEAN.json")
            print(f"🎯 Hierarquia final sem duplicatas!")
            
        else:
            print("⚠️  Não foi possível identificar qual item remover")
    else:
        print(f"⚠️  Esperado 2 itens, encontrado {len(security_items)}")
    
    return data

if __name__ == "__main__":
    remove_duplicate() 