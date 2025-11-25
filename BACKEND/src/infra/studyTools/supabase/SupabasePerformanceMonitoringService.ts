import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../../utils/logger';
import { AppError } from '../../../shared/errors/AppError';

export interface PerformanceMetrics {
  operationType:
    | 'getDueReviews'
    | 'getFutureReviews'
    | 'enrichBatch'
    | 'cacheHit'
    | 'cacheMiss';
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
  operationBreakdown: Record<
    string,
    {
      count: number;
      avgTime: number;
      totalReads: number;
    }
  >;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export class SupabasePerformanceMonitoringService {
  private supabase: SupabaseClient;
  private metricsBuffer: PerformanceMetrics[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 120000; // 2 minutes

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;

    // Start periodic flush
    setInterval(() => {
      this.flushMetrics().catch((error) => {
        logger.error('Error flushing performance metrics:', error);
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  public recordMetric(metric: PerformanceMetrics): void {
    try {
      this.metricsBuffer.push(metric);

      // Log slow operations immediately
      if (metric.executionTimeMs > 5000) {
        // 5 seconds
        logger.warn(
          `Slow operation detected: ${metric.operationType} took ${metric.executionTimeMs}ms for user ${metric.userId}`,
        );
      }

      // Flush if buffer is full
      if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
        this.flushMetrics().catch((error) => {
          logger.error('Error flushing metrics buffer:', error);
        });
      }
    } catch (error) {
      logger.error('Error recording performance metric:', error);
    }
  }

  public measurePerformance(
    operationType: PerformanceMetrics['operationType'],
    userId: string,
    queryFilters?: Record<string, any>,
  ) {
    const startTime = Date.now();
    let documentsRead = 0;

    return {
      // Method to track document reads
      addDocumentReads: (count: number) => {
        documentsRead += count;
      },

      // Method to complete the measurement
      complete: (cacheHitRate?: number) => {
        const executionTimeMs = Date.now() - startTime;

        this.recordMetric({
          operationType,
          userId,
          executionTimeMs,
          documentsRead,
          cacheHitRate,
          queryFilters,
          timestamp: new Date(),
        });

        return executionTimeMs;
      },

      // Method to complete with error
      completeWithError: (error: Error) => {
        const executionTimeMs = Date.now() - startTime;

        logger.error(
          `Operation ${operationType} failed after ${executionTimeMs}ms:`,
          error,
        );

        this.recordMetric({
          operationType,
          userId,
          executionTimeMs,
          documentsRead,
          queryFilters,
          timestamp: new Date(),
        });

        return executionTimeMs;
      },
    };
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      const metricsData = metricsToFlush.map((metric) => ({
          operation_type: metric.operationType,
          user_id: metric.userId,
          execution_time_ms: metric.executionTimeMs,
          documents_read: metric.documentsRead,
          cache_hit_rate: metric.cacheHitRate,
          query_filters: metric.queryFilters
            ? JSON.stringify(metric.queryFilters)
            : null,
          timestamp: metric.timestamp.toISOString(),
          created_at: new Date().toISOString(),
        }));

      const { error } = await this.supabase
        .from('performance_metrics')
        .insert(metricsData);

      if (error) {
        logger.error('Error inserting performance metrics:', error);
        // Put metrics back in buffer to retry later
        this.metricsBuffer.unshift(...metricsToFlush);
      } else {
        logger.debug(`Flushed ${metricsToFlush.length} performance metrics`);
      }
    } catch (error) {
      logger.error('Error flushing performance metrics:', error);
      // Put metrics back in buffer to retry later
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  public async getPerformanceSummary(
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<PerformanceSummary> {
    try {
      let query = this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: metrics, error } = await query;

      if (error) {
        logger.error('Error fetching performance summary:', error);
        throw new AppError('Failed to fetch performance summary', 500);
      }

      const metricsData = metrics || [];
      const totalOperations = metricsData.length;

      if (totalOperations === 0) {
        return {
          totalOperations: 0,
          averageExecutionTime: 0,
          totalDocumentsRead: 0,
          cacheHitRate: 0,
          operationBreakdown: {},
          timeRange: { start: startDate, end: endDate },
        };
      }

      // Calculate totals
      const totalExecutionTime = metricsData.reduce(
        (sum, m) => sum + m.execution_time_ms,
        0,
      );
      const totalDocumentsRead = metricsData.reduce(
        (sum, m) => sum + m.documents_read,
        0,
      );
      const averageExecutionTime = totalExecutionTime / totalOperations;

      // Calculate cache hit rate
      const metricsWithCacheData = metricsData.filter(
        (m) => m.cache_hit_rate !== null,
      );
      const cacheHitRate =
        metricsWithCacheData.length > 0
          ? metricsWithCacheData.reduce(
            (sum, m) => sum + (m.cache_hit_rate || 0),
            0,
          ) / metricsWithCacheData.length
          : 0;

      // Calculate operation breakdown
      const operationBreakdown: Record<
        string,
        { count: number; avgTime: number; totalReads: number }
      > = {};

      for (const metric of metricsData) {
        const opType = metric.operation_type;
        if (!operationBreakdown[opType]) {
          operationBreakdown[opType] = {
            count: 0,
            avgTime: 0,
            totalReads: 0,
          };
        }

        operationBreakdown[opType].count++;
        operationBreakdown[opType].totalReads += metric.documents_read;
      }

      // Calculate average times for each operation type
      for (const opType in operationBreakdown) {
        const opMetrics = metricsData.filter(
          (m) => m.operation_type === opType,
        );
        const totalTime = opMetrics.reduce(
          (sum, m) => sum + m.execution_time_ms,
          0,
        );
        operationBreakdown[opType].avgTime = totalTime / opMetrics.length;
      }

      return {
        totalOperations,
        averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
        totalDocumentsRead,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        operationBreakdown,
        timeRange: { start: startDate, end: endDate },
      };
    } catch (error) {
      logger.error('Error in getPerformanceSummary:', error);
      throw error;
    }
  }

  public async cleanupOldMetrics(): Promise<void> {
    try {
      // Keep only last 30 days of metrics
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const { data, error } = await this.supabase
        .from('performance_metrics')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id');

      if (error) {
        logger.error('Error cleaning up old performance metrics:', error);
        throw new AppError('Failed to cleanup old metrics', 500);
      }

      const deletedCount = data?.length || 0;
      logger.info(`Cleaned up ${deletedCount} old performance metrics`);
    } catch (error) {
      logger.error('Error in cleanupOldMetrics:', error);
      throw error;
    }
  }

  public async forceFlush(): Promise<void> {
    await this.flushMetrics();
  }

  /**
   * Get slow queries for optimization
   */
  public async getSlowQueries(
    thresholdMs: number = 1000,
    days: number = 7,
  ): Promise<
    Array<{
      operationType: string;
      averageTime: number;
      count: number;
      maxTime: number;
      queryFilters?: any;
    }>
  > {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: metrics, error } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .gte('execution_time_ms', thresholdMs)
        .order('execution_time_ms', { ascending: false });

      if (error) {
        logger.error('Error fetching slow queries:', error);
        throw new AppError('Failed to fetch slow queries', 500);
      }

      const slowMetrics = metrics || [];

      // Group by operation type
      const grouped: Record<string, any[]> = {};
      for (const metric of slowMetrics) {
        if (!grouped[metric.operation_type]) {
          grouped[metric.operation_type] = [];
        }
        grouped[metric.operation_type].push(metric);
      }

      // Calculate statistics for each operation type
      const result = Object.entries(grouped).map(
        ([operationType, opMetrics]) => {
          const totalTime = opMetrics.reduce(
            (sum, m) => sum + m.execution_time_ms,
            0,
          );
          const averageTime = totalTime / opMetrics.length;
          const maxTime = Math.max(
            ...opMetrics.map((m) => m.execution_time_ms),
          );

          // Get most common query filters
          const filterCounts: Record<string, number> = {};
          for (const metric of opMetrics) {
            if (metric.query_filters) {
              const filtersKey = metric.query_filters;
              filterCounts[filtersKey] = (filterCounts[filtersKey] || 0) + 1;
            }
          }

          const mostCommonFilters = Object.entries(filterCounts).sort(
            ([, a], [, b]) => b - a,
          )[0];

          return {
            operationType,
            averageTime: Math.round(averageTime * 100) / 100,
            count: opMetrics.length,
            maxTime,
            queryFilters: mostCommonFilters
              ? JSON.parse(mostCommonFilters[0])
              : undefined,
          };
        },
      );

      return result.sort((a, b) => b.averageTime - a.averageTime);
    } catch (error) {
      logger.error('Error in getSlowQueries:', error);
      throw error;
    }
  }

  /**
   * Get performance trends over time
   */
  public async getPerformanceTrends(
    days: number = 30,
    userId?: string,
  ): Promise<
    Array<{
      date: string;
      averageExecutionTime: number;
      totalOperations: number;
      cacheHitRate: number;
    }>
  > {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: metrics, error } = await query;

      if (error) {
        logger.error('Error fetching performance trends:', error);
        throw new AppError('Failed to fetch performance trends', 500);
      }

      const metricsData = metrics || [];

      // Group by date
      const dailyMetrics: Record<string, any[]> = {};
      for (const metric of metricsData) {
        const date = new Date(metric.timestamp).toISOString().split('T')[0];
        if (!dailyMetrics[date]) {
          dailyMetrics[date] = [];
        }
        dailyMetrics[date].push(metric);
      }

      // Calculate daily statistics
      const trends = Object.entries(dailyMetrics).map(([date, dayMetrics]) => {
        const totalOperations = dayMetrics.length;
        const totalTime = dayMetrics.reduce(
          (sum, m) => sum + m.execution_time_ms,
          0,
        );
        const averageExecutionTime = totalTime / totalOperations;

        const metricsWithCache = dayMetrics.filter(
          (m) => m.cache_hit_rate !== null,
        );
        const cacheHitRate =
          metricsWithCache.length > 0
            ? metricsWithCache.reduce(
              (sum, m) => sum + (m.cache_hit_rate || 0),
              0,
            ) / metricsWithCache.length
            : 0;

        return {
          date,
          averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
          totalOperations,
          cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        };
      });

      return trends.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error('Error in getPerformanceTrends:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const performanceMonitor = new SupabasePerformanceMonitoringService(
  // This will be injected when the service is initialized
  {} as SupabaseClient,
);


