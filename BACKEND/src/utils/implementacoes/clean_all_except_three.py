#!/usr/bin/env python3
"""
Script para limpar TUDO exceto Ano, Instituição e Finalidade
Preparando para importar hierarquia limpa de 6 níveis
"""

import firebase_admin
from firebase_admin import credentials, firestore
import time

def initialize_firebase():
    if firebase_admin._apps:
        firebase_admin.delete_app(firebase_admin.get_app())
    
    cred = credentials.Certificate('../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json')
    firebase_admin.initialize_app(cred)
    return firestore.client()

def clean_all_except_three():
    db = initialize_firebase()
    
    print("🧹 LIMPEZA TOTAL - MANTER APENAS 3 FILTROS")
    print("=" * 60)
    
    # Filters to keep
    keep_filters = ['ano', 'instituição', 'finalidade']
    
    print("✅ FILTROS QUE SERÃO MANTIDOS:")
    for f in keep_filters:
        print(f"   📋 {f.title()}")
    
    # 1. Analyze current filters
    print(f"\n📖 Analisando filters atuais...")
    filters_ref = db.collection('filters')
    all_filters = list(filters_ref.stream())
    
    filters_to_keep = []
    filters_to_delete = []
    
    for doc in all_filters:
        data = doc.to_dict()
        name = data.get('name', '').lower().strip()
        
        if any(keep_name in name for keep_name in keep_filters):
            filters_to_keep.append({
                'id': doc.id,
                'name': data.get('name', 'N/A')
            })
        else:
            filters_to_delete.append({
                'id': doc.id,
                'name': data.get('name', 'N/A')
            })
    
    print(f"✅ Filters para MANTER: {len(filters_to_keep)}")
    for f in filters_to_keep:
        print(f"   📋 {f['name']} (ID: {f['id']})")
    
    print(f"❌ Filters para EXCLUIR: {len(filters_to_delete)}")
    for f in filters_to_delete:
        print(f"   🗑️ {f['name']} (ID: {f['id']})")
    
    # 2. Get IDs of filters to keep for subFilters analysis
    keep_filter_ids = [f['id'] for f in filters_to_keep]
    
    # 3. Analyze subFilters
    print(f"\n📖 Analisando subFilters...")
    subfilters_ref = db.collection('subFilters')
    all_subfilters = list(subfilters_ref.stream())
    
    subfilters_to_keep = []
    subfilters_to_delete = []
    
    for doc in all_subfilters:
        data = doc.to_dict()
        filter_id = data.get('filterId', '')
        
        if filter_id in keep_filter_ids:
            subfilters_to_keep.append({
                'id': doc.id,
                'name': data.get('name', 'N/A'),
                'filterId': filter_id
            })
        else:
            subfilters_to_delete.append({
                'id': doc.id,
                'name': data.get('name', 'N/A'),
                'filterId': filter_id
            })
    
    print(f"✅ SubFilters para MANTER: {len(subfilters_to_keep)}")
    for sf in subfilters_to_keep:
        print(f"   📋 {sf['name']}")
    
    print(f"❌ SubFilters para EXCLUIR: {len(subfilters_to_delete)}")
    
    # 4. Summary
    total_to_delete = len(filters_to_delete) + len(subfilters_to_delete)
    total_to_keep = len(filters_to_keep) + len(subfilters_to_keep)
    
    print(f"\n📊 RESUMO DA LIMPEZA:")
    print(f"   🗑️ Total para EXCLUIR: {total_to_delete}")
    print(f"      📂 {len(filters_to_delete)} filters")
    print(f"      📂 {len(subfilters_to_delete)} subFilters")
    print(f"   ✅ Total para MANTER: {total_to_keep}")
    print(f"      📂 {len(filters_to_keep)} filters")
    print(f"      📂 {len(subfilters_to_keep)} subFilters")
    
    if total_to_delete == 0:
        print("✅ Nada para excluir!")
        return True
    
    # 5. Confirm deletion
    print(f"\n⚠️  ATENÇÃO: Isso vai excluir {total_to_delete} itens!")
    print(f"💡 Depois você vai importar a hierarquia de 6 níveis limpa")
    response = input(f"\n🗑️ Confirma LIMPEZA TOTAL? (y/N): ")
    
    if response.lower() != 'y':
        print("❌ Operação cancelada")
        return False
    
    print(f"\n🗑️ INICIANDO LIMPEZA TOTAL...")
    
    deleted_count = 0
    batch_size = 500
    
    # Delete filters
    if filters_to_delete:
        print(f"📋 Excluindo {len(filters_to_delete)} filters...")
        batch = db.batch()
        operations_in_batch = 0
        
        for filter_item in filters_to_delete:
            doc_ref = db.collection('filters').document(filter_item['id'])
            batch.delete(doc_ref)
            operations_in_batch += 1
            deleted_count += 1
            
            if operations_in_batch >= batch_size:
                batch.commit()
                print(f"   💾 Batch de {operations_in_batch} filters excluídos")
                batch = db.batch()
                operations_in_batch = 0
                time.sleep(0.5)
        
        if operations_in_batch > 0:
            batch.commit()
            print(f"   💾 Batch final de {operations_in_batch} filters excluídos")
    
    # Delete subFilters
    if subfilters_to_delete:
        print(f"📋 Excluindo {len(subfilters_to_delete)} subFilters...")
        batch = db.batch()
        operations_in_batch = 0
        
        for subfilter_item in subfilters_to_delete:
            doc_ref = db.collection('subFilters').document(subfilter_item['id'])
            batch.delete(doc_ref)
            operations_in_batch += 1
            deleted_count += 1
            
            if operations_in_batch >= batch_size:
                batch.commit()
                print(f"   💾 Batch de {operations_in_batch} subFilters excluídos")
                batch = db.batch()
                operations_in_batch = 0
                time.sleep(0.5)
        
        if operations_in_batch > 0:
            batch.commit()
            print(f"   💾 Batch final de {operations_in_batch} subFilters excluídos")
    
    print(f"\n🎉 LIMPEZA CONCLUÍDA!")
    print(f"📊 {deleted_count} itens excluídos")
    print(f"✅ Mantidos apenas: Ano, Instituição, Finalidade")
    print(f"💡 Agora pode importar a hierarquia de 6 níveis com IDs personalizados!")
    
    return True

if __name__ == "__main__":
    clean_all_except_three() 