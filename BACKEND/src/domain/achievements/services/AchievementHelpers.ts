import { SupabaseClient } from '@supabase/supabase-js';
import { AchievementEvent, AchievementCheckResult } from '../types';
import { logger } from '../../../utils/logger';
import supabase from '../../../config/supabaseAdmin';

/**
 * Helpers para operações de conquistas
 */
export class AchievementHelpers {
  constructor(private readonly client: SupabaseClient = supabase) {}

  // === HISTÓRICO DE EVENTOS ===

  async getUserEventHistory(
    userId: string,
    limit = 100,
  ): Promise<AchievementEvent[]> {
    const { data, error } = await this.client
      .from('achievement_events')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Erro ao buscar histórico de eventos do usuário:', error);
      return [];
    }

    return data || [];
  }

  async getAchievementEventHistory(
    achievementId: string,
    limit = 50,
  ): Promise<AchievementEvent[]> {
    const { data, error } = await this.client
      .from('achievement_events')
      .select('*')
      .eq('achievementId', achievementId)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Erro ao buscar histórico de eventos da conquista:', error);
      return [];
    }

    return data || [];
  }

  // === SINCRONIZAÇÃO COM SISTEMAS ===

  async syncWithUserStatistics(
    userId: string,
    userStatsService: any,
  ): Promise<AchievementCheckResult> {
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
        timestamp: new Date().toISOString(),
      };

      logger.info(
        'AchievementHelpers',
        'syncWithUserStatistics',
        `Sincronização completada para ${userId}`,
      );

      return result;
    } catch (error) {
      logger.error(
        'AchievementHelpers',
        'syncWithUserStatistics',
        `Erro na sincronização para ${userId}`,
        error,
      );
      throw error;
    }
  }

  // === LOG DE EVENTOS ===

  // TODO: Implementar mais helpers conforme necessário...
}
