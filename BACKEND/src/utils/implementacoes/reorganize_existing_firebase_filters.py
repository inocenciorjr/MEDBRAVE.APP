#!/usr/bin/env python3
"""
Reorganiza os filtros JÁ EXISTENTES no Firebase 
seguindo a nova hierarquia de 6 níveis criada no JSON
"""

import json
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, List, Any
import time

def reorganize_existing_firebase_filters():
    print("🔧 REORGANIZANDO FILTROS EXISTENTES NO FIREBASE")
    print("=" * 80)
    
    # 1. Carregar nova hierarquia do JSON
    print("📖 Carregando nova hierarquia...")
    with open('firestore_FINAL_CLEAN.json', 'r', encoding='utf-8') as f:
        hierarchy_data = json.load(f)
    
    new_hierarchy = hierarchy_data['items']
    print(f"📊 Nova hierarquia: {len(new_hierarchy)} itens em 6 níveis")
    
    # 2. Conectar ao Firebase
    print("\n🔌 Conectando ao Firebase...")
    
    # Verificar se já está inicializado
    if not firebase_admin._apps:
        cred = credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # 3. Buscar filtros existentes no Firebase
    print("🔍 Buscando filtros existentes no Firebase...")
    
    filters_ref = db.collection('subFilters')
    existing_filters = []
    
    try:
        docs = filters_ref.stream()
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            existing_filters.append(data)
        
        print(f"📊 Filtros existentes no Firebase: {len(existing_filters)}")
        
    except Exception as e:
        print(f"❌ Erro ao buscar filtros: {e}")
        return False
    
    if not existing_filters:
        print("⚠️  Nenhum filtro encontrado no Firebase!")
        return False
    
    # 4. Criar mapeamento por nome para matching
    print("\n🗺️  Criando mapeamento nome → nova hierarquia...")
    
    hierarchy_by_name = {}
    for item in new_hierarchy:
        # Usar nome normalizado como chave
        normalized_name = item['name'].lower().strip()
        hierarchy_by_name[normalized_name] = item
    
    # 5. Analisar correspondências
    print("🔍 Analisando correspondências...")
    
    matches = []
    no_matches = []
    
    for existing_filter in existing_filters:
        existing_name = existing_filter.get('name', '').lower().strip()
        
        if existing_name in hierarchy_by_name:
            hierarchy_item = hierarchy_by_name[existing_name]
            matches.append({
                'existing': existing_filter,
                'hierarchy': hierarchy_item
            })
        else:
            no_matches.append(existing_filter)
    
    print(f"✅ Correspondências encontradas: {len(matches)}")
    print(f"⚠️  Sem correspondência: {len(no_matches)}")
    
    if no_matches:
        print(f"\n📋 Filtros sem correspondência:")
        for item in no_matches[:10]:  # Mostrar apenas os primeiros 10
            print(f"   - '{item.get('name', 'SEM NOME')}'")
        if len(no_matches) > 10:
            print(f"   ... e mais {len(no_matches) - 10} itens")
    
    # 6. Reorganizar filtros correspondentes
    print(f"\n🔧 Reorganizando {len(matches)} filtros...")
    
    updated_count = 0
    batch_size = 500  # Firestore limit
    
    # Processar em batches
    for i in range(0, len(matches), batch_size):
        batch = db.batch()
        batch_matches = matches[i:i + batch_size]
        
        print(f"📦 Processando batch {i//batch_size + 1}: {len(batch_matches)} itens")
        
        for match in batch_matches:
            existing = match['existing']
            hierarchy = match['hierarchy']
            
            # Preparar dados atualizados
            updated_data = {
                'level': hierarchy['level'],
                'parentId': hierarchy.get('parentId'),
                'isExpanded': hierarchy.get('isExpanded', False),
                'subcategories': hierarchy.get('subcategories', []),
                'source': hierarchy.get('source', 'reorganized')
            }
            
            # Manter dados existentes importantes
            if 'createdAt' in existing:
                updated_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            else:
                updated_data['createdAt'] = firestore.SERVER_TIMESTAMP
                updated_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            
            # Atualizar no batch
            doc_ref = filters_ref.document(existing['id'])
            batch.update(doc_ref, updated_data)
            
            updated_count += 1
        
        # Executar batch
        try:
            batch.commit()
            print(f"   ✅ Batch {i//batch_size + 1} executado com sucesso")
            time.sleep(0.1)  # Pequena pausa entre batches
            
        except Exception as e:
            print(f"   ❌ Erro no batch {i//batch_size + 1}: {e}")
    
    # 7. Relatório final
    print(f"\n📊 RELATÓRIO FINAL:")
    print(f"   📋 Total de filtros no Firebase: {len(existing_filters)}")
    print(f"   ✅ Filtros reorganizados: {updated_count}")
    print(f"   ⚠️  Filtros sem correspondência: {len(no_matches)}")
    print(f"   📈 Taxa de sucesso: {(updated_count/len(existing_filters)*100):.1f}%")
    
    # 8. Validar hierarquia após reorganização
    print(f"\n🔍 Validando hierarquia reorganizada...")
    
    # Buscar filtros atualizados
    updated_filters = []
    docs = filters_ref.stream()
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        updated_filters.append(data)
    
    # Contar por nível
    level_counts = {}
    for f in updated_filters:
        level = f.get('level', -1)
        level_counts[level] = level_counts.get(level, 0) + 1
    
    print(f"📊 Distribuição por níveis após reorganização:")
    for level in sorted(level_counts.keys()):
        if level >= 0:
            print(f"   📋 Nível {level}: {level_counts[level]} filtros")
        else:
            print(f"   ⚠️  Sem nível definido: {level_counts[level]} filtros")
    
    print(f"\n🎉 REORGANIZAÇÃO CONCLUÍDA!")
    print(f"🚀 Filtros do Firebase agora seguem a hierarquia de 6 níveis!")
    
    return True

if __name__ == "__main__":
    reorganize_existing_firebase_filters() 