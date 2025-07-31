#!/usr/bin/env python3
"""
Excluir TODOS os subFilters para reiniciar a importação corretamente
"""

import firebase_admin
from firebase_admin import credentials, firestore

def initialize_firebase():
    if firebase_admin._apps:
        firebase_admin.delete_app(firebase_admin.get_app())
    
    cred = credentials.Certificate('../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json')
    firebase_admin.initialize_app(cred)
    return firestore.client()

def delete_all_subfilters():
    db = initialize_firebase()
    
    print("🗑️ EXCLUINDO TODOS OS SUBFILTROS")
    print("=" * 50)
    
    # Get all subFilters
    print("📂 Carregando subFilters...")
    subfilters_ref = db.collection('subFilters')
    all_subfilters = list(subfilters_ref.stream())
    
    total_count = len(all_subfilters)
    print(f"📊 Encontrados {total_count} subFilters para exclusão")
    
    if total_count == 0:
        print("✅ Nenhum subFilter encontrado para excluir")
        return
    
    # Delete in batches
    batch_size = 500
    deleted_count = 0
    
    for i in range(0, total_count, batch_size):
        batch = db.batch()
        batch_docs = all_subfilters[i:i + batch_size]
        
        for doc in batch_docs:
            batch.delete(doc.reference)
        
        batch.commit()
        deleted_count += len(batch_docs)
        
        print(f"   🗑️ Excluídos {len(batch_docs)} subFilters ({deleted_count}/{total_count})")
    
    print(f"\n🎉 EXCLUSÃO CONCLUÍDA!")
    print(f"✅ {deleted_count} subFilters excluídos com sucesso")
    
    return deleted_count

if __name__ == "__main__":
    delete_all_subfilters() 