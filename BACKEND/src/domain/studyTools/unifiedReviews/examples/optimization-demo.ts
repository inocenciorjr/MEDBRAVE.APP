/**
 * Demonstração das Otimizações do Firestore - UnifiedReviews
 * 
 * Este arquivo demonstra como usar todas as otimizações implementadas:
 * 1. Desnormalização de dados
 * 2. Paginação baseada em cursor
 * 3. Monitoramento de performance
 * 4. Validação de índices compostos
 */

import { UnifiedReviewService } from '../services/UnifiedReviewService';
import { FSRSService } from '../services/FSRSService';
import { performanceMonitor } from '../services/PerformanceMonitoringService';
import { indexManager } from '../services/FirestoreIndexManager';
import { UnifiedContentType, FSRSGrade } from '../types';
import { logger } from '../../../../utils/logger';

export class OptimizationDemo {
  private unifiedReviewService: UnifiedReviewService;
  private fsrsService: FSRSService;
  
  constructor() {
    this.unifiedReviewService = new UnifiedReviewService();
    this.fsrsService = new FSRSService();
  }

  /**
   * Demonstração completa de todas as otimizações
   */
  async runCompleteDemo(userId: string): Promise<void> {
    console.log('🚀 Iniciando demonstração das otimizações do Firestore...');
    
    try {
      // 1. Validar índices compostos
      await this.demoIndexValidation();
      
      // 2. Demonstrar desnormalização de dados
      await this.demoDenormalization(userId);
      
      // 3. Demonstrar paginação baseada em cursor
      await this.demoCursorPagination(userId);
      
      // 4. Demonstrar monitoramento de performance
      await this.demoPerformanceMonitoring(userId);
      
      // 5. Análise de performance
      await this.demoPerformanceAnalysis(userId);
      
      console.log('✅ Demonstração concluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro na demonstração:', error);
      throw error;
    }
  }

  /**
   * 1. Demonstração da validação de índices compostos
   */
  async demoIndexValidation(): Promise<void> {
    console.log('\n📊 1. Validando Índices Compostos...');
    
    // Health check completo
    const health = await indexManager.healthCheck();
    
    console.log(`Status dos índices: ${health.status}`);
    console.log('Recomendações:', health.details.recommendations);
    
    if (health.status !== 'healthy') {
      console.log('\n🔧 Comandos para criar índices faltantes:');
      const commands = indexManager.generateFirebaseCommands();
      commands.forEach(cmd => console.log(cmd));
    }
    
    // Validação específica
    const validation = await indexManager.validateIndexes();
    console.log(`Índices válidos: ${validation.valid}`);
    
    if (!validation.valid) {
      console.log('Índices faltantes:', validation.missingIndexes);
    }
  }

  /**
   * 2. Demonstração da desnormalização de dados
   */
  async demoDenormalization(userId: string): Promise<void> {
    console.log('\n🗂️ 2. Demonstrando Desnormalização de Dados...');
    
    const startTime = Date.now();
    
    // Criar card com dados desnormalizados
    const newCard = await this.fsrsService.createNewCard(
      userId,
      'demo-content-123',
      'demo-deck-456',
      'Deck de Cardiologia', // deckName desnormalizado
      'Filtro Residência'     // filterName desnormalizado
    );
    
    console.log('Card criado com desnormalização:', {
      id: newCard.id,
      deckName: newCard.deckName,
      filterName: newCard.filterName
    });
    
    // Enriquecer card existente (caso não tenha os nomes)
    const cardWithoutNames = { ...newCard };
    delete cardWithoutNames.deckName;
    delete cardWithoutNames.filterName;
    
    const enrichedCard = await this.fsrsService.enrichCardWithNames(cardWithoutNames);
    
    console.log('Card enriquecido automaticamente:', {
      id: enrichedCard.id,
      deckName: enrichedCard.deckName,
      filterName: enrichedCard.filterName
    });
    
    const executionTime = Date.now() - startTime;
    console.log(`⚡ Tempo de execução: ${executionTime}ms`);
    console.log('💰 Economia: ~2-3 consultas evitadas por card');
  }

  /**
   * 3. Demonstração da paginação baseada em cursor
   */
  async demoCursorPagination(userId: string): Promise<void> {
    console.log('\n📄 3. Demonstrando Paginação Baseada em Cursor...');
    
    const pageSize = 5;
    let currentCursor: string | undefined;
    let pageNumber = 1;
    let totalItems = 0;
    
    console.log(`Buscando revisões em páginas de ${pageSize} itens...`);
    
    do {
      const startTime = Date.now();
      
      const page = await this.unifiedReviewService.getDueReviewsPaginated(userId, {
        pageSize,
        cursor: currentCursor,
        dueOnly: true
      });
      
      const executionTime = Date.now() - startTime;
      
      console.log(`\nPágina ${pageNumber}:`);
      console.log(`  - Itens: ${page.items.length}`);
      console.log(`  - Tem mais: ${page.hasMore}`);
      console.log(`  - Cursor: ${page.nextCursor?.substring(0, 8)}...`);
      console.log(`  - Tempo: ${executionTime}ms`);
      
      // Mostrar alguns itens da página
      page.items.slice(0, 2).forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.contentType} - Due: ${item.due.toISOString()}`);
      });
      
      totalItems += page.items.length;
      currentCursor = page.nextCursor;
      pageNumber++;
      
      // Limitar demonstração a 3 páginas
      if (pageNumber > 3) break;
      
    } while (currentCursor);
    
    console.log(`\n📊 Total processado: ${totalItems} itens em ${pageNumber - 1} páginas`);
    console.log('🔄 Performance consistente independente do tamanho do dataset');
  }

  /**
   * 4. Demonstração do monitoramento de performance
   */
  async demoPerformanceMonitoring(userId: string): Promise<void> {
    console.log('\n📈 4. Demonstrando Monitoramento de Performance...');
    
    // Simular algumas operações para gerar métricas
    console.log('Executando operações para gerar métricas...');
    
    // Operação 1: Buscar revisões devidas
    await this.unifiedReviewService.getDueReviews(userId, { limit: 10 });
    
    // Operação 2: Buscar revisões futuras
    await this.unifiedReviewService.getFutureReviews(userId, { limit: 5 });
    
    // Operação 3: Paginação
    await this.unifiedReviewService.getDueReviewsPaginated(userId, { pageSize: 3 });
    
    // Aguardar um pouco para as métricas serem processadas
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Forçar flush das métricas
    await performanceMonitor.forceFlush();
    
    console.log('✅ Métricas registradas e salvas no Firestore');
    console.log('📊 Dados disponíveis na coleção "performance_metrics"');
    
    // Demonstrar limpeza de métricas antigas
    console.log('\n🧹 Demonstrando limpeza de métricas antigas...');
    await performanceMonitor.cleanupOldMetrics();
    console.log('✅ Métricas antigas removidas (>30 dias)');
  }

  /**
   * 5. Demonstração da análise de performance
   */
  async demoPerformanceAnalysis(userId: string): Promise<void> {
    console.log('\n🔍 5. Demonstrando Análise de Performance...');
    
    // Obter resumo de performance dos últimos 7 dias
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    try {
      const summary = await performanceMonitor.getPerformanceSummary(
        startDate,
        endDate,
        userId
      );
      
      console.log('\n📊 Resumo de Performance (últimos 7 dias):');
      console.log(`  - Total de operações: ${summary.totalOperations}`);
      console.log(`  - Tempo médio: ${Math.round(summary.averageExecutionTime)}ms`);
      console.log(`  - Documentos lidos: ${summary.totalDocumentsRead}`);
      console.log(`  - Taxa de cache hit: ${Math.round(summary.cacheHitRate)}%`);
      
      console.log('\n🔧 Breakdown por operação:');
      Object.entries(summary.operationBreakdown).forEach(([operation, stats]) => {
        console.log(`  - ${operation}:`);
        console.log(`    * Contagem: ${stats.count}`);
        console.log(`    * Tempo médio: ${Math.round(stats.avgTime)}ms`);
        console.log(`    * Total leituras: ${stats.totalReads}`);
      });
      
    } catch (error) {
      console.log('ℹ️ Ainda não há dados suficientes para análise (normal em demonstração)');
    }
    
    // Análise de queries lentas
    console.log('\n🐌 Analisando queries lentas...');
    try {
      const analysis = await indexManager.analyzeQueryPerformance(userId, 7);
      
      if (analysis.slowQueries.length > 0) {
        console.log('Queries lentas detectadas:');
        analysis.slowQueries.forEach(query => {
          console.log(`  - ${query.operation}: ${Math.round(query.avgTime)}ms (${query.count}x)`);
        });
      } else {
        console.log('✅ Nenhuma query lenta detectada');
      }
      
      console.log('\n💡 Recomendações:');
      analysis.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
      
    } catch (error) {
      console.log('ℹ️ Análise de queries não disponível (dados insuficientes)');
    }
  }

  /**
   * Demonstração de uso em produção
   */
  async demoProductionUsage(userId: string): Promise<void> {
    console.log('\n🏭 Demonstrando Uso em Produção...');
    
    // Simular fluxo típico de usuário
    console.log('Simulando fluxo típico de revisão...');
    
    // 1. Buscar revisões pendentes (com paginação)
    const reviews = await this.unifiedReviewService.getDueReviewsPaginated(userId, {
      pageSize: 20,
      dueOnly: true
    });
    
    console.log(`📚 ${reviews.items.length} revisões encontradas`);
    
    // 2. Simular algumas revisões
    if (reviews.items.length > 0) {
      const reviewsToProcess = reviews.items.slice(0, 3);
      
      for (const [index, review] of reviewsToProcess.entries()) {
        console.log(`\n📝 Processando revisão ${index + 1}/${reviewsToProcess.length}`);
        
        // Simular tempo de estudo
        const studyTime = Math.random() * 30000 + 10000; // 10-40 segundos
        
        // Simular grade baseada na dificuldade
        let grade: FSRSGrade;
        if (review.difficulty < 4) {
          grade = Math.random() > 0.2 ? FSRSGrade.Good : FSRSGrade.Easy;
        } else if (review.difficulty > 7) {
          grade = Math.random() > 0.3 ? FSRSGrade.Hard : FSRSGrade.Again;
        } else {
          grade = FSRSGrade.Good;
        }
        
        // Registrar revisão
        const updatedReview = await this.unifiedReviewService.recordUnifiedReview(
          review.contentType,
          review.contentId,
          userId,
          grade,
          studyTime
        );
        
        console.log(`  ✅ ${review.contentType} revisado - Grade: ${grade}`);
        console.log(`  📅 Próxima revisão: ${updatedReview.due.toLocaleDateString()}`);
      }
    }
    
    // 3. Obter resumo atualizado
    const summary = await this.unifiedReviewService.getDailyReviewSummary(userId);
    
    console.log('\n📊 Resumo Diário Atualizado:');
    console.log(`  - Total de itens: ${summary.totalItems}`);
    console.log(`  - Flashcards: ${summary.flashcards}`);
    console.log(`  - Questões: ${summary.questions}`);
    console.log(`  - Caderno de Erros: ${summary.errorNotes}`);
    console.log(`  - Tempo estimado: ${summary.estimatedTimeMinutes} minutos`);
    
    console.log('\n🎯 Fluxo de produção concluído com otimizações ativas!');
  }

  /**
   * Benchmark de performance
   */
  async runPerformanceBenchmark(userId: string, iterations: number = 10): Promise<void> {
    console.log(`\n⚡ Executando Benchmark de Performance (${iterations} iterações)...`);
    
    const results = {
      getDueReviews: [] as number[],
      paginatedReviews: [] as number[],
      futureReviews: [] as number[]
    };
    
    for (let i = 0; i < iterations; i++) {
      console.log(`Iteração ${i + 1}/${iterations}`);
      
      // Benchmark getDueReviews
      let start = Date.now();
      await this.unifiedReviewService.getDueReviews(userId, { limit: 20 });
      results.getDueReviews.push(Date.now() - start);
      
      // Benchmark paginação
      start = Date.now();
      await this.unifiedReviewService.getDueReviewsPaginated(userId, { pageSize: 20 });
      results.paginatedReviews.push(Date.now() - start);
      
      // Benchmark revisões futuras
      start = Date.now();
      await this.unifiedReviewService.getFutureReviews(userId, { limit: 10 });
      results.futureReviews.push(Date.now() - start);
      
      // Pequena pausa entre iterações
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Calcular estatísticas
    const calculateStats = (times: number[]) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
      return { avg: Math.round(avg), min, max, median };
    };
    
    console.log('\n📊 Resultados do Benchmark:');
    console.log('getDueReviews:', calculateStats(results.getDueReviews));
    console.log('paginatedReviews:', calculateStats(results.paginatedReviews));
    console.log('futureReviews:', calculateStats(results.futureReviews));
    
    console.log('\n🎯 Benchmark concluído! Métricas salvas automaticamente.');
  }
}

// Exemplo de uso
export async function runOptimizationDemo(): Promise<void> {
  const demo = new OptimizationDemo();
  const userId = 'demo-user-123';
  
  try {
    // Demonstração completa
    await demo.runCompleteDemo(userId);
    
    // Demonstração de uso em produção
    await demo.demoProductionUsage(userId);
    
    // Benchmark de performance
    await demo.runPerformanceBenchmark(userId, 5);
    
  } catch (error) {
    console.error('Erro na demonstração:', error);
  }
}

// Para executar: node -r ts-node/register optimization-demo.ts
if (require.main === module) {
  runOptimizationDemo().catch(console.error);
}