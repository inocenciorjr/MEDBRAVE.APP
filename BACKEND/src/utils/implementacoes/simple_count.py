#!/usr/bin/env python3
"""
Verificação SIMPLES do número total de documentos
Sem queries complexas que podem ser afetadas por índices compostos
"""

import firebase_admin
from firebase_admin import credentials, firestore

def initialize_firebase():
    if firebase_admin._apps:
        firebase_admin.delete_app(firebase_admin.get_app())
    
    cred = credentials.Certificate('../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json')
    firebase_admin.initialize_app(cred)
    return firestore.client()

def simple_count():
    db = initialize_firebase()
    
    print("🔢 CONTAGEM SIMPLES E DIRETA")
    print("=" * 50)
    
    # Count filters collection - SIMPLE
    print("📂 Contando 'filters'...")
    try:
        filters_ref = db.collection('filters')
        filters_docs = list(filters_ref.stream())
        filters_count = len(filters_docs)
        print(f"✅ Total FILTERS: {filters_count}")
        
        # List all filter names
        print("📋 Lista de filters:")
        for doc in filters_docs:
            data = doc.to_dict()
            name = data.get('name', 'N/A')
            print(f"   • {name} (ID: {doc.id})")
            
    except Exception as e:
        print(f"❌ Erro ao contar filters: {e}")
        filters_count = 0
    
    # Count subFilters collection - SIMPLE  
    print(f"\n📂 Contando 'subFilters'...")
    try:
        subfilters_ref = db.collection('subFilters')
        subfilters_docs = list(subfilters_ref.stream())
        subfilters_count = len(subfilters_docs)
        print(f"✅ Total SUBFILTERS: {subfilters_count}")
        
    except Exception as e:
        print(f"❌ Erro ao contar subFilters: {e}")
        subfilters_count = 0
    
    # Total
    total = filters_count + subfilters_count
    print(f"\n📊 TOTAIS:")
    print(f"   📂 Filters: {filters_count}")
    print(f"   📂 SubFilters: {subfilters_count}")
    print(f"   🔢 TOTAL: {total}")
    
    # Compare with what we expected
    print(f"\n🎯 COMPARAÇÃO:")
    print(f"   💡 Esperávamos: 1.331 total (7 filters + 1.324 subFilters)")
    print(f"   📋 Temos: {total} total ({filters_count} filters + {subfilters_count} subFilters)")
    
    difference = total - 1331
    if difference == 0:
        print(f"   ✅ PERFEITO! Números batem")
    elif difference > 0:
        print(f"   ⚠️  {difference} itens A MAIS que o esperado")
    else:
        print(f"   ❌ {abs(difference)} itens FALTANDO")
    
    return {
        'filters': filters_count,
        'subfilters': subfilters_count,
        'total': total,
        'expected': 1331,
        'difference': difference
    }

if __name__ == "__main__":
    simple_count() 