#!/usr/bin/env python3
"""
Script Completo para Organizar Hierarquia de 4 Níveis no Firebase
1. Cria pais órfãos como subfiltros independentes
2. Organiza todos os relacionamentos pai-filho
3. Conecta à estrutura filtro->subfiltro correta
"""

import json
import sys
import os
import time
from typing import Dict, List, Optional, Tuple

# Importações Firebase
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ Erro: firebase-admin não está instalado.")
    print("Execute: pip install firebase-admin")
    sys.exit(1)

# Configuração
SERVICE_ACCOUNT_PATH = "serviceAccountKey.json"

def initialize_firebase():
    """Inicializa conexão com Firebase"""
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        print(f"❌ Arquivo {SERVICE_ACCOUNT_PATH} não encontrado!")
        print("Baixe a chave de serviço do Firebase Console")
        return None
    
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        print("✅ Conectado ao Firebase com sucesso!")
        return db
    except Exception as e:
        print(f"❌ Erro ao conectar no Firebase: {e}")
        return None

def load_hierarchy_data():
    """Carrega e analisa dados hierárquicos do JSON"""
    with open('merged_filters.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    hierarchy_plan = []
    
    for especialidade in data:
        esp_name = especialidade.get('especialidade', '')
        
        for subesp in especialidade.get('subespecialidades', []):
            subesp_name = subesp.get('nome', '')
            assuntos = subesp.get('assuntos', [])
            
            # Analisar hierarquia dentro dos assuntos
            assuntos_pais = set()
            assuntos_filhos = []
            
            for assunto in assuntos:
                if ' - ' in assunto:
                    parts = assunto.split(' - ', 1)
                    pai = parts[0].strip()
                    filho = parts[1].strip()
                    
                    assuntos_pais.add(pai)
                    assuntos_filhos.append({
                        'pai': pai,
                        'filho': filho,
                        'nome_completo': assunto
                    })
            
            # Verificar pais órfãos
            pais_orfaos = []
            for pai in assuntos_pais:
                if pai not in assuntos:
                    pais_orfaos.append(pai)
            
            if pais_orfaos or assuntos_filhos:
                hierarchy_plan.append({
                    'especialidade': esp_name,
                    'subespecialidade': subesp_name,
                    'pais_orfaos': pais_orfaos,
                    'relacoes_pai_filho': assuntos_filhos,
                    'todos_assuntos': assuntos
                })
    
    return hierarchy_plan

def get_filter_by_name(db, filter_name: str) -> Optional[str]:
    """Busca ID do filtro pelo nome"""
    try:
        filters_ref = db.collection('filters')
        query = filters_ref.where('name', '==', filter_name).limit(1)
        results = query.get()
        
        for doc in results:
            return doc.id
        return None
    except Exception as e:
        print(f"❌ Erro ao buscar filtro '{filter_name}': {e}")
        return None

def get_subfilter_by_name(db, filter_id: str, subfilter_name: str) -> Optional[str]:
    """Busca ID do subfiltro pelo nome dentro de um filtro"""
    try:
        subfilters_ref = db.collection('subFilters')
        query = subfilters_ref.where('filterId', '==', filter_id).where('name', '==', subfilter_name).limit(1)
        results = query.get()
        
        for doc in results:
            return doc.id
        return None
    except Exception as e:
        print(f"❌ Erro ao buscar subfiltro '{subfilter_name}': {e}")
        return None

def create_subfilter(db, filter_id: str, name: str, parent_id: Optional[str] = None) -> Optional[str]:
    """Cria um novo subfiltro"""
    try:
        subfilter_data = {
            'name': name,
            'filterId': filter_id,
            'parentId': parent_id,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        
        doc_ref = db.collection('subFilters').add(subfilter_data)
        subfilter_id = doc_ref[1].id
        print(f"✅ Subfiltro criado: '{name}' (ID: {subfilter_id})")
        return subfilter_id
    except Exception as e:
        print(f"❌ Erro ao criar subfiltro '{name}': {e}")
        return None

def update_subfilter_parent(db, subfilter_id: str, parent_id: str) -> bool:
    """Atualiza o parentId de um subfiltro"""
    try:
        db.collection('subFilters').document(subfilter_id).update({
            'parentId': parent_id,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        return True
    except Exception as e:
        print(f"❌ Erro ao atualizar parentId do subfiltro {subfilter_id}: {e}")
        return False

def fix_complete_hierarchy(db, hierarchy_plan):
    """Corrige toda a hierarquia baseada no plano"""
    print("\n🔧 INICIANDO CORREÇÃO HIERÁRQUICA COMPLETA")
    print("=" * 60)
    
    total_updates = 0
    total_created = 0
    
    for item in hierarchy_plan:
        esp_name = item['especialidade']
        subesp_name = item['subespecialidade']
        pais_orfaos = item['pais_orfaos']
        relacoes = item['relacoes_pai_filho']
        
        print(f"\n📂 {esp_name} > {subesp_name}")
        
        # 1. Buscar filtro da especialidade
        filter_id = get_filter_by_name(db, esp_name)
        if not filter_id:
            print(f"   ❌ Filtro '{esp_name}' não encontrado")
            continue
        
        # 2. Buscar subfiltro da subespecialidade (pai dos pais)
        parent_subfilter_id = get_subfilter_by_name(db, filter_id, subesp_name)
        if not parent_subfilter_id:
            print(f"   ❌ Subfiltro '{subesp_name}' não encontrado")
            continue
        
        print(f"   ✅ Filtro ID: {filter_id}, Subfiltro Pai ID: {parent_subfilter_id}")
        
        # 3. Criar pais órfãos
        pais_ids = {}
        for pai_orfao in pais_orfaos:
            print(f"   🔨 Criando pai órfão: '{pai_orfao}'")
            pai_id = create_subfilter(db, filter_id, pai_orfao, parent_subfilter_id)
            if pai_id:
                pais_ids[pai_orfao] = pai_id
                total_created += 1
                time.sleep(0.1)  # Rate limiting
        
        # 4. Buscar IDs dos pais que já existem
        for relacao in relacoes:
            pai_nome = relacao['pai']
            if pai_nome not in pais_ids:
                pai_id = get_subfilter_by_name(db, filter_id, pai_nome)
                if pai_id:
                    pais_ids[pai_nome] = pai_id
                else:
                    print(f"   ⚠️ Pai '{pai_nome}' não encontrado nem criado")
        
        # 5. Organizar filhos sob seus pais
        for relacao in relacoes:
            pai_nome = relacao['pai']
            filho_nome = relacao['nome_completo']
            
            if pai_nome not in pais_ids:
                print(f"   ❌ Pai '{pai_nome}' não disponível para '{filho_nome}'")
                continue
            
            pai_id = pais_ids[pai_nome]
            
            # Buscar o filho
            filho_id = get_subfilter_by_name(db, filter_id, filho_nome)
            if not filho_id:
                print(f"   ⚠️ Filho '{filho_nome}' não encontrado")
                continue
            
            # Atualizar parentId do filho
            if update_subfilter_parent(db, filho_id, pai_id):
                print(f"   ✅ '{filho_nome}' → pai: '{pai_nome}'")
                total_updates += 1
            else:
                print(f"   ❌ Falha ao conectar '{filho_nome}' → '{pai_nome}'")
            
            time.sleep(0.1)  # Rate limiting
    
    print("\n" + "=" * 60)
    print("📊 RESUMO DA CORREÇÃO:")
    print(f"Subfiltros pais criados: {total_created}")
    print(f"Relacionamentos pai-filho atualizados: {total_updates}")
    print("=" * 60)
    
    return total_created, total_updates

def main():
    print("🚀 CORREÇÃO HIERÁRQUICA COMPLETA - 4 NÍVEIS")
    print("Especialidade > Subespecialidade > Assunto Pai > Assunto Filho")
    print("=" * 70)
    
    # 1. Inicializar Firebase
    db = initialize_firebase()
    if not db:
        return False
    
    # 2. Carregar plano hierárquico
    print("\n📊 Carregando dados hierárquicos...")
    hierarchy_plan = load_hierarchy_data()
    
    problemas_total = sum(len(item['pais_orfaos']) for item in hierarchy_plan)
    relacoes_total = sum(len(item['relacoes_pai_filho']) for item in hierarchy_plan)
    
    print(f"Encontrados {problemas_total} pais órfãos para criar")
    print(f"Encontradas {relacoes_total} relações pai-filho para organizar")
    
    if problemas_total == 0 and relacoes_total == 0:
        print("✅ Nenhuma correção necessária!")
        return True
    
    # 3. Confirmação
    print(f"\n⚠️ Esta operação irá:")
    print(f"- Criar {problemas_total} novos subfiltros pais")
    print(f"- Atualizar {relacoes_total} relacionamentos pai-filho")
    
    confirm = input("\nContinuar? (s/n): ").lower().strip()
    if confirm != 's':
        print("❌ Operação cancelada pelo usuário")
        return False
    
    # 4. Executar correção
    created, updated = fix_complete_hierarchy(db, hierarchy_plan)
    
    print(f"\n🎉 CORREÇÃO CONCLUÍDA!")
    print(f"✅ {created} pais criados")
    print(f"✅ {updated} filhos organizados")
    print(f"🏗️ Hierarquia de 4 níveis estabelecida com sucesso!")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 