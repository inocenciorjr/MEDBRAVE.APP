import { logger } from './logger';

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private readonly slowThreshold: number = 1000; // 1 segundo

  /**
   * Inicia o monitoramento de uma operação
   */
  start(operation: string, metadata?: Record<string, any>): string {
    const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.metrics.set(id, {
      operation,
      startTime: performance.now(),
      metadata,
    });

    return id;
  }

  /**
   * Finaliza o monitoramento de uma operação
   */
  end(id: string): PerformanceMetric | null {
    const metric = this.metrics.get(id);

    if (!metric) {
      logger.warn(`Performance metric not found: ${id}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Log se a operação foi lenta
    if (metric.duration > this.slowThreshold) {
      logger.warn("Slow operation detected", {
        operation: metric.operation,
        duration: `${metric.duration.toFixed(2)}ms`,
        metadata: metric.metadata,
      });
    } else {
      logger.info("Operation completed", {
        operation: metric.operation,
        duration: `${metric.duration.toFixed(2)}ms`,
        metadata: metric.metadata,
      });
    }

    // Remover da memória para evitar vazamentos
    this.metrics.delete(id);

    return metric;
  }

  /**
   * Monitora uma função async automaticamente
   */
  async monitor<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const id = this.start(operation, metadata);

    try {
      const result = await fn();
      this.end(id);
      return result;
    } catch (error) {
      const metric = this.metrics.get(id);
      if (metric) {
        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;

        logger.error("Operation failed", {
          operation: metric.operation,
          duration: `${metric.duration.toFixed(2)}ms`,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: metric.metadata,
        });
      }

      this.metrics.delete(id);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de performance
   */
  getStats(): {
    activeOperations: number;
    operations: Array<{
      operation: string;
      startTime: number;
      duration?: number;
      metadata?: Record<string, any>;
    }>;
  } {
    const operations = Array.from(this.metrics.values()).map((metric) => ({
      operation: metric.operation,
      startTime: metric.startTime,
      duration: metric.endTime ? metric.endTime - metric.startTime : undefined,
      metadata: metric.metadata,
    }));

    return {
      activeOperations: this.metrics.size,
      operations,
    };
  }

  /**
   * Limpa todas as métricas ativas (útil para testes)
   */
  clear(): void {
    this.metrics.clear();
  }
}

// Instância singleton
export const performanceMonitor = new PerformanceMonitor();

// Middleware para Express
export const performanceMiddleware = (operationName?: string) => {
  return (req: any, res: any, next: any) => {
    const operation = operationName || `${req.method} ${req.path}`;
    const id = performanceMonitor.start(operation, {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    // Interceptar o final da resposta
    const originalSend = res.send;
    res.send = function (data: any) {
      performanceMonitor.end(id);
      return originalSend.call(this, data);
    };

    next();
  };
};
