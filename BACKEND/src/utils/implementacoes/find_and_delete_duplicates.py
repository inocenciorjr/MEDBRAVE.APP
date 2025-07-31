#!/usr/bin/env python3
"""
Script para identificar e excluir filtros duplicados criados hoje (03/06/2025)
Usando createdAt para encontrar exatamente os filtros importados incorretamente
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone
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

def analyze_filters_by_date(db):
    """Analyze filters and subFilters by creation date."""
    print("\n📅 ANALISANDO FILTROS POR DATA DE CRIAÇÃO")
    print("=" * 60)
    
    # Target date: 2025-06-03 (hoje)
    target_date = "2025-06-03"
    print(f"🎯 Procurando filtros criados em: {target_date}")
    
    # Get all filters
    print("\n📂 ANALISANDO FILTERS...")
    filters_ref = db.collection('filters')
    all_filters = list(filters_ref.stream())
    
    filters_by_date = {}
    filters_today = []
    filters_without_date = []
    
    for doc in all_filters:
        data = doc.to_dict()
        created_at = data.get('createdAt')
        
        if created_at:
            # Convert Firestore timestamp to date string
            if hasattr(created_at, 'strftime'):
                date_str = created_at.strftime('%Y-%m-%d')
            else:
                date_str = str(created_at)[:10]
            
            if date_str not in filters_by_date:
                filters_by_date[date_str] = []
            filters_by_date[date_str].append({
                'id': doc.id,
                'name': data.get('name', 'N/A'),
                'createdAt': created_at
            })
            
            if date_str == target_date:
                filters_today.append({
                    'id': doc.id,
                    'name': data.get('name', 'N/A'),
                    'createdAt': created_at
                })
        else:
            filters_without_date.append({
                'id': doc.id,
                'name': data.get('name', 'N/A'),
                'createdAt': None
            })
    
    print(f"📊 FILTERS por data:")
    for date, filters in sorted(filters_by_date.items()):
        print(f"   📅 {date}: {len(filters)} filters")
    
    if filters_without_date:
        print(f"   ⚠️  Sem data: {len(filters_without_date)} filters")
    
    print(f"\n🎯 FILTERS criados hoje ({target_date}): {len(filters_today)}")
    
    # Get all subFilters
    print(f"\n📂 ANALISANDO SUBFILTERS...")
    subfilters_ref = db.collection('subFilters')
    all_subfilters = list(subfilters_ref.stream())
    
    subfilters_by_date = {}
    subfilters_today = []
    subfilters_without_date = []
    
    for doc in all_subfilters:
        data = doc.to_dict()
        created_at = data.get('createdAt')
        
        if created_at:
            # Convert Firestore timestamp to date string
            if hasattr(created_at, 'strftime'):
                date_str = created_at.strftime('%Y-%m-%d')
            else:
                date_str = str(created_at)[:10]
            
            if date_str not in subfilters_by_date:
                subfilters_by_date[date_str] = []
            subfilters_by_date[date_str].append({
                'id': doc.id,
                'name': data.get('name', 'N/A'),
                'createdAt': created_at
            })
            
            if date_str == target_date:
                subfilters_today.append({
                    'id': doc.id,
                    'name': data.get('name', 'N/A'),
                    'createdAt': created_at
                })
        else:
            subfilters_without_date.append({
                'id': doc.id,
                'name': data.get('name', 'N/A'),
                'createdAt': None
            })
    
    print(f"📊 SUBFILTERS por data:")
    for date, subfilters in sorted(subfilters_by_date.items()):
        print(f"   📅 {date}: {len(subfilters)} subFilters")
    
    if subfilters_without_date:
        print(f"   ⚠️  Sem data: {len(subfilters_without_date)} subFilters")
    
    print(f"\n🎯 SUBFILTERS criados hoje ({target_date}): {len(subfilters_today)}")
    
    # Summary
    total_today = len(filters_today) + len(subfilters_today)
    total_all = len(all_filters) + len(all_subfilters)
    
    print(f"\n📊 RESUMO GERAL:")
    print(f"   📂 Total de filters: {len(all_filters)}")
    print(f"   📂 Total de subFilters: {len(all_subfilters)}")
    print(f"   📊 TOTAL GERAL: {total_all}")
    print(f"   🎯 Criados hoje: {total_today}")
    print(f"   📈 Restaria após exclusão: {total_all - total_today}")
    
    return filters_today, subfilters_today, filters_by_date, subfilters_by_date

def delete_items_created_today(db, filters_today, subfilters_today, confirm=True):
    """Delete filters and subFilters created today."""
    
    total_to_delete = len(filters_today) + len(subfilters_today)
    
    if total_to_delete == 0:
        print("✅ Nenhum filtro criado hoje para excluir!")
        return True
    
    print(f"\n🗑️ PREPARANDO EXCLUSÃO DOS CRIADOS HOJE:")
    print(f"   ❌ {len(filters_today)} filters")
    print(f"   ❌ {len(subfilters_today)} subFilters")
    print(f"   📊 Total: {total_to_delete} itens")
    
    # Show some examples
    if filters_today:
        print(f"\n📋 FILTERS que serão excluídos:")
        for filter_item in filters_today[:5]:
            print(f"   - {filter_item['name']} (ID: {filter_item['id']})")
        if len(filters_today) > 5:
            print(f"   ... e mais {len(filters_today) - 5}")
    
    if subfilters_today:
        print(f"\n📋 Alguns SUBFILTERS que serão excluídos:")
        for subfilter_item in subfilters_today[:5]:
            print(f"   - {subfilter_item['name']} (ID: {subfilter_item['id']})")
        if len(subfilters_today) > 5:
            print(f"   ... e mais {len(subfilters_today) - 5}")
    
    if confirm:
        response = input(f"\n⚠️  Confirma a exclusão de {total_to_delete} itens CRIADOS HOJE? (y/N): ")
        if response.lower() != 'y':
            print("❌ Operação cancelada pelo usuário")
            return False
    
    print(f"\n🗑️ INICIANDO EXCLUSÃO...")
    
    deleted_count = 0
    batch_size = 500
    
    # Delete filters created today
    if filters_today:
        print(f"📋 Excluindo {len(filters_today)} filters criados hoje...")
        batch = db.batch()
        operations_in_batch = 0
        
        for filter_item in filters_today:
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
    
    # Delete subfilters created today
    if subfilters_today:
        print(f"📋 Excluindo {len(subfilters_today)} subFilters criados hoje...")
        batch = db.batch()
        operations_in_batch = 0
        
        for subfilter_item in subfilters_today:
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
    
    print(f"\n✅ EXCLUSÃO CONCLUÍDA!")
    print(f"📊 {deleted_count} itens criados hoje excluídos com sucesso")
    
    return True

def main():
    print("🗑️ IDENTIFICAÇÃO E EXCLUSÃO DE DUPLICATAS POR DATA")
    print("=" * 60)
    
    # 1. Connect to Firebase
    db = initialize_firebase()
    if not db:
        return False
    
    # 2. Analyze by creation date
    filters_today, subfilters_today, filters_by_date, subfilters_by_date = analyze_filters_by_date(db)
    
    # 3. Delete items created today (if confirmed)
    success = delete_items_created_today(db, filters_today, subfilters_today)
    
    if success:
        print(f"\n🎉 LIMPEZA CONCLUÍDA!")
        print(f"✅ Removidos os filtros criados hoje (duplicatas)")
        print(f"✅ Mantidos apenas os filtros antigos originais")
        print(f"💡 Próximo passo: reorganizar filtros antigos na hierarquia de 6 níveis")
    
    return success

if __name__ == "__main__":
    main() 