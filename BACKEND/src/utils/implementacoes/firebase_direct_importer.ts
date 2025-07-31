import * as fs from 'fs';
import * as path from 'path';
import { firestore } from '../../config/firebaseAdmin';

interface Subespecialidade {
  nome: string;
  assuntos: string[];
}

interface Especialidade {
  especialidade: string;
  subespecialidades: Subespecialidade[];
}

interface Subfilter {
  id: string;
  name: string;
  parentId?: string;
  level: number;
}

interface Filter {
  id: string;
  name: string;
  subfilters: Subfilter[];
}

type ImportData = Especialidade[];

// Configurações
const BATCH_SIZE = 500; // Firestore batch limit
const DELAY_BETWEEN_BATCHES = 1000; // 1 segundo

class FirebaseDirectImporter {
  private filtersCollection = firestore.collection('filters');
  private subfiltersCollection = firestore.collection('subFilters'); // Note o F maiúsculo!

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async clearExistingData(): Promise<void> {
    console.log('🧹 Limpando dados existentes...');
    
    try {
      // Deletar subfilters primeiro (dependem dos filters)
      await this.deleteCollection('subFilters'); // F maiúsculo!
      console.log('✅ Subfilters removidos');
      
      // Depois deletar filters
      await this.deleteCollection('filters');
      console.log('✅ Filters removidos');
    } catch (error) {
      console.error('❌ Erro ao limpar dados:', error);
      throw error;
    }
  }

  private async deleteCollection(collectionName: string): Promise<void> {
    const collection = firestore.collection(collectionName);
    let batch = firestore.batch();
    let batchCount = 0;

    const snapshot = await collection.get();
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = firestore.batch();
        batchCount = 0;
        await this.delay(100); // Pequena pausa
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  }

  async importFilters(jsonFilePath: string): Promise<void> {
    try {
      console.log('📂 Carregando arquivo JSON...');
      const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
      const rawData: ImportData = JSON.parse(jsonContent);

      console.log(`📊 Encontradas ${rawData.length} especialidades para processar`);

      // Converter dados para estrutura interna
      const processedData = this.processRawData(rawData);
      
      console.log(`📊 Convertidos ${processedData.length} filtros para importar`);

      // Primeiro, importar todos os filtros principais
      await this.importMainFilters(processedData);
      
      // Depois, importar todos os subfilters
      await this.importSubfilters(processedData);

      console.log('✅ Importação concluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro na importação:', error);
      throw error;
    }
  }

  private processRawData(rawData: ImportData): Filter[] {
    const filters: Filter[] = [];
    
    for (const especialidade of rawData) {
      const filterId = this.generateId(especialidade.especialidade);
      const subfilters: Subfilter[] = [];
      
      // Processar subespecialidades
      for (const subesp of especialidade.subespecialidades) {
        const subespId = this.generateId(subesp.nome);
        
        // Adicionar a subespecialidade como subfilter de nível 1
        subfilters.push({
          id: subespId,
          name: subesp.nome,
          level: 1
        });
        
        // Adicionar assuntos como subfilters de nível 2
        for (const assunto of subesp.assuntos) {
          const assuntoId = this.generateId(assunto);
          subfilters.push({
            id: assuntoId,
            name: assunto,
            parentId: subespId,
            level: 2
          });
        }
      }
      
      filters.push({
        id: filterId,
        name: especialidade.especialidade,
        subfilters
      });
    }
    
    return filters;
  }

  private generateId(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private async importMainFilters(filters: Filter[]): Promise<void> {
    console.log('📝 Importando filtros principais...');
    
    let batch = firestore.batch();
    let batchCount = 0;

    for (const filter of filters) {
      const filterDoc = {
        id: filter.id,
        name: filter.name,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = this.filtersCollection.doc(filter.id);
      batch.set(docRef, filterDoc);
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        console.log(`💾 Salvando batch de ${batchCount} filtros...`);
        await batch.commit();
        batch = firestore.batch();
        batchCount = 0;
        await this.delay(DELAY_BETWEEN_BATCHES);
      }
    }

    if (batchCount > 0) {
      console.log(`💾 Salvando batch final de ${batchCount} filtros...`);
      await batch.commit();
    }

    console.log('✅ Filtros principais importados');
  }

  private async importSubfilters(filters: Filter[]): Promise<void> {
    console.log('📝 Importando subfilters...');
    
    let batch = firestore.batch();
    let batchCount = 0;
    let totalSubfilters = 0;

    for (const filter of filters) {
      // Importar todos os subfilters de forma recursiva, mantendo filterId sempre do pai principal
      const result = await this.importSubfiltersRecursive(filter.subfilters, filter.id, batch, batchCount, totalSubfilters);
      batch = result.batch;
      batchCount = result.batchCount;
      totalSubfilters = result.totalSubfilters;
    }

    if (batchCount > 0) {
      console.log(`💾 Salvando batch final de ${batchCount} subfilters...`);
      await batch.commit();
    }

    console.log(`✅ ${totalSubfilters} subfilters importados`);
  }

  private async importSubfiltersRecursive(
    subfilters: Subfilter[], 
    mainFilterId: string, 
    batch: FirebaseFirestore.WriteBatch, 
    batchCount: number, 
    totalSubfilters: number
  ): Promise<{ batch: FirebaseFirestore.WriteBatch; batchCount: number; totalSubfilters: number }> {
    for (const subfilter of subfilters) {
      const subfilterDoc = {
        id: subfilter.id,
        name: subfilter.name,
        filterId: mainFilterId, // SEMPRE o filtro principal, não importa o nível!
        parentId: subfilter.parentId || null,
        order: subfilter.level || 0,
        isActive: true,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = this.subfiltersCollection.doc(subfilter.id);
      batch.set(docRef, subfilterDoc);
      batchCount++;
      totalSubfilters++;

      if (batchCount >= BATCH_SIZE) {
        console.log(`💾 Salvando batch de ${batchCount} subfilters... (${totalSubfilters} total)`);
        await batch.commit();
        batch = firestore.batch();
        batchCount = 0;
        await this.delay(DELAY_BETWEEN_BATCHES);
      }
    }
    
    return { batch, batchCount, totalSubfilters };
  }

  async validateImport(): Promise<void> {
    console.log('🔍 Validando importação...');
    
    const filtersSnapshot = await this.filtersCollection.get();
    const subfiltersSnapshot = await this.subfiltersCollection.get();
    
    console.log(`📊 Filtros na base: ${filtersSnapshot.size}`);
    console.log(`📊 Subfilters na base: ${subfiltersSnapshot.size}`);
    
    // Validar alguns exemplos
    const firstFilter = filtersSnapshot.docs[0];
    if (firstFilter) {
      const filterData = firstFilter.data();
      console.log(`🔍 Exemplo de filtro: ${filterData.name} (ID: ${filterData.id})`);
      
      // Buscar subfilters deste filtro
      const subfiltersQuery = await this.subfiltersCollection
        .where('filterId', '==', filterData.id)
        .get();
      
      console.log(`🔍 Subfilters do "${filterData.name}": ${subfiltersQuery.size}`);
    }
  }
}

// Função principal
async function main() {
  const importer = new FirebaseDirectImporter();
  const jsonFilePath = path.join(__dirname, './estrategia_filters_extracted.json');
  
  try {
    console.log('🚀 Iniciando importação direta via Firebase Admin...');
    console.log(`📂 Arquivo: ${jsonFilePath}`);
    
    // Verificar se arquivo existe
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`Arquivo não encontrado: ${jsonFilePath}`);
    }
    
    // Opcional: limpar dados existentes (descomente se necessário)
    // await importer.clearExistingData();
    
    // Importar dados
    await importer.importFilters(jsonFilePath);
    
    // Validar importação
    await importer.validateImport();
    
    console.log('🎉 Processo concluído com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export { FirebaseDirectImporter }; 