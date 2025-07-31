#!/usr/bin/env python3
"""
Teste simples de conexão com Firebase
Usando as credenciais corretas do projeto
"""

import json
import os

def test_firebase_connection():
    print("🔧 TESTE SIMPLES DE CONEXÃO FIREBASE")
    print("=" * 50)
    
    # 1. Usar o arquivo de credenciais correto (mesmo do fix_hierarchy_firebase.py)
    cred_file = '../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json'
    print(f"🔍 Verificando credenciais corretas...")
    
    if os.path.exists(cred_file):
        print(f"✅ Arquivo {cred_file} encontrado")
        
        # Tentar ler o arquivo
        try:
            with open(cred_file, 'r') as f:
                creds = json.load(f)
            
            print(f"✅ Arquivo JSON válido")
            print(f"📋 Project ID: {creds.get('project_id', 'N/A')}")
            print(f"📋 Client Email: {creds.get('client_email', 'N/A')}")
            
        except Exception as e:
            print(f"❌ Erro ao ler credenciais: {e}")
            return False
    else:
        print(f"❌ Arquivo {cred_file} não encontrado!")
        return False
    
    # 2. Tentar importar firebase
    print(f"\n🔌 Testando imports...")
    try:
        import firebase_admin
        print(f"✅ firebase_admin importado")
        
        from firebase_admin import credentials, firestore
        print(f"✅ credentials e firestore importados")
        
    except Exception as e:
        print(f"❌ Erro ao importar: {e}")
        return False
    
    # 3. Tentar inicializar Firebase
    print(f"\n🚀 Tentando inicializar Firebase...")
    try:
        # Se já foi inicializado, limpar primeiro
        if firebase_admin._apps:
            firebase_admin.delete_app(firebase_admin.get_app())
            print(f"🧹 App anterior removido")
        
        cred = credentials.Certificate(cred_file)
        app = firebase_admin.initialize_app(cred)
        print(f"✅ Firebase inicializado com sucesso!")
        
        # 4. Tentar conectar ao Firestore
        print(f"\n🗄️  Testando conexão Firestore...")
        db = firestore.client()
        print(f"✅ Cliente Firestore criado")
        
        # 5. Tentar listar coleções
        print(f"\n📋 Testando listagem de coleções...")
        collections = db.collections()
        collection_names = []
        
        for collection in collections:
            collection_names.append(collection.id)
            if len(collection_names) >= 5:  # Limitar para não travar
                break
        
        if collection_names:
            print(f"✅ Coleções encontradas: {collection_names}")
        else:
            print(f"⚠️  Nenhuma coleção encontrada (ou sem permissão)")
        
        # 6. Testar acesso específico às coleções que queremos
        target_collections = ['filters', 'subFilters']
        
        for col_name in target_collections:
            print(f"\n🎯 Testando coleção '{col_name}'...")
            try:
                col_ref = db.collection(col_name)
                
                # Tentar contar documentos (limit 1 para ser rápido)
                docs = col_ref.limit(1).stream()
                count = 0
                for doc in docs:
                    count += 1
                    print(f"   📄 Exemplo: {doc.id}")
                    break
                
                if count > 0:
                    print(f"   ✅ Coleção '{col_name}' acessível")
                else:
                    print(f"   ⚠️  Coleção '{col_name}' vazia ou sem acesso")
                    
            except Exception as e:
                print(f"   ❌ Erro ao acessar '{col_name}': {e}")
        
        print(f"\n🎉 TESTE CONCLUÍDO COM SUCESSO!")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao conectar Firebase: {e}")
        print(f"💡 Possíveis causas:")
        print(f"   - Credenciais inválidas")
        print(f"   - Problemas de rede")
        print(f"   - Permissões insuficientes")
        return False

if __name__ == "__main__":
    test_firebase_connection() 