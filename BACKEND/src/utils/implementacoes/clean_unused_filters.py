#!/usr/bin/env python3
"""
Script para identificar e excluir filtros não utilizados pelas questões
Mantendo apenas os filtros que estão realmente sendo usados
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
import time

def initialize_firebase():
    """Initialize Firebase Admin SDK."""
    cred_file = '../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json'
    
    try:
        if firebase_admin._apps:
            firebase_admin.delete_app(firebase_admin.get_app())
        
        cred = credentials.Certificate(cred_file)
        firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        print("✅ Firebase conectado!")
        return db
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return None

def load_used_filters():
    """Load the list of filters actually used by questions."""
    with open('filter_usage_analysis.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    used_filter_ids = set(data['used_filter_ids'])
    used_subfilter_ids = set(data['used_subfilter_ids'])
    
    print(f"📊 IDs em uso:")
    print(f"   🎯 Filter IDs: {len(used_filter_ids)}")
    print(f"   🎯 SubFilter IDs: {len(used_subfilter_ids)}")
    
    return used_filter_ids, used_subfilter_ids

def analyze_filters_to_delete(db, used_filter_ids, used_subfilter_ids):
    """Analyze which filters can be safely deleted."""
    print("\n🔍 ANALISANDO FILTROS PARA EXCLUSÃO")
    print("=" * 50)
    
    # Get all filters
    print("📖 Carregando todos os filters...")
    filters_ref = db.collection('filters')
    all_filters = {}
    
    for doc in filters_ref.stream():
        data = doc.to_dict()
        all_filters[doc.id] = {
            'id': doc.id,
            'name': data.get('name', 'N/A'),
            'createdAt': data.get('createdAt'),
            'data': data
        }
    
    # Get all subfilters
    print("📖 Carregando todos os subFilters...")
    subfilters_ref = db.collection('subFilters')
    all_subfilters = {}
    
    for doc in subfilters_ref.stream():
        data = doc.to_dict()
        all_subfilters[doc.id] = {
            'id': doc.id,
            'name': data.get('name', 'N/A'),
            'filterId': data.get('filterId'),
            'createdAt': data.get('createdAt'),
            'data': data
        }
    
    print(f"✅ Total: {len(all_filters)} filters, {len(all_subfilters)} subFilters")
    
    # Identify unused filters
    unused_filters = []
    for filter_id, filter_data in all_filters.items():
        if filter_id not in used_filter_ids and filter_id not in used_subfilter_ids:
            unused_filters.append(filter_data)
    
    # Identify unused subfilters
    unused_subfilters = []
    for subfilter_id, subfilter_data in all_subfilters.items():
        if subfilter_id not in used_subfilter_ids:
            unused_subfilters.append(subfilter_data)
    
    print(f"\n📊 ANÁLISE DE EXCLUSÃO:")
    print(f"   ❌ Filters não utilizados: {len(unused_filters)}")
    print(f"   ❌ SubFilters não utilizados: {len(unused_subfilters)}")
    
    # Show some examples
    if unused_filters:
        print(f"\n📋 EXEMPLOS DE FILTERS NÃO UTILIZADOS:")
        for i, filter_data in enumerate(unused_filters[:10]):
            created = filter_data.get('createdAt', 'N/A')
            print(f"   {i+1}. {filter_data['name']} (ID: {filter_data['id']}) - Created: {created}")
        if len(unused_filters) > 10:
            print(f"   ... e mais {len(unused_filters) - 10}")
    
    if unused_subfilters:
        print(f"\n📋 EXEMPLOS DE SUBFILTERS NÃO UTILIZADOS:")
        for i, subfilter_data in enumerate(unused_subfilters[:10]):
            created = subfilter_data.get('createdAt', 'N/A')
            print(f"   {i+1}. {subfilter_data['name']} (ID: {subfilter_data['id']}) - Created: {created}")
        if len(unused_subfilters) > 10:
            print(f"   ... e mais {len(unused_subfilters) - 10}")
    
    return unused_filters, unused_subfilters

def delete_unused_filters(db, unused_filters, unused_subfilters, confirm=True):
    """Delete unused filters and subfilters."""
    
    total_to_delete = len(unused_filters) + len(unused_subfilters)
    
    if total_to_delete == 0:
        print("✅ Nenhum filtro para excluir!")
        return True
    
    print(f"\n🗑️ PREPARANDO EXCLUSÃO:")
    print(f"   ❌ {len(unused_filters)} filters")
    print(f"   ❌ {len(unused_subfilters)} subFilters")
    print(f"   📊 Total: {total_to_delete} itens")
    
    if confirm:
        response = input(f"\n⚠️  Confirma a exclusão de {total_to_delete} itens? (y/N): ")
        if response.lower() != 'y':
            print("❌ Operação cancelada pelo usuário")
            return False
    
    print(f"\n🗑️ INICIANDO EXCLUSÃO...")
    
    deleted_count = 0
    batch_size = 500
    
    # Delete filters
    if unused_filters:
        print(f"📋 Excluindo {len(unused_filters)} filters...")
        batch = db.batch()
        operations_in_batch = 0
        
        for filter_data in unused_filters:
            doc_ref = db.collection('filters').document(filter_data['id'])
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
    
    # Delete subfilters
    if unused_subfilters:
        print(f"📋 Excluindo {len(unused_subfilters)} subFilters...")
        batch = db.batch()
        operations_in_batch = 0
        
        for subfilter_data in unused_subfilters:
            doc_ref = db.collection('subFilters').document(subfilter_data['id'])
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
    
    print(f"\n✅ EXCLUSÃO CONCLUÍDA!")
    print(f"📊 {deleted_count} itens excluídos com sucesso")
    
    return True

def main():
    print("🗑️ LIMPEZA DE FILTROS NÃO UTILIZADOS")
    print("=" * 60)
    
    # 1. Connect to Firebase
    db = initialize_firebase()
    if not db:
        return False
    
    # 2. Load used filters
    used_filter_ids, used_subfilter_ids = load_used_filters()
    
    # 3. Analyze what to delete
    unused_filters, unused_subfilters = analyze_filters_to_delete(
        db, used_filter_ids, used_subfilter_ids
    )
    
    # 4. Delete unused filters
    success = delete_unused_filters(db, unused_filters, unused_subfilters)
    
    if success:
        print(f"\n🎉 LIMPEZA CONCLUÍDA!")
        print(f"✅ Agora só restam os filtros que estão sendo usados pelas questões")
        print(f"💡 Próximo passo: reorganizar na hierarquia de 6 níveis")
    
    return success

if __name__ == "__main__":
    main() 