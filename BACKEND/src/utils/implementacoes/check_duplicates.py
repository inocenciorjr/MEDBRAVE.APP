import json
from collections import defaultdict, Counter

def check_duplicates_in_merged_file():
    """Verifica duplicações no arquivo merged_filters.json"""
    
    try:
        # Carregar arquivo mesclado
        with open('merged_filters.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print("🔍 ANÁLISE DE DUPLICAÇÕES NO ARQUIVO MESCLADO")
        print("=" * 60)
        
        # Estatísticas gerais
        total_specialties = len(data)
        total_subspecialties = 0
        total_topics = 0
        
        # Contadores para detectar duplicações
        specialty_names = []
        subspecialty_names_global = []
        topic_names_global = []
        
        # Duplicações por especialidade
        duplicates_found = False
        
        print(f"📊 Total de especialidades: {total_specialties}")
        print("-" * 60)
        
        # Verificar cada especialidade
        for specialty in data:
            specialty_name = specialty['especialidade']
            specialty_names.append(specialty_name)
            
            subspecialties = specialty.get('subespecialidades', [])
            total_subspecialties += len(subspecialties)
            
            print(f"\n🏥 Especialidade: {specialty_name}")
            print(f"   Subespecialidades: {len(subspecialties)}")
            
            # Verificar duplicações em subespecialidades
            subspecialty_names_local = []
            
            for subspecialty in subspecialties:
                subspec_name = subspecialty['nome']
                subspecialty_names_local.append(subspec_name)
                subspecialty_names_global.append(subspec_name)
                
                topics = subspecialty.get('assuntos', [])
                total_topics += len(topics)
                
                # Verificar duplicações em tópicos
                topic_names_local = []
                
                for topic in topics:
                    # Os tópicos são strings diretas, não objetos
                    topic_names_local.append(topic)
                    topic_names_global.append(topic)
                
                # Checar duplicações de tópicos locais
                topic_duplicates = [name for name, count in Counter(topic_names_local).items() if count > 1]
                if topic_duplicates:
                    duplicates_found = True
                    print(f"   ❌ DUPLICAÇÕES DE TÓPICOS em '{subspec_name}':")
                    for dup in topic_duplicates:
                        count = Counter(topic_names_local)[dup]
                        print(f"      - '{dup}' aparece {count} vezes")
            
            # Checar duplicações de subespecialidades locais
            subspec_duplicates = [name for name, count in Counter(subspecialty_names_local).items() if count > 1]
            if subspec_duplicates:
                duplicates_found = True
                print(f"   ❌ DUPLICAÇÕES DE SUBESPECIALIDADES em '{specialty_name}':")
                for dup in subspec_duplicates:
                    count = Counter(subspecialty_names_local)[dup]
                    print(f"      - '{dup}' aparece {count} vezes")
        
        print("\n" + "=" * 60)
        print("📊 ESTATÍSTICAS FINAIS")
        print("=" * 60)
        print(f"✅ Total de especialidades: {total_specialties}")
        print(f"✅ Total de subespecialidades: {total_subspecialties}")
        print(f"✅ Total de tópicos: {total_topics}")
        
        # Verificar duplicações globais
        print("\n🔍 ANÁLISE DE DUPLICAÇÕES GLOBAIS:")
        print("-" * 40)
        
        # Duplicações de especialidades
        specialty_duplicates = [name for name, count in Counter(specialty_names).items() if count > 1]
        if specialty_duplicates:
            duplicates_found = True
            print("❌ ESPECIALIDADES DUPLICADAS:")
            for dup in specialty_duplicates:
                count = Counter(specialty_names)[dup]
                print(f"   - '{dup}' aparece {count} vezes")
        else:
            print("✅ Nenhuma especialidade duplicada")
        
        # Duplicações de subespecialidades (globalmente)
        subspec_duplicates_global = [name for name, count in Counter(subspecialty_names_global).items() if count > 1]
        if subspec_duplicates_global:
            print("⚠️  SUBESPECIALIDADES DUPLICADAS GLOBALMENTE:")
            for dup in subspec_duplicates_global:
                count = Counter(subspecialty_names_global)[dup]
                print(f"   - '{dup}' aparece {count} vezes")
            print("   (Nota: Isto pode ser normal se aparecem em especialidades diferentes)")
        
        # Duplicações de tópicos (globalmente)
        topic_duplicates_global = [name for name, count in Counter(topic_names_global).items() if count > 1]
        if topic_duplicates_global:
            print("⚠️  TÓPICOS DUPLICADOS GLOBALMENTE:")
            duplicates_count = len(topic_duplicates_global)
            print(f"   Total de tópicos com duplicações: {duplicates_count}")
            print("   Primeiros 10 exemplos:")
            for i, dup in enumerate(topic_duplicates_global[:10]):
                count = Counter(topic_names_global)[dup]
                print(f"   - '{dup}' aparece {count} vezes")
            if duplicates_count > 10:
                print(f"   ... e mais {duplicates_count - 10} tópicos duplicados")
        
        print("\n" + "=" * 60)
        if duplicates_found:
            print("❌ DUPLICAÇÕES CRÍTICAS ENCONTRADAS!")
            print("   Recomenda-se limpar as duplicações antes de importar.")
            return False
        else:
            print("✅ NENHUMA DUPLICAÇÃO CRÍTICA ENCONTRADA!")
            print("   Arquivo pronto para importação.")
            return True
        
    except Exception as e:
        print(f"❌ Erro ao analisar arquivo: {str(e)}")
        return False

if __name__ == "__main__":
    check_duplicates_in_merged_file() 