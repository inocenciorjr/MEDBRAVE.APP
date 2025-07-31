import json
import uuid
from datetime import datetime
import sys
import os
from dotenv import load_dotenv

# Carregar variáveis do arquivo .env (3 níveis acima = raiz do projeto)
load_dotenv('../../../.env')

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ Firebase Admin SDK não está instalado.")
    print("Execute: pip install firebase-admin")
    sys.exit(1)

def initialize_firebase():
    """Inicializa a conexão com o Firebase usando o mesmo arquivo que o backend."""
    try:
        if not firebase_admin._apps:
            # Usar o mesmo arquivo que o backend: firebase-credentials.json
            credentials_path = "../../../firebase-credentials.json"
            
            if os.path.exists(credentials_path):
                print(f"✅ Usando credenciais do backend: {credentials_path}")
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred)
            else:
                print("❌ Arquivo firebase-credentials.json não encontrado")
                return None
        
        db = firestore.client()
        print("✅ Conexão com Firestore estabelecida!")
        return db
    except Exception as e:
        print(f"❌ Erro ao conectar com Firestore: {e}")
        print("Certifique-se de que as credenciais do Firebase estão configuradas.")
        return None

def create_filter_document(db, name, category="MEDICAL_SPECIALTY"):
    """Cria um documento de filtro no Firestore."""
    try:
        filter_ref = db.collection('filters').document()
        filter_data = {
            'id': filter_ref.id,
            'name': name,
            'category': category,
            'status': 'ACTIVE',
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        }
        
        filter_ref.set(filter_data)
        print(f"✅ Filtro '{name}' criado com ID: {filter_ref.id}")
        return filter_ref.id
        
    except Exception as e:
        print(f"❌ Erro ao criar filtro '{name}': {e}")
        return None

def create_subfilter_document(db, filter_id, name, parent_id=None):
    """Cria um documento de subfiltro no Firestore."""
    try:
        subfilter_ref = db.collection('subFilters').document()
        subfilter_data = {
            'id': subfilter_ref.id,
            'name': name,
            'filterId': filter_id,
            'status': 'ACTIVE',
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        }
        
        if parent_id:
            subfilter_data['parentId'] = parent_id
        
        subfilter_ref.set(subfilter_data)
        level_indicator = "  " if parent_id else ""
        print(f"✅ {level_indicator}Subfiltro '{name}' criado com ID: {subfilter_ref.id}")
        return subfilter_ref.id
        
    except Exception as e:
        print(f"❌ Erro ao criar subfiltro '{name}': {e}")
        return None

def import_subfilters_recursive(db, filter_id, subfilter_list, parent_id=None, level=0):
    """Importa subfiltros recursivamente."""
    stats = {'created': 0, 'failed': 0}
    
    for item in subfilter_list:
        # Extrair nome do subfiltro
        name = None
        children = []
        
        if isinstance(item, str):
            name = item
        elif isinstance(item, dict):
            name = item.get('nome') or item.get('assunto')
            children = item.get('assuntos', [])
            
            # Converter array de strings para formato dict
            if isinstance(children, list) and all(isinstance(i, str) for i in children):
                children = [{'assunto': child_name} for child_name in children]
        
        if not name:
            print(f"⚠️  Pulando item sem nome no nível {level}")
            continue
        
        # Criar o subfiltro
        subfilter_id = create_subfilter_document(db, filter_id, name, parent_id)
        
        if subfilter_id:
            stats['created'] += 1
            
            # Processar filhos recursivamente
            if children:
                child_stats = import_subfilters_recursive(
                    db, filter_id, children, subfilter_id, level + 1
                )
                stats['created'] += child_stats['created']
                stats['failed'] += child_stats['failed']
        else:
            stats['failed'] += 1
    
    return stats

def main():
    print("🔄 Iniciando importação direta para Firestore...")
    
    # Verificar se o arquivo JSON existe
    json_file = "merged_filters.json"
    if not os.path.exists(json_file):
        print(f"❌ Arquivo {json_file} não encontrado!")
        return False
    
    # Inicializar Firebase
    db = initialize_firebase()
    if not db:
        return False
    
    # Carregar dados JSON
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"📄 Carregados {len(data)} especialidades do arquivo JSON")
    except Exception as e:
        print(f"❌ Erro ao ler arquivo JSON: {e}")
        return False
    
    # Processar cada especialidade
    total_stats = {'filters_created': 0, 'subfilters_created': 0, 'failed': 0}
    
    for item in data:
        especialidade_name = item.get('especialidade')
        subespecialidades = item.get('subespecialidades', [])
        
        if not especialidade_name:
            print("⚠️  Pulando item sem nome de especialidade")
            continue
        
        print(f"\n🏥 Processando: {especialidade_name}")
        
        # Criar filtro principal
        filter_id = create_filter_document(db, especialidade_name)
        if filter_id:
            total_stats['filters_created'] += 1
            
            # Importar subfiltros
            if subespecialidades:
                print(f"📋 Importando {len(subespecialidades)} subespecialidades...")
                subfilter_stats = import_subfilters_recursive(
                    db, filter_id, subespecialidades
                )
                total_stats['subfilters_created'] += subfilter_stats['created']
                total_stats['failed'] += subfilter_stats['failed']
            else:
                print("📝 Nenhuma subespecialidade encontrada")
        else:
            total_stats['failed'] += 1
    
    # Resumo final
    print("\n" + "="*50)
    print("📊 RESUMO DA IMPORTAÇÃO")
    print("="*50)
    print(f"✅ Filtros criados: {total_stats['filters_created']}")
    print(f"✅ Subfiltros criados: {total_stats['subfilters_created']}")
    print(f"❌ Falhas: {total_stats['failed']}")
    print("="*50)
    
    if total_stats['failed'] == 0:
        print("🎉 Importação concluída com sucesso!")
        return True
    else:
        print(f"⚠️  Importação concluída com {total_stats['failed']} falhas.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 