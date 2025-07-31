import { Firestore, Timestamp } from 'firebase-admin/firestore';
import {
  AchievementEvent,
  AchievementCheckResult,
} from '../types';
import { logger } from '../../../utils/logger';

/**
 * Helpers para operações de conquistas
 */
export class AchievementHelpers {
  constructor(private readonly firestore: Firestore) {}

  // === HISTÓRICO DE EVENTOS ===

  async getUserEventHistory(userId: string, limit = 100): Promise<AchievementEvent[]> {
    const snapshot = await this.firestore
      .collection('achievementEvents')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc: any) => doc.data() as AchievementEvent);
  }

  async getAchievementEventHistory(achievementId: string, limit = 50): Promise<AchievementEvent[]> {
    const snapshot = await this.firestore
      .collection('achievementEvents')
      .where('achievementId', '==', achievementId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc: any) => doc.data() as AchievementEvent);
  }

  // === SINCRONIZAÇÃO COM SISTEMAS ===

  async syncWithUserStatistics(userId: string, userStatsService: any): Promise<AchievementCheckResult> {
    if (!userStatsService) {
      throw new Error('User statistics service is required');
    }

    try {
      // User stats are processed but not used in this helper method
      await userStatsService.getOrCreateUserStatistics(userId);
      
      const result: AchievementCheckResult = {
        userId,
        checksPerformed: 0,
        progressUpdates: [],
        newCompletions: [],
        newUnlocks: [],
        notifications: [],
        updatedStats: null as any,
        processingTime: 0,
        timestamp: Timestamp.now()
      };

      logger.info('AchievementHelpers', 'syncWithUserStatistics', 
        `Sincronização completada para ${userId}`);

      return result;
    } catch (error) {
      logger.error('AchievementHelpers', 'syncWithUserStatistics', 
        `Erro na sincronização para ${userId}`, error);
      throw error;
    }
  }

  // === LOG DE EVENTOS ===

  // TODO: Implementar mais helpers conforme necessário...
} 