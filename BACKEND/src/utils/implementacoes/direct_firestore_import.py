#!/usr/bin/env python3
"""
Script de importação direta no Firestore - sem API
Importa os dados mesclados diretamente no banco Firebase
"""

import json
import os
from typing import Dict, List
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter

def initialize_firebase():
    """Inicializa o Firebase Admin SDK."""
    try:
        # Procurar arquivo de credenciais
        possible_paths = [
            "serviceAccountKey.json",
            "../serviceAccountKey.json", 
            "../../serviceAccountKey.json",
            "firebase-key.json",
            "firebase-admin-key.json"
        ]
        
        service_account_path = None
        for path in possible_paths:
            if os.path.exists(path):
                service_account_path = path
                break
        
        if service_account_path:
            print(f"📋 Usando service account: {service_account_path}")
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
        else:
            print("🔑 Tentando usar credenciais padrão do ambiente...")
            # Usar credenciais padrão do ambiente
            firebase_admin.initialize_app()
        
        db = firestore.client()
        print("✅ Firebase inicializado com sucesso!")
        return db
        
    except Exception as e:
        print(f"❌ Erro ao inicializar Firebase: {e}")
        return None

def import_filters_to_firestore(db, filters_data):
    """Importa filtros diretamente no Firestore."""
    
    print("🚀 Iniciando importação direta no Firestore...")
    
    filters_collection = db.collection('filters')
    subfilters_collection = db.collection('subfilters')
    
    total_created = 0
    
    for especialidade_data in filters_data:
        esp_name = especialidade_data["especialidade"]
        
        print(f"\n📚 Processando: {esp_name}")
        
        # Verificar se especialidade já existe
        existing_filter = filters_collection.where(
            filter=FieldFilter("name", "==", esp_name)
        ).limit(1).get()
        
        if existing_filter:
            filter_doc = existing_filter[0]
            filter_id = filter_doc.id
            print(f"   ♻️  Especialidade já existe: {filter_id}")
        else:
            # Criar nova especialidade
            filter_ref = filters_collection.add({
                'name': esp_name,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            filter_id = filter_ref[1].id
            print(f"   ✅ Especialidade criada: {filter_id}")
            total_created += 1
        
        # Processar subespecialidades
        for sub_data in especialidade_data["subespecialidades"]:
            sub_name = sub_data["nome"]
            assuntos = sub_data["assuntos"]
            
            print(f"     📖 Processando subespecialidade: {sub_name}")
            
            # Verificar se subespecialidade já existe
            existing_sub = subfilters_collection.where(
                filter=FieldFilter("name", "==", sub_name)
            ).where(
                filter=FieldFilter("filterId", "==", filter_id)
            ).where(
                filter=FieldFilter("parentId", "==", None)
            ).limit(1).get()
            
            if existing_sub:
                sub_doc = existing_sub[0]
                sub_id = sub_doc.id
                print(f"       ♻️  Subespecialidade já existe: {sub_id}")
            else:
                # Criar nova subespecialidade
                sub_ref = subfilters_collection.add({
                    'name': sub_name,
                    'filterId': filter_id,
                    'parentId': None,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
                sub_id = sub_ref[1].id
                print(f"       ✅ Subespecialidade criada: {sub_id}")
                total_created += 1
            
            # Processar assuntos
            assuntos_criados = 0
            for assunto in assuntos:
                print(f"         📝 Processando assunto: {assunto[:50]}...")
                
                # Verificar se assunto já existe
                existing_assunto = subfilters_collection.where(
                    filter=FieldFilter("name", "==", assunto)
                ).where(
                    filter=FieldFilter("filterId", "==", filter_id)
                ).where(
                    filter=FieldFilter("parentId", "==", sub_id)
                ).limit(1).get()
                
                if not existing_assunto:
                    # Criar novo assunto
                    subfilters_collection.add({
                        'name': assunto,
                        'filterId': filter_id,
                        'parentId': sub_id,
                        'createdAt': firestore.SERVER_TIMESTAMP,
                        'updatedAt': firestore.SERVER_TIMESTAMP
                    })
                    assuntos_criados += 1
                    total_created += 1
            
            print(f"       📝 Assuntos criados: {assuntos_criados}/{len(assuntos)}")
    
    print(f"\n🎉 Importação concluída!")
    print(f"📊 Total de itens criados: {total_created}")
    return True

def main():
    """Função principal."""
    print("🔥 IMPORTAÇÃO DIRETA NO FIRESTORE")
    print("="*50)
    
    # Inicializar Firebase
    db = initialize_firebase()
    if not db:
        print("❌ Não foi possível conectar ao Firebase")
        return False
    
    # Carregar dados mesclados
    try:
        with open("merged_filters.json", "r", encoding="utf-8") as f:
            filters_data = json.load(f)
        print(f"📄 Carregados {len(filters_data)} especialidades do arquivo mesclado")
    except Exception as e:
        print(f"❌ Erro ao carregar dados: {e}")
        return False
    
    # Importar dados
    success = import_filters_to_firestore(db, filters_data)
    
    if success:
        print("\n✅ Importação realizada com sucesso!")
        print("🔍 Verifique no Firebase Console se os dados foram criados.")
    else:
        print("\n❌ Falha na importação.")
    
    return success

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏹️ Importação interrompida pelo usuário")
    except Exception as e:
        print(f"\n💥 Erro inesperado: {e}")
        import traceback
        traceback.print_exc() 