#!/usr/bin/env python3
"""
LIMPEZA FINAL - Remove TODAS as duplicatas forçadamente
"""

import json

def final_cleanup():
    print("🧹 LIMPEZA FINAL - REMOVENDO TODAS AS DUPLICATAS")
    print("=" * 60)
    
    # Carregar dados
    with open('firestore_final_ready.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['items']
    
    # Criar mapa de IDs para facilitar busca de pais
    id_to_item = {item['id']: item for item in items}
    
    def get_safe_parent_context(item, max_length=30):
        """Obtém contexto simplificado do pai"""
        parent_id = item.get('parentId')
        if not parent_id or parent_id not in id_to_item:
            return ""
        
        parent = id_to_item[parent_id]
        parent_name = parent['name']
        
        # Simplificar nome do pai
        if ' - ' in parent_name:
            parent_name = parent_name.split(' - ')[-1]  # Última parte
        
        if len(parent_name) > max_length:
            parent_name = parent_name[:max_length].strip()
        
        return parent_name
    
    # Rastrear nomes únicos por nível
    unique_names_by_level = {}
    items_processed = []
    
    for item in items:
        level = item['level']
        original_name = item['name']
        
        if level not in unique_names_by_level:
            unique_names_by_level[level] = set()
        
        # Verificar se já existe
        candidate_name = original_name
        counter = 1
        
        while candidate_name in unique_names_by_level[level]:
            # Se duplicata, tentar adicionar contexto do pai
            if counter == 1:
                parent_context = get_safe_parent_context(item)
                if parent_context and not original_name.startswith(parent_context):
                    candidate_name = f"{parent_context} - {original_name}"
                else:
                    candidate_name = f"{original_name} ({counter})"
            else:
                candidate_name = f"{original_name} ({counter})"
            
            counter += 1
            
            # Emergência: limitar tentativas
            if counter > 10:
                candidate_name = f"{original_name} #{item['id'][-4:]}"
                break
        
        # Atualizar nome e registrar como único
        if candidate_name != original_name:
            print(f"🔧 '{original_name}' → '{candidate_name}' (nível {level})")
        
        item['name'] = candidate_name
        unique_names_by_level[level].add(candidate_name)
        items_processed.append(item)
    
    # Atualizar dados
    data['items'] = items_processed
    
    # Salvar arquivo FINAL DEFINITIVO
    with open('firestore_FINAL.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ LIMPEZA CONCLUÍDA!")
    print(f"📊 {len(items_processed)} itens processados")
    print(f"🎯 Arquivo FINAL: firestore_FINAL.json")
    
    return data

if __name__ == "__main__":
    final_cleanup() 