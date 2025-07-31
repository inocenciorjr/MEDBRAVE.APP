import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { NotificationLogger } from '../notificationLogs';

/**
 * Interface para métricas de desempenho de notificações
 */
interface NotificationPerformanceMetrics {
  id: string;
  timestamp: Timestamp;
  period: string; // 'hourly', 'daily', 'weekly'
  createNotificationAvgTime: number;
  markAsReadAvgTime: number;
  getUserNotificationsAvgTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  notificationCount: number;
  readNotificationCount: number;
  unreadNotificationCount: number;
  mostCommonNotificationType: string;
  expiredNotificationCount: number;
}

/**
 * Classe para monitoramento do módulo de notificações
 */
export class NotificationMonitor {
  private db: firestore.Firestore;
  private logger: NotificationLogger;
  private metricsCollection = 'notification_metrics';
  private healthChecksCollection = 'notification_health_checks';

  constructor(db: firestore.Firestore) {
    this.db = db;
    this.logger = new NotificationLogger(db);
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
        case 'weekly':
          lookbackHours = 24 * 7;
          break;
        case 'daily':
        default:
          lookbackHours = 24;
          break;
      }

      // Obter estatísticas de logs
      const logStats = await this.logger.getStats(lookbackHours);

      // Calcular métricas de notificações
      const notificationStats = await this.calculateNotificationStats();

      // Calcular métricas de tempo de resposta
      const performanceStats = await this.calculatePerformanceStats();

      // Criar documento de métricas
      const metricsRef = this.db.collection(this.metricsCollection).doc();
      const metrics: NotificationPerformanceMetrics = {
        id: metricsRef.id,
        timestamp: Timestamp.now(),
        period,
        createNotificationAvgTime: performanceStats.createNotificationAvgTime,
        markAsReadAvgTime: performanceStats.markAsReadAvgTime,
        getUserNotificationsAvgTime: performanceStats.getUserNotificationsAvgTime,
        totalRequests: logStats.total,
        successfulRequests: logStats.success,
        failedRequests: logStats.error,
        notificationCount: notificationStats.total,
        readNotificationCount: notificationStats.read,
        unreadNotificationCount: notificationStats.unread,
        mostCommonNotificationType: notificationStats.mostCommonType,
        expiredNotificationCount: notificationStats.expired,
      };

      await metricsRef.set(metrics);
      return metricsRef.id;
    } catch (error) {
      console.error('Erro ao coletar métricas de desempenho de notificações:', error);
      return '';
    }
  }

  /**
   * Realiza um health check do serviço de notificações
   */
  async performHealthCheck(): Promise<{
    isHealthy: boolean;
    details: Record<string, any>;
  }> {
    try {
      // Verificar se o serviço consegue se conectar ao Firestore
      const testRef = this.db.collection(this.healthChecksCollection).doc();
      await testRef.set({
        timestamp: Timestamp.now(),
        source: 'health_check',
      });
      await testRef.delete();

      // Verificar taxas de erro recentes
      const logStats = await this.logger.getStats(1); // Última hora
      const errorRate = logStats.errorRate;
      const isErrorRateAcceptable = errorRate < 0.05; // Menos de 5% de erro é aceitável

      // Verificar tempos de resposta
      const perfStats = await this.calculatePerformanceStats();
      const isPerformanceAcceptable =
        perfStats.createNotificationAvgTime < 500 && // menos de 500ms
        perfStats.markAsReadAvgTime < 300 && // menos de 300ms
        perfStats.getUserNotificationsAvgTime < 1000; // menos de 1s

      // Determinar o status geral de saúde
      const isHealthy = isErrorRateAcceptable && isPerformanceAcceptable;

      // Registrar o resultado
      const healthCheckRef = this.db.collection(this.healthChecksCollection).doc();
      const details = {
        timestamp: Timestamp.now(),
        errorRate,
        isErrorRateAcceptable,
        performanceMetrics: perfStats,
        isPerformanceAcceptable,
        isHealthy,
      };

      await healthCheckRef.set(details);

      return {
        isHealthy,
        details,
      };
    } catch (error) {
      console.error('Erro ao realizar health check do módulo de notificações:', error);
      return {
        isHealthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Configura alertas para problemas no sistema de notificações
   */
  async configureAlerts(
    errorRateThreshold: number = 0.05,
    responseTimeThreshold: number = 1000,
    notificationEmail: string,
  ): Promise<boolean> {
    try {
      // Registrar configuração de alertas
      await this.db.collection('notification_alerts_config').doc('config').set({
        errorRateThreshold,
        responseTimeThreshold,
        notificationEmail,
        updatedAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error('Erro ao configurar alertas para o módulo de notificações:', error);
      return false;
    }
  }

  /**
   * Métodos privados auxiliares
   */
  private async calculateNotificationStats(): Promise<{
    total: number;
    read: number;
    unread: number;
    mostCommonType: string;
    expired: number;
  }> {
    // Simulação - em uma implementação real, faria as queries no Firestore
    return {
      total: 1000,
      read: 750,
      unread: 250,
      mostCommonType: 'SYSTEM',
      expired: 50,
    };
  }

  private async calculatePerformanceStats(): Promise<{
    createNotificationAvgTime: number;
    markAsReadAvgTime: number;
    getUserNotificationsAvgTime: number;
  }> {
    // Simulação - em uma implementação real, calcularia a partir dos logs
    // e usaria o parâmetro lookbackHours para filtrar os dados em uma implementação real
    return {
      createNotificationAvgTime: 120, // em ms
      markAsReadAvgTime: 85, // em ms
      getUserNotificationsAvgTime: 250, // em ms
    };
  }
}
