import firebase_admin
from firebase_admin import credentials, firestore
import os

def clear_all_filters():
    try:
        # Caminho para o arquivo de credenciais
        service_account_path = os.path.join('..', '..', '..', 'firebase-credentials.json')
        
        # Inicializar Firebase Admin SDK
        if not firebase_admin._apps:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
        
        # Conectar ao Firestore
        db = firestore.client()
        
        print("🗑️  Iniciando limpeza completa dos filtros...")
        
        # Buscar todos os filtros
        filters_ref = db.collection('filters')
        filters = filters_ref.get()
        
        total_filters = len(filters)
        print(f"📋 Encontrados {total_filters} filtros para deletar")
        
        # Deletar cada filtro e seus subfiltros
        for i, filter_doc in enumerate(filters, 1):
            filter_data = filter_doc.to_dict()
            filter_name = filter_data.get('name', 'Nome não encontrado')
            print(f"🗑️  [{i}/{total_filters}] Deletando filtro: {filter_name}")
            
            # Deletar todos os subfiltros deste filtro
            subfilters_ref = db.collection('filters').document(filter_doc.id).collection('subFilters')
            subfilters = subfilters_ref.get()
            
            subfilter_count = len(subfilters)
            if subfilter_count > 0:
                print(f"   ├── Deletando {subfilter_count} subfiltros...")
                
                # Deletar subfiltros em lotes para eficiência
                batch = db.batch()
                batch_count = 0
                
                for subfilter in subfilters:
                    batch.delete(subfilters_ref.document(subfilter.id))
                    batch_count += 1
                    
                    # Executar lote a cada 500 operações
                    if batch_count >= 500:
                        batch.commit()
                        batch = db.batch()
                        batch_count = 0
                
                # Executar último lote se houver operações pendentes
                if batch_count > 0:
                    batch.commit()
                
                print(f"   ✅ {subfilter_count} subfiltros deletados")
            
            # Deletar o filtro principal
            filters_ref.document(filter_doc.id).delete()
            print(f"   ✅ Filtro '{filter_name}' deletado")
        
        print("\n" + "="*50)
        print("🗑️  LIMPEZA COMPLETA FINALIZADA")
        print("="*50)
        print(f"✅ {total_filters} filtros deletados")
        print("✅ Todos os subfiltros deletados")
        print("✅ Base de dados limpa e pronta para nova importação")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Erro durante a limpeza: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    success = clear_all_filters()
    if success:
        print("\n🎯 Agora você pode executar o script de importação!")
        print("   python direct_firestore_importer.py")
    else:
        print("\n❌ Falha na limpeza. Verifique os erros acima.") 