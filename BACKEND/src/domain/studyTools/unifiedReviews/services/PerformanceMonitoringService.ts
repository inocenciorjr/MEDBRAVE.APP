import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '../../../../utils/logger';

export interface PerformanceMetrics {
  operationType: 'getDueReviews' | 'getFutureReviews' | 'enrichBatch' | 'cacheHit' | 'cacheMiss';
  userId: string;
  executionTimeMs: number;
  documentsRead: number;
  cacheHitRate?: number;
  queryFilters?: Record<string, any>;
  timestamp: Date;
}

export interface PerformanceSummary {
  totalOperations: number;
  averageExecutionTime: number;
  totalDocumentsRead: number;
  cacheHitRate: number;
  operationBreakdown: Record<string, {
    count: number;
    avgTime: number;
    totalReads: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export class PerformanceMonitoringService {
  private db: firestore.Firestore;
  private metricsBuffer: PerformanceMetrics[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 120000; // 2 minutos (reduzido de 30s para diminuir logs)
  
  constructor(firebaseFirestore: firestore.Firestore) {
    this.db = firebaseFirestore;
    
    // Configurar flush automático
    setInterval(() => {
      this.flushMetrics();
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Registra uma métrica de performance
   */
  public recordMetric(metric: PerformanceMetrics): void {
    this.metricsBuffer.push(metric);
    
    // Log imediato para métricas críticas
    if (metric.executionTimeMs > 5000 || metric.documentsRead > 1000) {
      logger.warn('Performance crítica detectada:', {
        operation: metric.operationType,
        userId: metric.userId,
        executionTime: metric.executionTimeMs,
        documentsRead: metric.documentsRead
      });
    }
    
    // Flush se buffer estiver cheio
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushMetrics();
    }
  }

  /**
   * Decorator para medir performance de métodos
   */
  public measurePerformance<T>(
    operationType: PerformanceMetrics['operationType'],
    userId: string,
    queryFilters?: Record<string, any>
  ) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;
      
      descriptor.value = async function (...args: any[]): Promise<T> {
        const startTime = Date.now();
        let documentsRead = 0;
        
        try {
          const result = await method.apply(this, args);
          
          // Estimar documentos lidos baseado no resultado
          if (Array.isArray(result)) {
            documentsRead = result.length;
          } else if (result && typeof result === 'object' && 'items' in result) {
            documentsRead = (result as any).items.length;
          }
          
          const executionTime = Date.now() - startTime;
          
          // Registrar métrica
          this.recordMetric({
            operationType,
            userId,
            executionTimeMs: executionTime,
            documentsRead,
            queryFilters,
            timestamp: new Date()
          });
          
          return result;
        } catch (error) {
          const executionTime = Date.now() - startTime;
          
          // Registrar métrica mesmo em caso de erro
          this.recordMetric({
            operationType,
            userId,
            executionTimeMs: executionTime,
            documentsRead: 0,
            queryFilters,
            timestamp: new Date()
          });
          
          throw error;
        }
      };
    };
  }

  /**
   * Salva métricas acumuladas no Firestore
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;
    
    try {
      const batch = this.db.batch();
      const metricsToFlush = [...this.metricsBuffer];
      this.metricsBuffer = [];
      
      metricsToFlush.forEach(metric => {
        const docRef = this.db.collection('performance_metrics').doc();
        batch.set(docRef, {
          ...metric,
          timestamp: Timestamp.fromDate(metric.timestamp)
        });
      });
      
      await batch.commit();
      
      // Reduzir logs: apenas log debug para operações normais
      logger.debug(`${metricsToFlush.length} métricas de performance salvas`);
    } catch (error) {
      logger.error('Erro ao salvar métricas de performance:', error);
      // Recolocar métricas no buffer em caso de erro
      this.metricsBuffer.unshift(...this.metricsBuffer);
    }
  }

  /**
   * Obtém resumo de performance para um período
   */
  public async getPerformanceSummary(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<PerformanceSummary> {
    try {
      let query = this.db.collection('performance_metrics')
        .where('timestamp', '>=', Timestamp.fromDate(startDate))
        .where('timestamp', '<=', Timestamp.fromDate(endDate));
      
      if (userId) {
        query = query.where('userId', '==', userId);
      }
      
      const snapshot = await query.get();
      const metrics = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp.toDate()
        } as PerformanceMetrics;
      });
      
      // Calcular estatísticas
      const totalOperations = metrics.length;
      const totalExecutionTime = metrics.reduce((sum, m) => sum + m.executionTimeMs, 0);
      const totalDocumentsRead = metrics.reduce((sum, m) => sum + m.documentsRead, 0);
      
      const cacheMetrics = metrics.filter(m => m.operationType === 'cacheHit' || m.operationType === 'cacheMiss');
      const cacheHits = cacheMetrics.filter(m => m.operationType === 'cacheHit').length;
      const cacheHitRate = cacheMetrics.length > 0 ? (cacheHits / cacheMetrics.length) * 100 : 0;
      
      // Breakdown por tipo de operação
      const operationBreakdown: Record<string, { count: number; avgTime: number; totalReads: number }> = {};
      
      metrics.forEach(metric => {
        if (!operationBreakdown[metric.operationType]) {
          operationBreakdown[metric.operationType] = {
            count: 0,
            avgTime: 0,
            totalReads: 0
          };
        }
        
        const breakdown = operationBreakdown[metric.operationType];
        breakdown.count++;
        breakdown.totalReads += metric.documentsRead;
        breakdown.avgTime = (breakdown.avgTime * (breakdown.count - 1) + metric.executionTimeMs) / breakdown.count;
      });
      
      return {
        totalOperations,
        averageExecutionTime: totalOperations > 0 ? totalExecutionTime / totalOperations : 0,
        totalDocumentsRead,
        cacheHitRate,
        operationBreakdown,
        timeRange: {
          start: startDate,
          end: endDate
        }
      };
    } catch (error) {
      logger.error('Erro ao obter resumo de performance:', error);
      throw error;
    }
  }

  /**
   * Limpa métricas antigas (manter apenas últimos 30 dias)
   */
  public async cleanupOldMetrics(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldMetricsQuery = this.db.collection('performance_metrics')
        .where('timestamp', '<', Timestamp.fromDate(thirtyDaysAgo))
        .limit(500); // Processar em lotes
      
      const snapshot = await oldMetricsQuery.get();
      
      if (snapshot.empty) {
        logger.info('Nenhuma métrica antiga para limpar');
        return;
      }
      
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      logger.info(`${snapshot.docs.length} métricas antigas removidas`);
      
      // Se ainda há mais métricas antigas, agendar próxima limpeza
      if (snapshot.docs.length === 500) {
        setTimeout(() => this.cleanupOldMetrics(), 5000);
      }
    } catch (error) {
      logger.error('Erro ao limpar métricas antigas:', error);
    }
  }

  /**
   * Força o flush das métricas em buffer
   */
  public async forceFlush(): Promise<void> {
    await this.flushMetrics();
  }
}

// Instância singleton para uso global
export const performanceMonitor = new PerformanceMonitoringService(
  require('firebase-admin').firestore()
);