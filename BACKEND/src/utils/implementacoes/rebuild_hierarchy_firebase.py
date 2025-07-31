#!/usr/bin/env python3
"""
Reconstrói a hierarquia completa no Firebase com base na análise do HTML
Organiza todos os 6 níveis hierárquicos corretamente
"""

import json
import firebase_admin
from firebase_admin import credentials, firestore
import re
from datetime import datetime

def rebuild_complete_hierarchy():
    print("🔄 RECONSTRUINDO HIERARQUIA COMPLETA NO FIREBASE")
    print("=" * 60)
    
    # Inicializar Firebase
    if not firebase_admin._apps:
        cred = credentials.Certificate('firebase-adminsdk.json')
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # Carregar hierarquia do HTML
    with open('html_hierarchy_complete.json', 'r', encoding='utf-8') as f:
        html_hierarchy = json.load(f)
    
    # Carregar dados atuais do merged
    with open('merged_filters.json', 'r', encoding='utf-8') as f:
        merged_data = json.load(f)
    
    print(f"📊 ANÁLISE DOS DADOS:")
    print(f"- HTML: {sum(len(items) for items in html_hierarchy.values())} itens em 6 níveis")
    print(f"- Merged: {sum(len(esp.get('subespecialidades', [])) for esp in merged_data)} subespecialidades")
    print()
    
    # Criar mapeamento de filtros principais (nível 0)
    filter_mapping = {}
    
    # Especialidades principais
    especialidades_map = {
        'Cirurgia': 'cirurgia',
        'Clínica Médica': 'clinica-medica', 
        'Ginecologia': 'ginecologia',
        'Medicina Preventiva': 'medicina-preventiva',
        'Obstetrícia': 'obstetricia',
        'Pediatria': 'pediatria',
        'Outros': 'outros'
    }
    
    print("🗂️ MAPEANDO ESTRUTURA HIERÁRQUICA...")
    
    # Construir hierarquia sequencial baseada no HTML
    hierarchy_tree = {}
    current_path = [None] * 6  # Para rastrear o caminho atual em cada nível
    
    # Processar todos os níveis em ordem
    for level_num in sorted(html_hierarchy.keys(), key=int):
        level_items = html_hierarchy[level_num]
        level = int(level_num)
        
        print(f"📋 Processando NÍVEL {level}: {len(level_items)} itens")
        
        for item in level_items:
            name = item['text']
            
            # Definir o pai baseado no nível anterior
            parent_id = current_path[level - 1] if level > 0 else None
            
            # Criar ID único
            item_id = f"level_{level}_{name.lower().replace(' ', '_').replace('-', '_')}"[:50]
            
            # Registrar no caminho atual
            current_path[level] = item_id
            
            # Limpar níveis inferiores
            for i in range(level + 1, 6):
                current_path[i] = None
            
            # Mapear filtro principal se for nível 0
            if level == 0 and name in especialidades_map:
                filter_id = especialidades_map[name]
            else:
                filter_id = None
            
            hierarchy_tree[item_id] = {
                'name': name,
                'level': level,
                'parent_id': parent_id,
                'filter_id': filter_id,
                'path': current_path.copy()
            }
    
    print(f"✅ Hierarquia mapeada: {len(hierarchy_tree)} itens")
    print()
    
    # Agora aplicar no Firebase
    print("🔥 APLICANDO NO FIREBASE...")
    
    updates_count = 0
    errors_count = 0
    
    # Buscar todos os subfiltros existentes
    subfilters_ref = db.collection('subFilters')
    existing_subfilters = {}
    
    docs = subfilters_ref.get()
    for doc in docs:
        data = doc.to_dict()
        name = data.get('name', '')
        existing_subfilters[name] = {
            'id': doc.id,
            'data': data
        }
    
    print(f"📖 Encontrados {len(existing_subfilters)} subfiltros existentes")
    
    # Aplicar hierarquia
    for item_id, item_data in hierarchy_tree.items():
        name = item_data['name']
        parent_id = item_data['parent_id']
        level = item_data['level']
        
        if name in existing_subfilters:
            doc_id = existing_subfilters[name]['id']
            current_data = existing_subfilters[name]['data']
            
            # Determinar o novo parentId
            new_parent_id = None
            if parent_id and parent_id != item_id:
                # Encontrar o documento pai
                parent_name = hierarchy_tree[parent_id]['name']
                if parent_name in existing_subfilters:
                    new_parent_id = existing_subfilters[parent_name]['id']
            
            # Verificar se precisa atualizar
            current_parent = current_data.get('parentId')
            if current_parent != new_parent_id:
                try:
                    update_data = {
                        'parentId': new_parent_id,
                        'hierarchyLevel': level,
                        'updatedAt': datetime.now()
                    }
                    
                    subfilters_ref.document(doc_id).update(update_data)
                    updates_count += 1
                    
                    if updates_count <= 5:  # Mostrar só os primeiros 5
                        print(f"  ✅ {name} -> pai: {parent_name if parent_id else 'ROOT'}")
                
                except Exception as e:
                    print(f"  ❌ Erro em {name}: {e}")
                    errors_count += 1
    
    print()
    print(f"🎉 RESULTADO FINAL:")
    print(f"- ✅ Atualizações: {updates_count}")
    print(f"- ❌ Erros: {errors_count}")
    print(f"- 📊 Total processado: {len(hierarchy_tree)}")
    print()
    print("🔄 A hierarquia de 6 níveis foi reconstruída!")

if __name__ == "__main__":
    rebuild_complete_hierarchy() 