import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../../config/supabase';
import { SupabaseNotificationLogger } from '../../notificationLogs/SupabaseNotificationLogger';
import logger from '../../../utils/logger';

/**
 * Interface para métricas de desempenho de notificações
 */
interface NotificationPerformanceMetrics {
  id: string;
  timestamp: string;
  period: string; // 'hourly', 'daily', 'weekly'
  create_notification_avg_time: number;
  mark_as_read_avg_time: number;
  get_user_notifications_avg_time: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  notification_count: number;
  read_notification_count: number;
  unread_notification_count: number;
  most_common_notification_type: string;
  expired_notification_count: number;
}

/**
 * Classe para monitoramento do módulo de notificações usando Supabase
 */
export class SupabaseNotificationMonitor {
  private client: SupabaseClient;
  private logger: SupabaseNotificationLogger;
  private metricsTable = 'notification_metrics';
  private healthChecksTable = 'notification_health_checks';

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
    this.logger = new SupabaseNotificationLogger(client);
  }

  /**
   * Coleta métricas de desempenho do módulo de notificações
   */
  async collectPerformanceMetrics(
    period: 'hourly' | 'daily' | 'weekly' = 'daily',
  ): Promise<string> {
    try {
      // Definir o período de coleta
      let lookbackHours: number;
      switch (period) {
        case 'hourly':
          lookbackHours = 1;
          break;
        case 'daily':
          lookbackHours = 24;
          break;
        case 'weekly':
          lookbackHours = 168;
          break;
        default:
          lookbackHours = 24;
      }

      // Coletar estatísticas dos logs
      const logStats = await this.logger.getStats(lookbackHours);

      // Coletar estatísticas das notificações
      const notificationStats = await this.calculateNotificationStats();

      // Coletar estatísticas de desempenho
      const performanceStats = await this.calculatePerformanceStats();

      // Criar entrada de métricas
      const metrics: Omit<NotificationPerformanceMetrics, 'id'> = {
        timestamp: new Date().toISOString(),
        period,
        create_notification_avg_time:
          performanceStats.createNotificationAvgTime,
        mark_as_read_avg_time: performanceStats.markAsReadAvgTime,
        get_user_notifications_avg_time:
          performanceStats.getUserNotificationsAvgTime,
        total_requests: logStats.total,
        successful_requests: logStats.success,
        failed_requests: logStats.error,
        notification_count: notificationStats.total,
        read_notification_count: notificationStats.read,
        unread_notification_count: notificationStats.unread,
        most_common_notification_type: notificationStats.mostCommonType,
        expired_notification_count: notificationStats.expired,
      };

      const { data, error } = await this.client
        .from(this.metricsTable)
        .insert(metrics)
        .select('id')
        .single();

      if (error) {
        logger.error(
          'SupabaseNotificationMonitor',
          'collectPerformanceMetrics',
          'Erro ao salvar métricas:',
          error,
        );
        throw error;
      }

      logger.info(
        'SupabaseNotificationMonitor',
        'collectPerformanceMetrics',
        `Métricas coletadas para período ${period}`,
      );
      return data.id;
    } catch (error) {
      logger.error(
        'SupabaseNotificationMonitor',
        'collectPerformanceMetrics',
        'Erro inesperado:',
        error,
      );
      throw error;
    }
  }

  /**
   * Executa verificação de saúde do módulo de notificações
   */
  async performHealthCheck(): Promise<{
    isHealthy: boolean;
    details: Record<string, any>;
  }> {
    try {
      const healthDetails: Record<string, any> = {};
      let isHealthy = true;

      // Verificar se o serviço consegue se conectar ao Supabase
      try {
        const { error } = await this.client
          .from('notifications')
          .select('count')
          .limit(1);

        if (error) {
          healthDetails.supabaseConnection = {
            status: 'error',
            message: error.message,
          };
          isHealthy = false;
        } else {
          healthDetails.supabaseConnection = {
            status: 'ok',
            message: 'Conexão com Supabase funcionando',
          };
        }
      } catch (error) {
        healthDetails.supabaseConnection = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        };
        isHealthy = false;
      }

      // Verificar estatísticas recentes
      try {
        const recentStats = await this.logger.getStats(1); // Última hora

        healthDetails.recentActivity = {
          status: 'ok',
          totalRequests: recentStats.total,
          errorRate: recentStats.errorRate,
          avgDuration: recentStats.avgDuration,
        };

        // Verificar se a taxa de erro está muito alta
        if (recentStats.errorRate > 0.1) {
          // Mais de 10% de erro
          healthDetails.recentActivity.status = 'warning';
          healthDetails.recentActivity.message = 'Taxa de erro elevada';
        }

        // Verificar se o tempo de resposta está muito alto
        if (recentStats.avgDuration > 5000) {
          // Mais de 5 segundos
          healthDetails.recentActivity.status = 'warning';
          healthDetails.recentActivity.message = 'Tempo de resposta elevado';
        }
      } catch (error) {
        healthDetails.recentActivity = {
          status: 'error',
          message: 'Erro ao obter estatísticas recentes',
        };
        isHealthy = false;
      }

      // Salvar resultado da verificação de saúde
      const healthCheckEntry = {
        timestamp: new Date().toISOString(),
        is_healthy: isHealthy,
        details: healthDetails,
      };

      await this.client.from(this.healthChecksTable).insert(healthCheckEntry);

      return {
        isHealthy,
        details: healthDetails,
      };
    } catch (error) {
      logger.error(
        'SupabaseNotificationMonitor',
        'performHealthCheck',
        'Erro inesperado:',
        error,
      );
      return {
        isHealthy: false,
        details: {
          error: {
            status: 'error',
            message:
              error instanceof Error ? error.message : 'Erro desconhecido',
          },
        },
      };
    }
  }

  /**
   * Configura alertas para o monitoramento
   */
  async configureAlerts(
    errorRateThreshold: number = 0.05,
    responseTimeThreshold: number = 1000,
    notificationEmail: string,
  ): Promise<boolean> {
    try {
      // Em uma implementação real, configuraria alertas no sistema de monitoramento
      // Por enquanto, apenas logamos a configuração
      logger.info(
        'SupabaseNotificationMonitor',
        'configureAlerts',
        `Alertas configurados: errorRate=${errorRateThreshold}, responseTime=${responseTimeThreshold}, email=${notificationEmail}`,
      );

      // Salvar configuração de alertas
      const alertConfig = {
        error_rate_threshold: errorRateThreshold,
        response_time_threshold: responseTimeThreshold,
        notification_email: notificationEmail,
        created_at: new Date().toISOString(),
      };

      const { error } = await this.client
        .from('alert_configurations')
        .upsert(alertConfig, { onConflict: 'notification_email' });

      if (error) {
        logger.error(
          'SupabaseNotificationMonitor',
          'configureAlerts',
          'Erro ao salvar configuração:',
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      logger.error(
        'SupabaseNotificationMonitor',
        'configureAlerts',
        'Erro inesperado:',
        error,
      );
      return false;
    }
  }

  /**
   * Calcula estatísticas das notificações
   */
  private async calculateNotificationStats(): Promise<{
    total: number;
    read: number;
    unread: number;
    mostCommonType: string;
    expired: number;
  }> {
    try {
      // Buscar estatísticas das notificações
      const { data: notifications, error } = await this.client
        .from('notifications')
        .select('is_read, type, expires_at')
        .gte(
          'created_at',
          new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString(),
        );

      if (error) {
        logger.error(
          'SupabaseNotificationMonitor',
          'calculateNotificationStats',
          'Erro ao buscar notificações:',
          error,
        );
        throw error;
      }

      if (!notifications || notifications.length === 0) {
        return {
          total: 0,
          read: 0,
          unread: 0,
          mostCommonType: 'none',
          expired: 0,
        };
      }

      const total = notifications.length;
      const read = notifications.filter((n) => n.is_read).length;
      const unread = total - read;

      // Contar tipos
      const typeCounts: Record<string, number> = {};
      notifications.forEach((n) => {
        typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
      });

      const mostCommonType =
        Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        'none';

      // Contar expiradas
      const now = new Date();
      const expired = notifications.filter(
        (n) => n.expires_at && new Date(n.expires_at) < now,
      ).length;

      return {
        total,
        read,
        unread,
        mostCommonType,
        expired,
      };
    } catch (error) {
      logger.error(
        'SupabaseNotificationMonitor',
        'calculateNotificationStats',
        'Erro inesperado:',
        error,
      );
      return {
        total: 0,
        read: 0,
        unread: 0,
        mostCommonType: 'error',
        expired: 0,
      };
    }
  }

  /**
   * Calcula estatísticas de desempenho
   */
  private async calculatePerformanceStats(): Promise<{
    createNotificationAvgTime: number;
    markAsReadAvgTime: number;
    getUserNotificationsAvgTime: number;
  }> {
    try {
      // Buscar logs de operações específicas das últimas 24 horas
      const cutoffTime = new Date(
        new Date().getTime() - 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data: logs, error } = await this.client
        .from('notification_logs')
        .select('operation, duration_ms')
        .gte('timestamp', cutoffTime)
        .in('operation', [
          'createNotification',
          'markAsRead',
          'getUserNotifications',
        ]);

      if (error) {
        logger.error(
          'SupabaseNotificationMonitor',
          'calculatePerformanceStats',
          'Erro ao buscar logs:',
          error,
        );
        throw error;
      }

      if (!logs || logs.length === 0) {
        return {
          createNotificationAvgTime: 0,
          markAsReadAvgTime: 0,
          getUserNotificationsAvgTime: 0,
        };
      }

      // Calcular médias por operação
      const operationStats: Record<string, number[]> = {
        createNotification: [],
        markAsRead: [],
        getUserNotifications: [],
      };

      logs.forEach((log) => {
        if (operationStats[log.operation]) {
          operationStats[log.operation].push(log.duration_ms);
        }
      });

      const calculateAvg = (times: number[]) =>
        times.length > 0
          ? times.reduce((sum, time) => sum + time, 0) / times.length
          : 0;

      return {
        createNotificationAvgTime: calculateAvg(
          operationStats.createNotification,
        ),
        markAsReadAvgTime: calculateAvg(operationStats.markAsRead),
        getUserNotificationsAvgTime: calculateAvg(
          operationStats.getUserNotifications,
        ),
      };
    } catch (error) {
      logger.error(
        'SupabaseNotificationMonitor',
        'calculatePerformanceStats',
        'Erro inesperado:',
        error,
      );
      return {
        createNotificationAvgTime: 0,
        markAsReadAvgTime: 0,
        getUserNotificationsAvgTime: 0,
      };
    }
  }
}

// Exportar instância padrão
export const notificationMonitor = new SupabaseNotificationMonitor();


