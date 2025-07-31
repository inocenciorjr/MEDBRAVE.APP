#!/usr/bin/env python3
"""
Script para testar autenticação no MedForum
"""

import requests
import json

def test_auth_endpoints():
    """Testa diferentes endpoints de autenticação."""
    
    BASE_URL = "http://localhost:5000"
    
    print("🔍 TESTANDO ENDPOINTS DE AUTENTICAÇÃO")
    print("="*50)
    
    # Credenciais
    email = "inocencio_jr3@hotmail.com"
    password = "eudapromaq123"
    
    # Teste 1: Login
    print("1️⃣ Testando LOGIN...")
    token = None
    try:
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"   Status: {login_response.status_code}")
        if login_response.status_code == 200:
            print(f"   ✅ Login funcionou!")
            login_data = login_response.json()
            token = login_data.get('token')
            print(f"   Token: {token[:50] if token else 'N/A'}...")
        else:
            print(f"   ❌ Login falhou: {login_response.text[:200]}...")
    except Exception as e:
        print(f"   ❌ Erro na requisição: {e}")
    
    # Teste 2: Testar endpoints protegidos com token
    if token:
        print("\n2️⃣ Testando endpoints protegidos COM TOKEN...")
        
        headers_with_token = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        protected_endpoints = [
            "/api/filters",
            "/api/users"
        ]
        
        for endpoint in protected_endpoints:
            try:
                response = requests.get(f"{BASE_URL}{endpoint}", headers=headers_with_token, timeout=5)
                print(f"   GET {endpoint}: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    if endpoint == "/api/filters":
                        filter_count = len(data) if isinstance(data, list) else len(data.get("filters", []))
                        print(f"     ✅ Encontrados {filter_count} filtros")
                    else:
                        print(f"     ✅ Resposta: {str(data)[:100]}...")
                else:
                    print(f"     ❌ Erro: {response.text[:200]}...")
            except Exception as e:
                print(f"   GET {endpoint}: Erro - {e}")
    
    # Teste 3: Verificar se usuário tem role admin
    if token:
        print("\n3️⃣ Testando informações do usuário...")
        try:
            headers_with_token = {
                "Content-Type": "application/json", 
                "Authorization": f"Bearer {token}"
            }
            
            user_response = requests.get(
                f"{BASE_URL}/api/auth/me",
                headers=headers_with_token,
                timeout=10
            )
            print(f"   GET /api/auth/me: {user_response.status_code}")
            if user_response.status_code == 200:
                user_data = user_response.json()
                print(f"     ✅ User role: {user_data.get('role', 'N/A')}")
                print(f"     ✅ User email: {user_data.get('email', 'N/A')}")
            else:
                print(f"     ❌ Erro: {user_response.text[:200]}...")
        except Exception as e:
            print(f"   ❌ Erro: {e}")
    
    # Teste 4: Endpoints sem autenticação
    print("\n4️⃣ Testando outros endpoints SEM TOKEN...")
    
    endpoints_to_test = [
        "/api/auth/forgot-password"
    ]
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            print(f"   GET {endpoint}: {response.status_code}")
        except Exception as e:
            print(f"   GET {endpoint}: Erro - {e}")
    
    # Teste 5: Tentar registrar o usuário no banco local
    print("\n5️⃣ Testando REGISTRO do usuário no banco local...")
    try:
        register_payload = {
            "email": email,
            "password": password,
            "name": "Admin Inocencio Jr",
            "role": "admin"
        }
        
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=register_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"   POST /api/auth/register: {register_response.status_code}")
        if register_response.status_code in [200, 201]:
            register_data = register_response.json()
            print(f"     ✅ Registro funcionou!")
            print(f"     ✅ User ID: {register_data.get('id', 'N/A')}")
            print("     ✅ Agora tente fazer login novamente!")
        elif register_response.status_code == 409:
            print(f"     ⚠️  Usuário já existe: {register_response.text[:200]}...")
        else:
            print(f"     ❌ Registro falhou: {register_response.text[:200]}...")
    except Exception as e:
        print(f"   ❌ Erro no registro: {e}")

    # Teste 6: Tentar criar usuário diretamente via admin
    print("\n6️⃣ Testando criação de usuário via endpoint admin...")
    try:
        admin_payload = {
            "uid": "rF9f5bov4BY8KqUGoyJjp7XSID12",  # UID do Firebase visível no token
            "email": email,
            "name": "Admin Inocencio Jr",
            "role": "admin"
        }
        
        admin_response = requests.post(
            f"{BASE_URL}/api/admin/users",
            json=admin_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"   POST /api/admin/users: {admin_response.status_code}")
        if admin_response.status_code in [200, 201]:
            print(f"     ✅ Criação via admin funcionou!")
        else:
            print(f"     ❌ Criação falhou: {admin_response.text[:200]}...")
    except Exception as e:
        print(f"   ❌ Erro na criação: {e}")

    return token

if __name__ == "__main__":
    result = test_auth_endpoints()
    
    if result:
        print(f"\n🎉 Sucesso! Resultado: {result}")
        print("✅ Agora você pode tentar executar o script de importação novamente!")
    else:
        print(f"\n❌ Nenhum método de autenticação funcionou.")
        print("💡 Possíveis soluções:")
        print("   • Verificar se o Firebase está configurado corretamente")
        print("   • Verificar se o usuário existe no Firebase Auth")
        print("   • Verificar permissões do projeto Firebase") 