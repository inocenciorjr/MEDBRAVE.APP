import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Interface para log de notificação
 */
interface NotificationLog {
  id: string;
  timestamp: Timestamp;
  operation: string;
  userId?: string;
  notificationId?: string;
  success: boolean;
  error?: string;
  durationMs: number;
  details?: Record<string, any>;
}

/**
 * Classe para logging de operações de notificação
 */
export class NotificationLogger {
  private db: firestore.Firestore;
  private logsCollection = 'notification_logs';

  constructor(db: firestore.Firestore) {
    this.db = db;
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
        timestamp: Timestamp.now(),
        operation,
        success,
        durationMs,
        userId: details?.userId,
        notificationId: details?.notificationId,
      };

      if (details?.error) {
        if (details.error instanceof Error) {
          logEntry.error = details.error.message;
          logEntry.details = { 
            errorStack: details.error.stack,
            ...details
          };
        } else {
          logEntry.error = String(details.error);
          logEntry.details = { ...details };
        }
      } else if (details) {
        // Remover userId e notificationId para não duplicar
        const { userId, notificationId, ...otherDetails } = details;
        logEntry.details = otherDetails;
      }

      const docRef = await this.db.collection(this.logsCollection).add(logEntry);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao registrar log de notificação:', error);
      return '';
    }
  }

  /**
   * Obtém estatísticas de logs para um período
   */
  async getStats(
    lookbackHours: number = 24,
  ): Promise<{
    total: number;
    success: number;
    error: number;
    avgDuration: number;
    errorRate: number;
    operations: Record<string, number>;
  }> {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - lookbackHours);
      
      const logsSnapshot = await this.db
        .collection(this.logsCollection)
        .where('timestamp', '>=', Timestamp.fromDate(startTime))
        .get();

      let total = 0;
      let success = 0;
      let error = 0;
      let totalDuration = 0;
      const operations: Record<string, number> = {};

      logsSnapshot.forEach((doc) => {
        const log = doc.data() as NotificationLog;
        total++;
        
        if (log.success) {
          success++;
        } else {
          error++;
        }
        
        totalDuration += log.durationMs;
        
        if (log.operation) {
          operations[log.operation] = (operations[log.operation] || 0) + 1;
        }
      });

      return {
        total,
        success,
        error,
        avgDuration: total > 0 ? totalDuration / total : 0,
        errorRate: total > 0 ? error / total : 0,
        operations,
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de logs de notificação:', error);
      return {
        total: 0,
        success: 0,
        error: 0,
        avgDuration: 0,
        errorRate: 0,
        operations: {},
      };
    }
  }
} 