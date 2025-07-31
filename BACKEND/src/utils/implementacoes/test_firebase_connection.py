#!/usr/bin/env python3
"""
Script simples para testar a conexão com Firebase
"""
import json
import os

def test_firebase_connections():
    print("🔍 TESTANDO CONEXÕES COM FIREBASE")
    print("="*50)
    
    # Teste 1: Verificar arquivo de credenciais
    print("1️⃣ Verificando arquivo de credenciais...")
    
    credential_files = [
        "serviceAccountKey.json",
        "../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json"
    ]
    
    for file_path in credential_files:
        if os.path.exists(file_path):
            print(f"   ✅ Encontrado: {file_path}")
            try:
                with open(file_path, 'r') as f:
                    creds = json.load(f)
                print(f"   📋 Project ID: {creds.get('project_id')}")
                print(f"   📋 Client Email: {creds.get('client_email')}")
                print(f"   📋 Private Key ID: {creds.get('private_key_id')}")
            except Exception as e:
                print(f"   ❌ Erro ao ler arquivo: {e}")
        else:
            print(f"   ❌ Não encontrado: {file_path}")
    
    # Teste 2: Tentar conectar com Firebase Admin
    print("\n2️⃣ Testando conexão com Firebase Admin...")
    
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        
        # Limpar aplicações anteriores
        try:
            firebase_admin.delete_app(firebase_admin.get_app())
        except:
            pass
        
        # Testar com arquivo local
        if os.path.exists("serviceAccountKey.json"):
            print("   🔐 Tentando com serviceAccountKey.json...")
            try:
                cred = credentials.Certificate("serviceAccountKey.json")
                app = firebase_admin.initialize_app(cred)
                db = firestore.client()
                
                # Teste simples de leitura
                test_ref = db.collection('filters').limit(1)
                docs = test_ref.get()
                print(f"   ✅ Conexão funcionou! Encontrados documentos: {len(docs)}")
                
                firebase_admin.delete_app(app)
                return True
                
            except Exception as e:
                print(f"   ❌ Erro: {e}")
                try:
                    firebase_admin.delete_app(app)
                except:
                    pass
        
        # Testar com arquivo da raiz
        root_file = "../../../medforum-488ec-firebase-adminsdk-fbsvc-5551c2161a.json"
        if os.path.exists(root_file):
            print("   🔐 Tentando com arquivo da raiz...")
            try:
                cred = credentials.Certificate(root_file)
                app = firebase_admin.initialize_app(cred)
                db = firestore.client()
                
                # Teste simples de leitura
                test_ref = db.collection('filters').limit(1)
                docs = test_ref.get()
                print(f"   ✅ Conexão funcionou! Encontrados documentos: {len(docs)}")
                
                firebase_admin.delete_app(app)
                return True
                
            except Exception as e:
                print(f"   ❌ Erro: {e}")
                try:
                    firebase_admin.delete_app(app)
                except:
                    pass
        
    except ImportError:
        print("   ❌ Firebase Admin SDK não instalado")
        return False
    
    print("\n3️⃣ Diagnóstico:")
    print("   💡 Possíveis soluções:")
    print("   • Baixar nova chave do Firebase Console")
    print("   • Verificar se service account está ativo")
    print("   • Usar script via API do backend")
    
    return False

if __name__ == "__main__":
    test_firebase_connections() 