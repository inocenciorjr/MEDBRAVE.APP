#!/usr/bin/env python3
"""
Análise detalhada das datas para identificar filtros originais vs importados
"""

import firebase_admin
from firebase_admin import credentials, firestore

def initialize_firebase():
    if firebase_admin._apps:
        firebase_admin.delete_app(firebase_admin.get_app())
    
    cred = credentials.Certificate('../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json')
    firebase_admin.initialize_app(cred)
    return firestore.client()

def analyze_detailed():
    db = initialize_firebase()
    
    print("🔍 ANÁLISE DETALHADA DE DATAS")
    print("=" * 50)
    
    # Analyze subFilters
    print("\n📂 SUBFILTERS:")
    subfilters_ref = db.collection('subFilters')
    all_subfilters = list(subfilters_ref.stream())
    
    by_date = {}
    without_date = []
    
    for doc in all_subfilters:
        data = doc.to_dict()
        created_at = data.get('createdAt')
        
        if created_at:
            if hasattr(created_at, 'strftime'):
                date_str = created_at.strftime('%Y-%m-%d')
            else:
                date_str = str(created_at)[:10]
            
            if date_str not in by_date:
                by_date[date_str] = []
            by_date[date_str].append({
                'id': doc.id,
                'name': data.get('name', 'N/A')[:50]  # Limit name length
            })
        else:
            without_date.append({
                'id': doc.id,
                'name': data.get('name', 'N/A')[:50]
            })
    
    print(f"📊 Distribuição por data:")
    for date in sorted(by_date.keys()):
        items = by_date[date]
        print(f"   📅 {date}: {len(items)} subFilters")
        
        # Show some examples for suspicious dates
        if len(items) > 100:  # Suspicious large imports
            print(f"      📋 Exemplos:")
            for i, item in enumerate(items[:3]):
                print(f"         {i+1}. {item['name']}")
            print(f"         ... e mais {len(items) - 3}")
    
    print(f"\n⚠️  SEM DATA: {len(without_date)} subFilters")
    if without_date:
        print(f"   📋 Exemplos (podem ser os ORIGINAIS):")
        for i, item in enumerate(without_date[:5]):
            print(f"      {i+1}. {item['name']}")
        if len(without_date) > 5:
            print(f"      ... e mais {len(without_date) - 5}")
    
    # Calculate what would be "original"
    print(f"\n🧮 ESTIMATIVA DE FILTROS ORIGINAIS:")
    
    # Assume filters without date + pre-import are originals
    original_candidates = len(without_date)
    
    # Check for dates before massive import (before 2025-05-27)
    for date in sorted(by_date.keys()):
        if date < "2025-05-27":
            original_candidates += len(by_date[date])
            print(f"   📅 {date}: {len(by_date[date])} (provável original)")
    
    print(f"   📊 Total estimado de originais: {original_candidates}")
    
    # Identify suspicious imports
    print(f"\n🚨 IMPORTAÇÕES SUSPEITAS:")
    for date in sorted(by_date.keys()):
        if len(by_date[date]) > 500:  # Large imports
            print(f"   📅 {date}: {len(by_date[date])} subFilters (SUSPEITO!)")
    
    print(f"\n📊 RESUMO:")
    print(f"   📂 Total atual: {len(all_subfilters)} subFilters")
    print(f"   📅 Com data: {sum(len(items) for items in by_date.values())}")
    print(f"   ⚠️  Sem data: {len(without_date)}")
    print(f"   🎯 Estimativa originais: {original_candidates}")
    print(f"   🗑️  Para excluir: {len(all_subfilters) - original_candidates}")

if __name__ == "__main__":
    analyze_detailed() 