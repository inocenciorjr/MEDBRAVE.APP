#!/usr/bin/env python3
"""
Script para investigar como as questões referenciam os filtros
Objetivo: descobrir quais filtros estão sendo usados pelas questões
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
from collections import defaultdict

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

def explore_collections(db):
    """Explore all collections to find questions."""
    print("\n🔍 EXPLORANDO COLEÇÕES DO FIREBASE")
    print("=" * 50)
    
    collections = db.collections()
    for collection in collections:
        col_id = collection.id
        print(f"\n📂 COLEÇÃO: {col_id}")
        
        # Get sample documents
        try:
            docs = collection.limit(3).stream()
            doc_count = 0
            
            for doc in docs:
                doc_count += 1
                data = doc.to_dict()
                
                print(f"   📄 Documento {doc.id}:")
                print(f"      📋 Campos: {list(data.keys())}")
                
                # Look for filter-related fields
                filter_fields = []
                for key in data.keys():
                    if any(word in key.lower() for word in ['filter', 'categoria', 'especialidade', 'assunto']):
                        filter_fields.append(key)
                        print(f"      🎯 Campo interessante: {key} = {data[key]}")
                
                # Check for arrays that might contain filter IDs
                for key, value in data.items():
                    if isinstance(value, list) and len(value) > 0:
                        print(f"      📋 Array: {key} = {value[:3]}...")
                        
            if doc_count == 0:
                print(f"   ⚠️  Coleção vazia")
            else:
                # Try to get total count
                try:
                    total_docs = len(list(collection.stream()))
                    print(f"   📊 Total de documentos: {total_docs}")
                except:
                    print(f"   📊 Total: mais que 3 documentos")
                    
        except Exception as e:
            print(f"   ❌ Erro ao explorar: {e}")

def find_questions_collection(db):
    """Try to identify the questions collection."""
    print("\n🔍 PROCURANDO COLEÇÃO DE QUESTÕES")
    print("=" * 50)
    
    # Common names for questions collections
    possible_names = ['questions', 'questoes', 'perguntas', 'quiz', 'exams', 'tests']
    
    for name in possible_names:
        try:
            collection = db.collection(name)
            docs = list(collection.limit(1).stream())
            
            if docs:
                print(f"✅ Encontrada coleção: {name}")
                doc_data = docs[0].to_dict()
                print(f"   📋 Campos: {list(doc_data.keys())}")
                return name
        except:
            continue
    
    print("⚠️  Não encontrei coleção óbvia de questões")
    return None

def analyze_filter_usage(db):
    """Analyze which filters are being used."""
    print("\n📊 ANALISANDO USO DOS FILTROS")
    print("=" * 50)
    
    # Look in common collections that might reference filters
    collections_to_check = ['questions', 'questoes', 'userAnswers', 'responses', 'simulados']
    
    used_filter_ids = set()
    used_subfilter_ids = set()
    
    for col_name in collections_to_check:
        try:
            collection = db.collection(col_name)
            docs = collection.stream()
            
            doc_count = 0
            for doc in docs:
                doc_count += 1
                data = doc.to_dict()
                
                # Look for filter references
                for key, value in data.items():
                    if isinstance(value, str) and len(value) == 20:  # Firestore ID length
                        if any(word in key.lower() for word in ['filter', 'categoria']):
                            used_filter_ids.add(value)
                    elif isinstance(value, list):
                        for item in value:
                            if isinstance(item, str) and len(item) == 20:
                                used_subfilter_ids.add(item)
                
                if doc_count >= 100:  # Limit for performance
                    break
                    
            if doc_count > 0:
                print(f"✅ Coleção '{col_name}': {doc_count} docs analisados")
            
        except Exception as e:
            print(f"⚠️  Coleção '{col_name}' não encontrada ou erro: {e}")
    
    print(f"\n📊 RESULTADO:")
    print(f"   🎯 Filter IDs usados: {len(used_filter_ids)}")
    print(f"   🎯 SubFilter IDs usados: {len(used_subfilter_ids)}")
    
    return used_filter_ids, used_subfilter_ids

def main():
    print("🔍 INVESTIGAÇÃO DE QUESTÕES E FILTROS")
    print("=" * 60)
    
    db = initialize_firebase()
    if not db:
        return False
    
    # 1. Explore all collections
    explore_collections(db)
    
    # 2. Try to find questions
    questions_col = find_questions_collection(db)
    
    # 3. Analyze filter usage
    used_filters, used_subfilters = analyze_filter_usage(db)
    
    # Save results
    results = {
        'used_filter_ids': list(used_filters),
        'used_subfilter_ids': list(used_subfilters),
        'questions_collection': questions_col
    }
    
    with open('filter_usage_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Resultados salvos em 'filter_usage_analysis.json'")
    
    return True

if __name__ == "__main__":
    main() 