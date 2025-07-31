#!/usr/bin/env python3
"""
Script para excluir apenas os subFilters criados em 27/05/2025
(importação massiva suspeita de 2.600 itens)
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

def delete_may27_imports():
    db = initialize_firebase()
    
    print("🗑️ EXCLUSÃO DOS IMPORTS DE 27/05/2025")
    print("=" * 50)
    
    target_date = "2025-05-27"
    
    # Get all subFilters
    print("📖 Carregando todos os subFilters...")
    subfilters_ref = db.collection('subFilters')
    all_subfilters = list(subfilters_ref.stream())
    
    # Find items created on 2025-05-27
    to_delete = []
    other_dates = {}
    
    for doc in all_subfilters:
        data = doc.to_dict()
        created_at = data.get('createdAt')
        
        if created_at:
            if hasattr(created_at, 'strftime'):
                date_str = created_at.strftime('%Y-%m-%d')
            else:
                date_str = str(created_at)[:10]
            
            if date_str == target_date:
                to_delete.append({
                    'id': doc.id,
                    'name': data.get('name', 'N/A')
                })
            else:
                if date_str not in other_dates:
                    other_dates[date_str] = 0
                other_dates[date_str] += 1
    
    print(f"\n📊 ANÁLISE:")
    print(f"   🎯 Para excluir (27/05): {len(to_delete)} subFilters")
    print(f"   ✅ Que permanecerão:")
    for date in sorted(other_dates.keys()):
        print(f"      📅 {date}: {other_dates[date]} subFilters")
    
    total_remaining = sum(other_dates.values())
    print(f"   📊 Total que permanecerá: {total_remaining}")
    
    if len(to_delete) == 0:
        print("✅ Nada para excluir!")
        return True
    
    # Show some examples
    print(f"\n📋 Exemplos do que será excluído (27/05):")
    for i, item in enumerate(to_delete[:5]):
        print(f"   {i+1}. {item['name']}")
    if len(to_delete) > 5:
        print(f"   ... e mais {len(to_delete) - 5}")
    
    # Confirm
    response = input(f"\n⚠️  Confirma exclusão de {len(to_delete)} itens de 27/05? (y/N): ")
    if response.lower() != 'y':
        print("❌ Operação cancelada")
        return False
    
    print(f"\n🗑️ EXCLUINDO {len(to_delete)} subFilters de 27/05...")
    
    deleted_count = 0
    batch_size = 500
    batch = db.batch()
    operations_in_batch = 0
    
    for item in to_delete:
        doc_ref = db.collection('subFilters').document(item['id'])
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
    print(f"📊 {deleted_count} subFilters de 27/05 excluídos")
    print(f"📊 Restaram {total_remaining} subFilters")
    print(f"💡 Agora vamos ver se ficou próximo dos ~1.300 originais!")
    
    return True

if __name__ == "__main__":
    delete_may27_imports() 