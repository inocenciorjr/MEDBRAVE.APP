import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import logger from '../../utils/logger';

/**
 * Interface para log de notificação
 */
interface NotificationLog {
  id: string;
  timestamp: string;
  operation: string;
  user_id?: string;
  notification_id?: string;
  success: boolean;
  error?: string;
  duration_ms: number;
  details?: Record<string, any>;
}

/**
 * Classe para logging de operações de notificação usando Supabase
 */
export class SupabaseNotificationLogger {
  private client: SupabaseClient;
  private logsTable = 'notification_logs';

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  /**
   * Registra uma operação de notificação
   */
  async log(
    operation: string,
    success: boolean,
    durationMs: number,
    details?: {
      userId?: string;
      notificationId?: string;
      error?: Error | string;
      [key: string]: any;
    },
  ): Promise<string> {
    try {
      const logEntry: Omit<NotificationLog, 'id'> = {
        timestamp: new Date().toISOString(),
        operation,
        success,
        duration_ms: durationMs,
        user_id: details?.userId,
        notification_id: details?.notificationId,
        error: details?.error
          ? details.error instanceof Error
            ? details.error.message
            : String(details.error)
          : undefined,
        details: details
          ? {
            ...details,
            userId: undefined,
            notificationId: undefined,
            error: undefined,
          }
          : undefined,
      };

      const { data, error } = await this.client
        .from(this.logsTable)
        .insert(logEntry)
        .select('id')
        .single();

      if (error) {
        logger.error('NotificationLogger', 'log', 'Erro ao salvar log:', error);
        throw error;
      }

      return data.id;
    } catch (error) {
      logger.error('NotificationLogger', 'log', 'Erro inesperado:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas dos logs
   */
  async getStats(lookbackHours: number = 24): Promise<{
    total: number;
    success: number;
    error: number;
    avgDuration: number;
    errorRate: number;
    operations: Record<string, number>;
  }> {
    try {
      const cutoffTime = new Date(
        Date.now() - lookbackHours * 60 * 60 * 1000,
      ).toISOString();

      // Buscar logs do período
      const { data: logs, error } = await this.client
        .from(this.logsTable)
        .select('*')
        .gte('timestamp', cutoffTime)
        .order('timestamp', { ascending: false });

      if (error) {
        logger.error(
          'NotificationLogger',
          'getStats',
          'Erro ao buscar logs:',
          error,
        );
        throw error;
      }

      if (!logs || logs.length === 0) {
        return {
          total: 0,
          success: 0,
          error: 0,
          avgDuration: 0,
          errorRate: 0,
          operations: {},
        };
      }

      const total = logs.length;
      const success = logs.filter((log) => log.success).length;
      const errorCount = total - success;
      const avgDuration =
        logs.reduce((sum, log) => sum + log.duration_ms, 0) / total;
      const errorRate = total > 0 ? errorCount / total : 0;

      // Contar operações
      const operations: Record<string, number> = {};
      logs.forEach((log) => {
        operations[log.operation] = (operations[log.operation] || 0) + 1;
      });

      return {
        total,
        success,
        error: errorCount,
        avgDuration,
        errorRate,
        operations,
      };
    } catch (error) {
      logger.error('NotificationLogger', 'getStats', 'Erro inesperado:', error);
      throw error;
    }
  }

  /**
   * Remove logs antigos
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffTime = new Date(
        Date.now() - olderThanDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data, error } = await this.client
        .from(this.logsTable)
        .delete()
        .lt('timestamp', cutoffTime)
        .select('id');

      if (error) {
        logger.error(
          'NotificationLogger',
          'cleanup',
          'Erro ao limpar logs:',
          error,
        );
        throw error;
      }

      const deletedCount = data?.length || 0;
      logger.info(
        'NotificationLogger',
        'cleanup',
        `${deletedCount} logs removidos`,
      );

      return deletedCount;
    } catch (error) {
      logger.error('NotificationLogger', 'cleanup', 'Erro inesperado:', error);
      throw error;
    }
  }
}

// Exportar instância padrão
export const notificationLogger = new SupabaseNotificationLogger();
