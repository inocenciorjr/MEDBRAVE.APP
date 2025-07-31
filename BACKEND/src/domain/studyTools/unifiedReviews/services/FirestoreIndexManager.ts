import { firestore } from 'firebase-admin';
import { logger } from '../../../../utils/logger';
import * as indexConfig from '../config/firestore-indexes.json';

export interface IndexDefinition {
  collectionGroup: string;
  queryScope: 'COLLECTION' | 'COLLECTION_GROUP';
  fields: Array<{
    fieldPath: string;
    order?: 'ASCENDING' | 'DESCENDING';
    arrayConfig?: 'CONTAINS';
  }>;
}

export interface FieldOverride {
  collectionGroup: string;
  fieldPath: string;
  indexes: Array<{
    order: 'ASCENDING' | 'DESCENDING';
    queryScope: 'COLLECTION' | 'COLLECTION_GROUP';
  }>;
}

export interface IndexStatus {
  name: string;
  state: 'CREATING' | 'READY' | 'NEEDS_REPAIR' | 'ERROR';
  progress?: number;
  errorMessage?: string;
}

export class FirestoreIndexManager {
  private db: firestore.Firestore;
  private projectId: string;
  
  constructor(firebaseFirestore: firestore.Firestore, projectId: string) {
    this.db = firebaseFirestore;
    this.projectId = projectId;
  }

  /**
   * Valida se os índices necessários estão configurados
   */
  public async validateIndexes(): Promise<{
    valid: boolean;
    missingIndexes: string[];
    recommendations: string[];
  }> {
    try {
      const missingIndexes: string[] = [];
      const recommendations: string[] = [];
      
      // Verificar índices principais para fsrs_cards
      const criticalIndexes = [
        'userId_due_ASC',
        'userId_deckId_due_ASC',
        'userId_state_due_ASC'
      ];
      
      // Simular verificação (em produção, usaria Firebase Admin SDK para listar índices)
      for (const indexName of criticalIndexes) {
        try {
          // Teste de query para verificar se o índice existe
          await this.testIndexQuery(indexName);
        } catch (error) {
          missingIndexes.push(indexName);
          recommendations.push(`Criar índice composto: ${indexName}`);
        }
      }
      
      const valid = missingIndexes.length === 0;
      
      if (!valid) {
        logger.warn('Índices Firestore faltando:', {
          missing: missingIndexes,
          total: criticalIndexes.length
        });
      }
      
      return {
        valid,
        missingIndexes,
        recommendations
      };
    } catch (error) {
      logger.error('Erro ao validar índices:', error);
      return {
        valid: false,
        missingIndexes: [],
        recommendations: ['Erro na validação - verificar configuração']
      };
    }
  }

  /**
   * Testa se um índice específico está funcionando
   */
  private async testIndexQuery(indexName: string): Promise<boolean> {
    try {
      switch (indexName) {
        case 'userId_due_ASC':
          // Teste query básica userId + due
          await this.db.collection('fsrs_cards')
            .where('userId', '==', 'test')
            .orderBy('due', 'asc')
            .limit(1)
            .get();
          break;
          
        case 'userId_deckId_due_ASC':
          // Teste query userId + deckId + due
          await this.db.collection('fsrs_cards')
            .where('userId', '==', 'test')
            .where('deckId', '==', 'test')
            .orderBy('due', 'asc')
            .limit(1)
            .get();
          break;
          
        case 'userId_state_due_ASC':
          // Teste query userId + state + due
          await this.db.collection('fsrs_cards')
            .where('userId', '==', 'test')
            .where('state', '==', 0)
            .orderBy('due', 'asc')
            .limit(1)
            .get();
          break;
          
        default:
          return false;
      }
      
      return true;
    } catch (error: any) {
      // Se o erro for sobre índice faltando, retorna false
      if (error.code === 9 || error.message?.includes('index')) {
        return false;
      }
      // Outros erros podem ser ignorados (dados não encontrados, etc.)
      return true;
    }
  }

  /**
   * Gera comandos Firebase CLI para criar índices
   */
  public generateFirebaseCommands(): string[] {
    const commands: string[] = [];
    
    // Comando para deploy de índices
    commands.push('# Deploy dos índices Firestore');
    commands.push('firebase deploy --only firestore:indexes');
    commands.push('');
    
    // Comandos individuais para criar índices via CLI
    commands.push('# Ou criar índices individuais:');
    
    indexConfig.indexes.forEach((index, i) => {
      const fields = index.fields.map(field => {
        if (field.arrayConfig) {
          return `${field.fieldPath}:${field.arrayConfig}`;
        }
        return `${field.fieldPath}:${field.order?.toLowerCase() || 'asc'}`;
      }).join(',');
      
      commands.push(
        `firebase firestore:indexes:create --collection-group=${index.collectionGroup} --query-scope=${index.queryScope} --fields="${fields}"`
      );
    });
    
    return commands;
  }

  /**
   * Gera arquivo firestore.indexes.json para deploy
   */
  public generateIndexesFile(): string {
    return JSON.stringify(indexConfig, null, 2);
  }

  /**
   * Monitora performance de queries e sugere novos índices
   */
  public async analyzeQueryPerformance(userId: string, days: number = 7): Promise<{
    slowQueries: Array<{
      operation: string;
      avgTime: number;
      count: number;
      suggestedIndex?: string;
    }>;
    recommendations: string[];
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Buscar métricas de performance
      const metricsSnapshot = await this.db.collection('performance_metrics')
        .where('userId', '==', userId)
        .where('timestamp', '>=', firestore.Timestamp.fromDate(startDate))
        .where('timestamp', '<=', firestore.Timestamp.fromDate(endDate))
        .get();
      
      const metrics = metricsSnapshot.docs.map(doc => doc.data());
      
      // Agrupar por tipo de operação
      const operationStats = new Map<string, {
        totalTime: number;
        count: number;
        maxTime: number;
      }>();
      
      metrics.forEach(metric => {
        const op = metric.operationType;
        const time = metric.executionTimeMs;
        
        if (!operationStats.has(op)) {
          operationStats.set(op, { totalTime: 0, count: 0, maxTime: 0 });
        }
        
        const stats = operationStats.get(op)!;
        stats.totalTime += time;
        stats.count++;
        stats.maxTime = Math.max(stats.maxTime, time);
      });
      
      // Identificar queries lentas (>2s em média)
      const slowQueries = Array.from(operationStats.entries())
        .map(([operation, stats]) => ({
          operation,
          avgTime: stats.totalTime / stats.count,
          count: stats.count,
          maxTime: stats.maxTime
        }))
        .filter(query => query.avgTime > 2000)
        .sort((a, b) => b.avgTime - a.avgTime);
      
      // Gerar recomendações
      const recommendations: string[] = [];
      
      slowQueries.forEach(query => {
        switch (query.operation) {
          case 'getDueReviews':
            if (query.avgTime > 3000) {
              recommendations.push('Considerar índice composto adicional para filtros específicos');
              recommendations.push('Implementar cache de resultados para queries frequentes');
            }
            break;
          case 'enrichBatch':
            if (query.avgTime > 5000) {
              recommendations.push('Otimizar queries de enriquecimento com batch reads');
              recommendations.push('Implementar desnormalização adicional');
            }
            break;
        }
      });
      
      if (slowQueries.length === 0) {
        recommendations.push('Performance das queries está dentro do esperado');
      }
      
      return {
        slowQueries,
        recommendations
      };
    } catch (error) {
      logger.error('Erro ao analisar performance de queries:', error);
      return {
        slowQueries: [],
        recommendations: ['Erro na análise - verificar logs']
      };
    }
  }

  /**
   * Executa verificação completa de saúde dos índices
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    details: {
      indexValidation: any;
      performanceAnalysis: any;
      recommendations: string[];
    };
  }> {
    try {
      const indexValidation = await this.validateIndexes();
      const performanceAnalysis = await this.analyzeQueryPerformance('system', 1);
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      const recommendations: string[] = [];
      
      // Avaliar status baseado nos resultados
      if (!indexValidation.valid) {
        status = 'critical';
        recommendations.push('Índices críticos faltando - deploy necessário');
      }
      
      if (performanceAnalysis.slowQueries.length > 0) {
        if (status === 'healthy') status = 'warning';
        recommendations.push('Queries lentas detectadas - otimização recomendada');
      }
      
      recommendations.push(...indexValidation.recommendations);
      recommendations.push(...performanceAnalysis.recommendations);
      
      return {
        status,
        details: {
          indexValidation,
          performanceAnalysis,
          recommendations: [...new Set(recommendations)] // Remove duplicatas
        }
      };
    } catch (error) {
      logger.error('Erro no health check de índices:', error);
      return {
        status: 'critical',
        details: {
          indexValidation: { valid: false, missingIndexes: [], recommendations: [] },
          performanceAnalysis: { slowQueries: [], recommendations: [] },
          recommendations: ['Erro no health check - verificar configuração']
        }
      };
    }
  }
}

// Instância singleton
export const indexManager = new FirestoreIndexManager(
  require('firebase-admin').firestore(),
  process.env.FIREBASE_PROJECT_ID || 'default-project'
);