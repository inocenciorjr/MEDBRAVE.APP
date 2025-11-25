import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../../config/supabaseAdmin';
import {
  Achievement,
  UserAchievement,
  UserAchievementStats,
  AchievementLeaderboard,
  AchievementNotification,
  AchievementEvent,
  AchievementConfig,
  AchievementTemplate,
  AchievementCheckPayload,
  AchievementCheckResult,
  AchievementFilters,
  AchievementCategory,
  AchievementRarity,
  AchievementStatus,
  AchievementCondition,
} from '../../../domain/achievements/types';
import { IAchievementService } from '../../../domain/achievements/interfaces/IAchievementService';
import { IUserStatisticsService } from '../../../domain/userStatistics/interfaces/IUserStatisticsService';
import { logger } from '../../../utils/logger';
import AppError from '../../../utils/AppError';

/**
 * Serviço de conquistas de última geração com IA e gamificação avançada
 */
export class SupabaseAchievementService implements IAchievementService {
  private readonly achievementsTable = 'achievements';
  private readonly userAchievementsTable = 'user_achievements';
  private readonly userStatsTable = 'user_achievement_stats';
  private readonly leaderboardsTable = 'achievement_leaderboards';
  private readonly notificationsTable = 'achievement_notifications';
  private readonly eventsTable = 'achievement_events';
  private readonly configTable = 'achievement_config';
  private readonly currentVersion = '1.0';

  constructor(
    private readonly client: SupabaseClient = supabase,
    private readonly userStatsService?: IUserStatisticsService,
  ) {}

  // === GESTÃO DE CONQUISTAS ===

  async createAchievement(
    achievementData: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
  ): Promise<Achievement> {
    const now = new Date().toISOString();

    const achievement: Achievement = {
      ...achievementData,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      version: this.currentVersion,
    };

    const { data, error } = await this.client
      .from(this.achievementsTable)
      .insert(achievement)
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar conquista:', error);
      throw new AppError(`Falha ao criar conquista: ${error.message}`, 500);
    }

    logger.info(`Conquista criada: ${achievement.id}`);
    return data;
  }

  async getAchievementById(achievementId: string): Promise<Achievement | null> {
    const { data, error } = await this.client
      .from(this.achievementsTable)
      .select('*')
      .eq('id', achievementId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new AppError(`Falha ao buscar conquista: ${error.message}`, 500);
    }

    return data;
  }

  async updateAchievement(
    achievementId: string,
    updates: Partial<Achievement>,
  ): Promise<Achievement> {
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from(this.achievementsTable)
      .update(updateData)
      .eq('id', achievementId)
      .select()
      .single();

    if (error) {
      logger.error(`Erro ao atualizar conquista ${achievementId}:`, error);
      throw new AppError(`Falha ao atualizar conquista: ${error.message}`, 500);
    }

    logger.info(`Conquista atualizada: ${achievementId}`);
    return data;
  }

  async deleteAchievement(achievementId: string): Promise<boolean> {
    try {
      // Verificar se há usuários com esta conquista
      const { count } = await this.client
        .from(this.userAchievementsTable)
        .select('*', { count: 'exact', head: true })
        .eq('achievementId', achievementId);

      if (count && count > 0) {
        logger.warn(
          `Tentativa de deletar conquista ${achievementId} que possui ${count} usuários associados`,
        );
        return false;
      }

      const { error } = await this.client
        .from(this.achievementsTable)
        .delete()
        .eq('id', achievementId);

      if (error) {
        logger.error(`Erro ao deletar conquista ${achievementId}:`, error);
        return false;
      }

      logger.info(`Conquista deletada: ${achievementId}`);
      return true;
    } catch (error) {
      logger.error(`Erro ao deletar conquista ${achievementId}:`, error);
      return false;
    }
  }

  async getAllAchievements(
    filters?: AchievementFilters,
  ): Promise<Achievement[]> {
    let query = this.client.from(this.achievementsTable).select('*');

    if (filters?.categories && filters.categories.length) {
      query = query.in('category', filters.categories);
    }

    if (filters?.rarities && filters.rarities.length) {
      query = query.in('rarity', filters.rarities);
    }

    if (filters?.status && filters.status.length) {
      query = query.in('status', filters.status);
    }

    // Filtros de atividade/trigger não fazem parte de AchievementFilters

    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrderAsc = (filters?.sortOrder || 'desc') === 'asc';
    const { data, error } = await query.order(sortBy, {
      ascending: sortOrderAsc,
    });

    if (error) {
      throw new AppError(`Falha ao buscar conquistas: ${error.message}`, 500);
    }

    return data || [];
  }

  async createAchievementsFromTemplate(
    template: AchievementTemplate,
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    for (const variation of template.variations) {
      try {
        const achievement = await this.createAchievement({
          name: `${template.name} ${variation.suffix}`,
          description: template.description,
          category: template.category,
          rarity: variation.rarity,
          isActive: true,
          triggerType: template.triggerType,
          conditions: [
            {
              field: template.conditionTemplate.field,
              type: template.conditionTemplate.type,
              operator: template.conditionTemplate.operator,
              value: variation.targetValue,
            },
          ],
          rewards: variation.rewards,
          tags: [],
          isHidden: false,
          isRepeatable: false,
          createdBy: 'system',
        });
        achievements.push(achievement);
      } catch (error) {
        logger.error(
          `Erro ao criar conquista do template ${template.name}:`,
          error,
        );
      }
    }

    logger.info(
      `Template ${template.name} processado: ${achievements.length} conquistas criadas`,
    );
    return achievements;
  }

  // === GESTÃO DE CONQUISTAS DO USUÁRIO ===

  async getUserAchievements(
    userId: string,
    filters?: AchievementFilters,
  ): Promise<UserAchievement[]> {
    let query = this.client
      .from(this.userAchievementsTable)
      .select('*')
      .eq('userId', userId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    // Filtros por categoria/raridade via snapshot removidos; podem ser aplicados cliente

    const { data, error } = await query.order('updated_at', {
      ascending: false,
    });

    if (error) {
      throw new AppError(
        `Falha ao buscar conquistas do usuário: ${error.message}`,
        500,
      );
    }

    return data || [];
  }

  async getUserAchievement(
    userId: string,
    achievementId: string,
  ): Promise<UserAchievement | null> {
    const { data, error } = await this.client
      .from(this.userAchievementsTable)
      .select('*')
      .eq('userId', userId)
      .eq('achievementId', achievementId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new AppError(
        `Falha ao buscar conquista do usuário: ${error.message}`,
        500,
      );
    }

    return data;
  }

  async initializeUserAchievements(userId: string): Promise<UserAchievement[]> {
    const achievements = (await this.getAllAchievements()).filter((a) => a.isActive);
    const userAchievements: UserAchievement[] = [];
    const now = new Date().toISOString();

    for (const achievement of achievements) {
      const userAchievement: UserAchievement = {
        id: crypto.randomUUID(),
        userId,
        achievementId: achievement.id,
        status: AchievementStatus.LOCKED,
        progress: {
          current: 0,
          target: this.extractTargetFromConditions(achievement.conditions),
          percentage: 0,
          lastUpdated: now,
          milestones: [],
        },
        rewardsCollected: false,
        firstSeenAt: now,
        lastUpdatedAt: now,
        completionCount: 0,
      };

      const { data, error } = await this.client
        .from(this.userAchievementsTable)
        .insert(userAchievement)
        .select()
        .single();

      if (!error && data) {
        userAchievements.push(data);
      }
    }

    logger.info(
      `Inicializadas ${userAchievements.length} conquistas para usuário ${userId}`,
    );
    return userAchievements;
  }

  async updateUserAchievementProgress(
    userId: string,
    achievementId: string,
    progressData: any,
  ): Promise<UserAchievement> {
    const userAchievement = await this.getUserAchievement(
      userId,
      achievementId,
    );

    if (!userAchievement) {
      throw new AppError('Conquista do usuário não encontrada', 404);
    }

    const updatedProgress = {
      ...userAchievement.progress,
      ...progressData,
      percentage: Math.min(
        100,
        (progressData.current / userAchievement.progress.target) * 100,
      ),
      lastUpdated: new Date().toISOString(),
    };

    const isCompleted = updatedProgress.current >= updatedProgress.target;
    const updateData: Partial<UserAchievement> = {
      progress: updatedProgress,
      status: isCompleted
        ? AchievementStatus.COMPLETED
        : AchievementStatus.IN_PROGRESS,
      lastUpdatedAt: new Date().toISOString(),
    };

    if (isCompleted && !userAchievement.completedAt) {
      updateData.completedAt = new Date().toISOString();

      // Criar notificação
      await this.createNotification({
        userId,
        achievementId,
        type: 'completed',
        title: "Conquista Desbloqueada!",
        message: `Você completou uma conquista`,
        isRead: false,
        isImportant: false,
      });

      // Log do evento
      await this.logEvent({
        userId,
        achievementId,
        eventType: 'completed',
        triggerSource: 'achievements',
        triggerData: { progress: updatedProgress },
      });
    }

    const { data, error } = await this.client
      .from(this.userAchievementsTable)
      .update(updateData)
      .eq('id', userAchievement.id)
      .select('*')
      .single();

    if (error) {
      throw new AppError(`Falha ao atualizar progresso: ${error.message}`, 500);
    }

    return data;
  }

  // === VERIFICAÇÃO DE CONQUISTAS ===

  async checkAchievements(
    payload: AchievementCheckPayload,
  ): Promise<AchievementCheckResult> {
    const result: AchievementCheckResult = {
      userId: payload.userId,
      checksPerformed: 0,
      progressUpdates: [],
      newCompletions: [],
      newUnlocks: [],
      notifications: [],
      updatedStats: await this.getUserAchievementStats(payload.userId),
      processingTime: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      // Buscar conquistas ativas que podem ser verificadas
      const achievements = (await this.getAllAchievements())
        .filter((a) => a.isActive);

      const userAchievements = await this.getUserAchievements(payload.userId);

      for (const achievement of achievements) {
        if (!this.shouldCheckAchievement(achievement, payload)) {
          continue;
        }

        const userAchievement = userAchievements.find(
          (ua) => ua.achievementId === achievement.id,
        );
        if (!userAchievement) {
          continue;
        }

        // Verificar pré-requisitos
        if (achievement.prerequisiteIds && achievement.prerequisiteIds.length > 0) {
          const hasPrerequisites = await this.checkPrerequisites(
            payload.userId,
            achievement.prerequisiteIds,
          );
          if (!hasPrerequisites) {
            continue;
          }
        }

        // Calcular progresso
        const progressResult = await this.calculateAchievementProgress(
          payload.userId,
          achievement,
        );

        if (progressResult.current !== userAchievement.progress.current) {
          const updatedUserAchievement =
            await this.updateUserAchievementProgress(
              payload.userId,
              achievement.id,
              {
                current: progressResult.current,
                percentage: progressResult.percentage,
              },
            );

          result.progressUpdates.push({
            achievementId: achievement.id,
            oldProgress: userAchievement.progress,
            newProgress: updatedUserAchievement.progress,
          });

          if (updatedUserAchievement.completedAt && !userAchievement.completedAt) {
            const ach = await this.getAchievementById(achievement.id);
            result.newCompletions.push({
              achievementId: achievement.id,
              achievement: ach!,
              rewards: ach?.rewards || [],
            });
          }
        }

        result.checksPerformed += 1;
      }

      // Verificar por novas conquistas desbloqueadas
      await this.checkForNewUnlocks(payload.userId, result);

      logger.info(
        `Verificação de conquistas para ${payload.userId}: ${result.newCompletions.length} novas completadas`,
      );
      return result;
    } catch (error) {
      logger.error('Erro na verificação de conquistas:', error);
      throw new AppError(`Falha na verificação de conquistas: ${error}`, 500);
    }
  }

  private async getAchievementsByIds(
    achievementIds: string[],
  ): Promise<Achievement[]> {
    if (achievementIds.length === 0) {
      return [];
    }

    const chunks = this.chunkArray(achievementIds, 10);
    const allAchievements: Achievement[] = [];

    for (const chunk of chunks) {
      const { data, error } = await this.client
        .from(this.achievementsTable)
        .select('*')
        .in('id', chunk);

      if (!error && data) {
        allAchievements.push(...data);
      }
    }

    return allAchievements;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async checkPrerequisites(
    userId: string,
    prerequisiteIds: string[],
  ): Promise<boolean> {
    const { count } = await this.client
      .from(this.userAchievementsTable)
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .in('achievementId', prerequisiteIds)
      .not('completedAt', 'is', null);

    return (count || 0) === prerequisiteIds.length;
  }

  private extractTargetFromConditions(
    conditions: AchievementCondition[],
  ): number {
    return conditions.reduce((total, condition) => {
      const value = typeof condition.value === 'number' ? condition.value : 1;
      return total + value;
    }, 0);
  }

  private shouldCheckAchievement(
    achievement: Achievement,
    _payload: AchievementCheckPayload,
  ): boolean {
    if (!achievement.isActive) {
      return false;
    }

    // Como o domínio não define eventType nas condições, apenas valida se há condições
    return true;
  }

  private async checkForNewUnlocks(
    userId: string,
    result: AchievementCheckResult,
  ): Promise<void> {
    // Buscar conquistas que podem ter sido desbloqueadas pelos novos completamentos
    const completedIds = result.newCompletions.map((c) => c.achievementId);

    if (completedIds.length === 0) {
      return;
    }

    const { data: dependentAchievements } = await this.client
      .from(this.achievementsTable)
      .select('*')
      .overlaps('prerequisiteIds', completedIds)
      .eq('isActive', true);

    if (!dependentAchievements) {
      return;
    }

    for (const achievement of dependentAchievements) {
      const userAchievement = await this.getUserAchievement(
        userId,
        achievement.id,
      );

      if (!userAchievement || userAchievement.completedAt) {
        continue;
      }

      // Verificar se todos os pré-requisitos foram atendidos
      const hasAllPrerequisites = await this.checkPrerequisites(
        userId,
        achievement.prerequisiteIds || [],
      );

      if (
        hasAllPrerequisites &&
        userAchievement.status === AchievementStatus.LOCKED
      ) {
        await this.updateUserAchievementProgress(userId, achievement.id, {
          status: AchievementStatus.AVAILABLE,
        });

        // Criar notificação de nova conquista disponível
        const notification = await this.createNotification({
          userId,
          achievementId: achievement.id,
          type: 'progress',
          title: 'Nova conquista disponível',
          message: `Conquista disponível: ${achievement.name}`,
          isRead: false,
          isImportant: false,
        });
        result.notifications.push(notification);
        result.newUnlocks.push({ achievementId: achievement.id, achievement });
      }
    }
  }

  // === VERIFICAÇÕES AUTOMÁTICAS ===

  async runDailyChecks(userId?: string): Promise<AchievementCheckResult[]> {
    const results: AchievementCheckResult[] = [];

    try {
      const usersToCheck = userId
        ? [userId]
        : await this.getUsersWithPendingDailyChecks();

      for (const uid of usersToCheck) {
        const payload: AchievementCheckPayload = {
          userId: uid,
          eventType: 'daily_check',
          eventData: { checkType: 'daily', date: new Date().toISOString().split('T')[0] },
          timestamp: new Date().toISOString(),
          triggerSource: 'scheduler',
        };

        const result = await this.checkAchievements(payload);
        results.push(result);
      }

      logger.info(
        `Verificações diárias executadas para ${results.length} usuários`,
      );
      return results;
    } catch (error) {
      logger.error('Erro nas verificações diárias:', error);
      throw new AppError(`Falha nas verificações diárias: ${error}`, 500);
    }
  }

  async runWeeklyChecks(userId?: string): Promise<AchievementCheckResult[]> {
    const results: AchievementCheckResult[] = [];

    try {
      const usersToCheck = userId
        ? [userId]
        : await this.getUsersWithPendingWeeklyChecks();

      for (const uid of usersToCheck) {
        const payload: AchievementCheckPayload = {
          userId: uid,
          eventType: 'weekly_check',
          eventData: { checkType: 'weekly', weekNumber: this.getWeekNumber(new Date()), year: new Date().getFullYear() },
          timestamp: new Date().toISOString(),
          triggerSource: 'scheduler',
        };

        const result = await this.checkAchievements(payload);
        results.push(result);
      }

      logger.info(
        `Verificações semanais executadas para ${results.length} usuários`,
      );
      return results;
    } catch (error) {
      logger.error('Erro nas verificações semanais:', error);
      throw new AppError(`Falha nas verificações semanais: ${error}`, 500);
    }
  }

  async runMonthlyChecks(userId?: string): Promise<AchievementCheckResult[]> {
    const results: AchievementCheckResult[] = [];

    try {
      const usersToCheck = userId
        ? [userId]
        : await this.getUsersWithPendingMonthlyChecks();

      for (const uid of usersToCheck) {
        const payload: AchievementCheckPayload = {
          userId: uid,
          eventType: 'monthly_check',
          eventData: { checkType: 'monthly', month: new Date().getMonth() + 1, year: new Date().getFullYear() },
          timestamp: new Date().toISOString(),
          triggerSource: 'scheduler',
        };

        const result = await this.checkAchievements(payload);
        results.push(result);
      }

      logger.info(
        `Verificações mensais executadas para ${results.length} usuários`,
      );
      return results;
    } catch (error) {
      logger.error('Erro nas verificações mensais:', error);
      throw new AppError(`Falha nas verificações mensais: ${error}`, 500);
    }
  }

  async forceCheckSpecificAchievements(
    userId: string,
    achievementIds: string[],
  ): Promise<AchievementCheckResult> {
    const payload: AchievementCheckPayload = {
      userId,
      eventType: 'force_check',
      eventData: { achievementIds },
      timestamp: new Date().toISOString(),
      triggerSource: 'manual',
    };

    return this.checkAchievements(payload);
  }

  // === ESTATÍSTICAS ===

  async getUserAchievementStats(userId: string): Promise<UserAchievementStats> {
    const { data, error } = await this.client
      .from(this.userStatsTable)
      .select('*')
      .eq('userId', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new AppError(`Falha ao buscar estatísticas: ${error.message}`, 500);
    }

    return data || (await this.recalculateUserStats(userId));
  }

  async recalculateUserStats(userId: string): Promise<UserAchievementStats> {
    const userAchievements = await this.getUserAchievements(userId);
    const completedAchievements = userAchievements.filter((ua) => !!ua.completedAt);

    const stats: UserAchievementStats = {
      userId,
      totalAchievements: userAchievements.length,
      completedAchievements: completedAchievements.length,
      inProgressAchievements: userAchievements.filter((ua) => ua.status === AchievementStatus.IN_PROGRESS).length,
      categoryStats: {} as any,
      rarityStats: {} as any,
      totalXpEarned: 0,
      totalPointsEarned: 0,
      globalRank: await this.calculateUserGlobalRank(userId),
      categoryRanks: {} as any,
      recentCompletions: completedAchievements.slice(0, 10).map((ua) => ({
        achievementId: ua.achievementId,
        completedAt: ua.completedAt!,
        rarity: AchievementRarity.COMMON,
      })),
      suggestedAchievements: [],
      lastCalculated: new Date().toISOString(),
      completionRate:
        userAchievements.length > 0
          ? Math.round((completedAchievements.length / userAchievements.length) * 100)
          : 0,
    };

    // Calcular estatísticas por categoria
    for (const category of Object.values(AchievementCategory)) {
      const categoryAchievements = userAchievements.filter(
        (ua) => ua.achievementSnapshot?.category === category,
      );
      const categoryCompleted = categoryAchievements.filter(
        (ua) => !!ua.completedAt,
      );

      stats.categoryStats[category] = {
        total: categoryAchievements.length,
        completed: categoryCompleted.length,
        percentage:
          categoryAchievements.length > 0
            ? Math.round((categoryCompleted.length / categoryAchievements.length) * 100)
            : 0,
      };

      stats.categoryRanks[category] = await this.calculateUserCategoryRank(userId, category);
    }

    // Calcular estatísticas por raridade
    for (const rarity of Object.values(AchievementRarity)) {
      const rarityAchievements = userAchievements.filter(
        (ua) => ua.achievementSnapshot?.rarity === rarity,
      );
      const rarityCompleted = rarityAchievements.filter((ua) => !!ua.completedAt);

      stats.rarityStats[rarity] = {
        total: rarityAchievements.length,
        completed: rarityCompleted.length,
      };
    }

    // Calcular XP total e recompensas
    stats.totalXpEarned = 0;

    // Salvar estatísticas
    const { data, error } = await this.client
      .from(this.userStatsTable)
      .upsert(stats)
      .select()
      .single();

    if (error) {
      throw new AppError(`Falha ao salvar estatísticas: ${error.message}`, 500);
    }

    return data;
  }

  // === VALIDAÇÃO ===

  async validateAchievementConditions(
    achievement: Achievement,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!achievement.conditions || achievement.conditions.length === 0) {
      errors.push('Conquista deve ter pelo menos uma condição');
    }

    if (achievement.conditions) {
      for (const condition of achievement.conditions) {
        if (!condition.field) {
          errors.push('Condição deve ter um campo');
        }
        if (typeof condition.value === 'number' && condition.value <= 0) {
          errors.push('Valor deve ser maior que zero');
        }
      }
    }

    if (achievement.prerequisiteIds) {
      const prerequisiteAchievements = await this.getAchievementsByIds(
        achievement.prerequisiteIds,
      );
      if (prerequisiteAchievements.length !== achievement.prerequisiteIds.length) {
        errors.push('Alguns pré-requisitos não existem');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async calculateAchievementProgress(
    userId: string,
    achievement: Achievement,
  ): Promise<{
    current: number;
    target: number;
    percentage: number;
  }> {
    let totalCurrent = 0;
    let totalTarget = 0;

    for (const condition of achievement.conditions) {
      const current = await this.evaluateCondition(userId, condition);
      totalCurrent += current;
      const target = typeof condition.value === 'number' ? condition.value : 1;
      totalTarget += target;
    }

    const percentage =
      totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 0;

    return {
      current: totalCurrent,
      target: totalTarget,
      percentage,
    };
  }

  private async evaluateCondition(
    userId: string,
    condition: AchievementCondition,
    userStats?: any,
  ): Promise<number> {
    try {
      switch (condition.field) {
        case 'questionsAnswered':
          return await this.getQuestionsAnsweredCount(userId);
        case 'correctAnswers':
          return await this.getCorrectAnswersCount(userId);
        case 'studyStreak':
          return await this.getStudyStreakCount(userId);
        case 'examsCompleted':
          return await this.getExamsCompletedCount(userId);
        case 'flashcardsReviewed':
          return await this.getFlashcardsReviewedCount(userId);
        case 'srsReviews':
          return await this.getSRSReviewsCount(userId);
        case 'srsMastered':
          return await this.getSRSMasteredCount(userId);
        case 'loginStreak':
          return await this.getLoginStreakCount(userId);
        default:
          if (userStats && userStats[condition.field] !== undefined) {
            return userStats[condition.field];
          }
          return 0;
      }
    } catch (error) {
      logger.error(`Erro ao avaliar condição ${condition.field}:`, error);
      return 0;
    }
  }

  private async getQuestionsAnsweredCount(userId: string): Promise<number> {
    if (this.userStatsService) {
      const stats = await this.userStatsService.getOrCreateUserStatistics(userId);
      return stats.totalQuestionsAnswered || 0;
    }
    return 0;
  }

  private async getCorrectAnswersCount(userId: string): Promise<number> {
    if (this.userStatsService) {
      const stats = await this.userStatsService.getOrCreateUserStatistics(userId);
      return stats.correctAnswers || 0;
    }
    return 0;
  }

  private async getStudyStreakCount(userId: string): Promise<number> {
    if (this.userStatsService) {
      const stats = await this.userStatsService.getOrCreateUserStatistics(userId);
      return stats.streakData?.currentStreak || 0;
    }
    return 0;
  }

  private async getExamsCompletedCount(userId: string): Promise<number> {
    if (this.userStatsService) {
      const stats = await this.userStatsService.getOrCreateUserStatistics(userId);
      // TODO: Adicionar examMetrics à interface UserStatistics
      return (stats as any).examMetrics?.totalExamsTaken || 0;
    }
    return 0;
  }

  private async getFlashcardsReviewedCount(_userId: string): Promise<number> {
    return 0;
  }

  private async getSRSReviewsCount(userId: string): Promise<number> {
    const { count } = await this.client
      .from('srs_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId);

    return count || 0;
  }

  private async getSRSMasteredCount(userId: string): Promise<number> {
    const { count } = await this.client
      .from('srs_cards')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .eq('status', 'mastered');

    return count || 0;
  }

  private async getLoginStreakCount(userId: string): Promise<number> {
    if (this.userStatsService) {
      const stats = await this.userStatsService.getOrCreateUserStatistics(userId);
      return stats.streakData?.currentStreak || 0;
    }
    return 0;
  }

  private async getUsersWithPendingDailyChecks(): Promise<string[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await this.client
      .from('user_daily_checks')
      .select('userId')
      .neq('lastCheck', today);

    return data?.map((row) => row.userId) || [];
  }

  private async getUsersWithPendingWeeklyChecks(): Promise<string[]> {
    const currentWeek = this.getWeekNumber(new Date());
    const currentYear = new Date().getFullYear();

    const { data } = await this.client
      .from('user_weekly_checks')
      .select('userId')
      .or(`lastCheckWeek.neq.${currentWeek},lastCheckYear.neq.${currentYear}`);

    return data?.map((row) => row.userId) || [];
  }

  private async getUsersWithPendingMonthlyChecks(): Promise<string[]> {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { data } = await this.client
      .from('user_monthly_checks')
      .select('userId')
      .or(
        `lastCheckMonth.neq.${currentMonth},lastCheckYear.neq.${currentYear}`,
      );

    return data?.map((row) => row.userId) || [];
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private async calculateUserGlobalRank(userId: string): Promise<number> {
    const userStats = await this.getUserAchievementStats(userId);

    const { count } = await this.client
      .from(this.userStatsTable)
      .select('*', { count: 'exact', head: true })
      .gt('totalXpEarned', userStats.totalXpEarned);

    return (count || 0) + 1;
  }

  private async calculateUserCategoryRank(
    userId: string,
    category: AchievementCategory,
  ): Promise<number> {
    const userStats = await this.getUserAchievementStats(userId);
    const categoryPct = userStats.categoryStats[category]?.percentage || 0;

    const { data } = await this.client
      .from(this.userStatsTable)
      .select('categoryStats')
      .gt(`categoryStats->${category}->percentage`, categoryPct);

    return (data?.length || 0) + 1;
  }

  // === SUGESTÕES INTELIGENTES ===

  private async generateIntelligentSuggestions(
    _userId: string,
    userAchievements: UserAchievement[],
  ): Promise<
    Array<{
      achievementId: string;
      probability: number;
      estimatedDays: number;
    }>
  > {
    // Implementação simplificada - pode ser expandida com IA
    const suggestions = userAchievements
      .filter((ua) => !ua.completedAt && ua.progress.percentage > 50)
      .map((ua) => ({
        achievementId: ua.achievementId,
        probability: ua.progress.percentage / 100,
        estimatedDays: Math.ceil((100 - ua.progress.percentage) / 10),
      }));

    return suggestions.slice(0, 5);
  }


  private isLeaderboardFresh(lastUpdated?: string): boolean {
    if (!lastUpdated) {
      return false;
    }

    const lastUpdate = new Date(lastUpdated);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    return hoursDiff < 1; // Considera fresco se atualizado na última hora
  }

  private async getUserDisplayData(
    userId: string,
  ): Promise<{ displayName: string; avatarUrl?: string }> {
    const { data } = await this.client
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single();

    return {
      displayName: data?.display_name || 'Usuário',
      avatarUrl: data?.avatar_url,
    };
  }

  private calculateRareAchievements(stats: UserAchievementStats): number {
    return Object.values(stats.rarityStats)
      .filter((rarity) => rarity.completed > 0)
      .reduce((sum, rarity) => sum + rarity.completed, 0);
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  private async getTotalUsersCount(): Promise<number> {
    const { count } = await this.client
      .from('users')
      .select('*', { count: 'exact', head: true });

    return count || 0;
  }

  // === LEADERBOARDS ===

  async getGlobalLeaderboard(limit = 100): Promise<AchievementLeaderboard> {
    const { data: existingLeaderboard } = await this.client
      .from(this.leaderboardsTable)
      .select('*')
      .eq('type', 'global')
      .single();

    if (
      existingLeaderboard &&
      this.isLeaderboardFresh(existingLeaderboard.lastUpdated)
    ) {
      return existingLeaderboard;
    }

    // Gerar novo leaderboard
    const { data: userStats } = await this.client
      .from(this.userStatsTable)
      .select('*')
      .order('totalXpEarned', { ascending: false })
      .limit(limit);

    const entries = [];
    for (let i = 0; i < (userStats?.length || 0); i++) {
      const stats = userStats![i];
      const userData = await this.getUserDisplayData(stats.userId);

      entries.push({
        rank: i + 1,
        userId: stats.userId,
        userDisplayName: userData.displayName,
        userAvatarUrl: userData.avatarUrl,
        score: stats.totalXpEarned,
        achievements: stats.completedAchievements,
        rareAchievements: this.calculateRareAchievements(stats),
      });
    }

    const leaderboard: AchievementLeaderboard = {
      id: crypto.randomUUID(),
      type: 'global',
      entries,
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    await this.client.from(this.leaderboardsTable).upsert(leaderboard);

    return leaderboard;
  }

  async getCategoryLeaderboard(
    category: AchievementCategory,
    limit = 50,
  ): Promise<AchievementLeaderboard> {
    const { data: existingLeaderboard } = await this.client
      .from(this.leaderboardsTable)
      .select('*')
      .eq('type', 'category')
      .eq('category', category)
      .single();

    if (
      existingLeaderboard &&
      this.isLeaderboardFresh(existingLeaderboard.lastUpdated)
    ) {
      return existingLeaderboard;
    }

    // Gerar novo leaderboard por categoria
    const { data: userStats } = await this.client
      .from(this.userStatsTable)
      .select('*')
      .order(`categoryStats->${category}->xpEarned`, { ascending: false })
      .limit(limit);

    const entries = [];
    for (let i = 0; i < (userStats?.length || 0); i++) {
      const stats = userStats![i];
      const categoryStats = stats.categoryStats[category];

      if (!categoryStats || categoryStats.xpEarned === 0) {
        continue;
      }

      const userData = await this.getUserDisplayData(stats.userId);

      entries.push({
        rank: i + 1,
        userId: stats.userId,
        userDisplayName: userData.displayName,
        userAvatarUrl: userData.avatarUrl,
        score: categoryStats.xpEarned,
        achievements: categoryStats.completed,
        rareAchievements: categoryStats.rareAchievements,
      });
    }

    const leaderboard: AchievementLeaderboard = {
      id: crypto.randomUUID(),
      type: 'category',
      category,
      entries,
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    await this.client.from(this.leaderboardsTable).upsert(leaderboard);

    return leaderboard;
  }

  async getWeeklyLeaderboard(limit = 50): Promise<AchievementLeaderboard> {
    const startOfWeek = this.getStartOfWeek(new Date());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const { data: existingLeaderboard } = await this.client
      .from(this.leaderboardsTable)
      .select('*')
      .eq('type', 'weekly')
      .gte('createdAt', startOfWeek.toISOString())
      .single();

    if (
      existingLeaderboard &&
      this.isLeaderboardFresh(existingLeaderboard.lastUpdated)
    ) {
      return existingLeaderboard;
    }

    // Buscar conquistas completadas nesta semana
    const { data: weeklyCompletions } = await this.client
      .from(this.userAchievementsTable)
      .select('userId, completedAt')
      .not('completedAt', 'is', null)
      .gte('completedAt', startOfWeek.toISOString())
      .lt('completedAt', endOfWeek.toISOString());

    // Agrupar por usuário e calcular XP semanal
    const userWeeklyXp: Record<string, number> = {};
    const userCompletions: Record<string, number> = {};

    weeklyCompletions?.forEach((completion) => {
      const userId = completion.userId;
      userWeeklyXp[userId] = (userWeeklyXp[userId] || 0) + 1;
      userCompletions[userId] = (userCompletions[userId] || 0) + 1;
    });

    // Ordenar usuários por XP semanal
    const sortedUsers = Object.entries(userWeeklyXp)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);

    const entries = [];
    for (let i = 0; i < sortedUsers.length; i++) {
      const [userId, weeklyXp] = sortedUsers[i];
      const userData = await this.getUserDisplayData(userId);

      entries.push({
        rank: i + 1,
        userId,
        userDisplayName: userData.displayName,
        userAvatarUrl: userData.avatarUrl,
        score: weeklyXp,
        achievements: userCompletions[userId] || 0,
        rareAchievements: 0,
      });
    }

    const leaderboard: AchievementLeaderboard = {
      id: crypto.randomUUID(),
      type: 'weekly',
      entries,
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    await this.client.from(this.leaderboardsTable).upsert(leaderboard);

    return leaderboard;
  }

  async getUserRanking(userId: string): Promise<{
    global: number;
    categoryRanks: Record<AchievementCategory, number>;
    percentile: number;
  }> {
    const globalRank = await this.calculateUserGlobalRank(userId);
    const totalUsers = await this.getTotalUsersCount();
    const percentile =
      totalUsers > 0 ? ((totalUsers - globalRank + 1) / totalUsers) * 100 : 0;

    const categoryRanks: Record<AchievementCategory, number> = {} as any;
    for (const category of Object.values(AchievementCategory)) {
      categoryRanks[category] = await this.calculateUserCategoryRank(
        userId,
        category,
      );
    }

    return {
      global: globalRank,
      categoryRanks,
      percentile,
    };
  }

  // === NOTIFICAÇÕES ===

  async getUserNotifications(
    userId: string,
    includeRead = false,
  ): Promise<AchievementNotification[]> {
    let query = this.client
      .from(this.notificationsTable)
      .select('*')
      .eq('userId', userId);

    if (!includeRead) {
      query = query.eq('isRead', false);
    }

    const { data, error } = await query.order('createdAt', {
      ascending: false,
    });

    if (error) {
      throw new AppError(`Falha ao buscar notificações: ${error.message}`, 500);
    }

    return data || [];
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const { error } = await this.client
      .from(this.notificationsTable)
      .update({
        isRead: true,
        readAt: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      logger.error(`Erro ao marcar notificação como lida: ${error.message}`);
      return false;
    }

    return true;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const { data, error } = await this.client
      .from(this.notificationsTable)
      .update({
        isRead: true,
        readAt: new Date().toISOString(),
      })
      .eq('userId', userId)
      .eq('isRead', false)
      .select();

    if (error) {
      logger.error(
        `Erro ao marcar todas as notificações como lidas: ${error.message}`,
      );
      return 0;
    }

    return data?.length || 0;
  }

  async createNotification(
    notification: Omit<AchievementNotification, 'id' | 'createdAt'>,
  ): Promise<AchievementNotification> {
    const newNotification: AchievementNotification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from(this.notificationsTable)
      .insert(newNotification)
      .select()
      .single();

    if (error) {
      throw new AppError(`Falha ao criar notificação: ${error.message}`, 500);
    }

    return data;
  }

  // === RECOMPENSAS ===

  async collectRewards(
    userId: string,
    achievementId: string,
  ): Promise<{
    success: boolean;
    rewards: any[];
    newUserState: any;
  }> {
    const userAchievement = await this.getUserAchievement(
      userId,
      achievementId,
    );

    if (
      !userAchievement ||
      !userAchievement.completedAt ||
      userAchievement.rewardsCollected
    ) {
      return {
        success: false,
        rewards: [],
        newUserState: null,
      };
    }

    const achievement = await this.getAchievementById(achievementId);
    if (!achievement || !achievement.rewards) {
      return {
        success: false,
        rewards: [],
        newUserState: null,
      };
    }

    // Marcar recompensas como coletadas
    await this.client
      .from(this.userAchievementsTable)
      .update({ rewardsCollected: true })
      .eq('id', userAchievement.id);

    // Aplicar recompensas (implementação específica do sistema)
    const rewards = achievement.rewards || [];

    return {
      success: true,
      rewards,
      newUserState: {}, // Implementar conforme necessário
    };
  }

  async getPendingRewards(userId: string): Promise<
    Array<{
      achievementId: string;
      achievement: Achievement;
      rewards: any[];
    }>
  > {
    const userAchievements = await this.getUserAchievements(userId);

    return userAchievements
      .filter((ua) => !ua.rewardsCollected && ua.achievementSnapshot?.rewards)
      .map((ua) => ({
        achievementId: ua.achievementId,
        achievement: ua.achievementSnapshot!,
        rewards: ua.achievementSnapshot!.rewards || [],
      }));
  }

  // === SUGESTÕES E ANÁLISES ===

  async generateAchievementSuggestions(userId: string): Promise<
    Array<{
      achievementId: string;
      achievement: Achievement;
      probability: number;
      estimatedDays: number;
      tips: string[];
    }>
  > {
    const userAchievements = await this.getUserAchievements(userId);

    const suggestions = await this.generateIntelligentSuggestions(
      userId,
      userAchievements,
    );
    const result = [];

    for (const suggestion of suggestions) {
      const userAchievement = userAchievements.find(
        (ua) => ua.achievementId === suggestion.achievementId,
      );
      if (!userAchievement?.achievementSnapshot) {
        continue;
      }

      const tips = await this.generateRequiredActions(
        userAchievement.achievementSnapshot,
        userAchievement,
      );

      result.push({
        achievementId: suggestion.achievementId,
        achievement: userAchievement.achievementSnapshot,
        probability: suggestion.probability,
        estimatedDays: suggestion.estimatedDays,
        tips,
      });
    }

    return result;
  }

  async analyzeUserAchievementPatterns(userId: string): Promise<{
    preferredCategories: AchievementCategory[];
    averageCompletionTime: number;
    strengths: string[];
    recommendations: string[];
  }> {
    const userAchievements = await this.getUserAchievements(userId);
    const completedAchievements = userAchievements.filter(
      (ua) => !!ua.completedAt,
    );

    // Analisar categorias preferidas
    const categoryCompletions: Record<string, number> = {};
    completedAchievements.forEach((ua) => {
      const category = ua.achievementSnapshot?.category;
      if (category) {
        categoryCompletions[category] =
          (categoryCompletions[category] || 0) + 1;
      }
    });

    const preferredCategories = Object.entries(categoryCompletions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category as AchievementCategory);

    return {
      preferredCategories,
      averageCompletionTime: 0, // Implementar cálculo
      strengths: [], // Implementar análise
      recommendations: [], // Implementar recomendações
    };
  }

  async generateProgressReport(
    _userId: string,
    _timeframe?: string,
  ): Promise<{
    summary: {
      completedThisPeriod: number;
      totalXpEarned: number;
      rankingChange: number;
    };
    highlights: Array<{
      type: 'achievement' | 'milestone' | 'improvement';
      title: string;
      description: string;
      date: Date;
    }>;
    nextGoals: Array<{
      achievementId: string;
      progress: number;
      estimatedCompletion: Date;
    }>;
  }> {
    // Implementação simplificada
    return {
      summary: {
        completedThisPeriod: 0,
        totalXpEarned: 0,
        rankingChange: 0,
      },
      highlights: [],
      nextGoals: [],
    };
  }

  // === CONFIGURAÇÃO ===

  async getConfig(): Promise<AchievementConfig> {
    const { data, error } = await this.client
      .from(this.configTable)
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new AppError(`Falha ao buscar configuração: ${error.message}`, 500);
    }

    return (
      data || {
        id: crypto.randomUUID(),
        version: this.currentVersion,
        features: {
          enableDailyChecks: true,
          enableWeeklyChecks: true,
          enableMonthlyChecks: true,
          enableLeaderboards: true,
          enableNotifications: true,
          enableRewards: true,
        },
        limits: {
          maxAchievementsPerUser: 1000,
          maxNotificationsPerUser: 100,
          leaderboardUpdateInterval: 3600,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }

  async updateConfig(
    updates: Partial<AchievementConfig>,
  ): Promise<AchievementConfig> {
    const config = await this.getConfig();
    const updatedConfig = {
      ...config,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from(this.configTable)
      .upsert(updatedConfig)
      .select()
      .single();

    if (error) {
      throw new AppError(
        `Falha ao atualizar configuração: ${error.message}`,
        500,
      );
    }

    return data;
  }

  // === EVENTOS ===

  async logEvent(
    event: Omit<AchievementEvent, 'id' | 'timestamp'>,
  ): Promise<AchievementEvent> {
    const newEvent: AchievementEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from(this.eventsTable)
      .insert(newEvent)
      .select()
      .single();

    if (error) {
      logger.error('Erro ao registrar evento:', error);
      throw new AppError(`Falha ao registrar evento: ${error.message}`, 500);
    }

    return data;
  }

  async getEvents(userId?: string, limit = 100): Promise<AchievementEvent[]> {
    let query = this.client
      .from(this.eventsTable)
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('userId', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError(`Falha ao buscar eventos: ${error.message}`, 500);
    }

    return data || [];
  }

  // === MÉTODOS AUXILIARES ===

  private async generateRequiredActions(
    achievement: Achievement,
    userAchievement: UserAchievement,
  ): Promise<string[]> {
    const tips: string[] = [];
    const remainingProgress =
      userAchievement.progress.target - userAchievement.progress.current;

    for (const condition of achievement.conditions) {
      switch (condition.field) {
        case 'questionsAnswered':
          tips.push(`Responda mais ${remainingProgress} questões`);
          break;
        case 'correctAnswers':
          tips.push(`Acerte mais ${remainingProgress} questões`);
          break;
        case 'studyStreak':
          tips.push(
          `Mantenha uma sequência de estudos por ${remainingProgress} dias`,
        );
          break;
        case 'examsCompleted':
          tips.push(`Complete mais ${remainingProgress} simulados`);
          break;
        case 'flashcardsReviewed':
          tips.push(`Revise mais ${remainingProgress} flashcards`);
          break;
        case 'srsReviews':
          tips.push(`Faça mais ${remainingProgress} revisões SRS`);
          break;
        case 'loginStreak':
          tips.push(`Faça login por ${remainingProgress} dias consecutivos`);
          break;
        default:
          tips.push(`Continue progredindo em ${condition.field}`);
      }
    }

    return tips;
  }

  // === LIMPEZA E MANUTENÇÃO ===

  async cleanupOldNotifications(daysOld = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await this.client
      .from(this.notificationsTable)
      .delete()
      .lt('createdAt', cutoffDate.toISOString())
      .eq('isRead', true)
      .select();

    if (error) {
      logger.error('Erro ao limpar notificações antigas:', error);
      return 0;
    }

    const deletedCount = data?.length || 0;
    logger.info(
      `Limpeza concluída: ${deletedCount} notificações antigas removidas`,
    );
    return deletedCount;
  }

  async cleanupOldEvents(daysOld = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await this.client
      .from(this.eventsTable)
      .delete()
      .lt('createdAt', cutoffDate.toISOString())
      .select();

    if (error) {
      logger.error('Erro ao limpar eventos antigos:', error);
      return 0;
    }

    const deletedCount = data?.length || 0;
    logger.info(`Limpeza concluída: ${deletedCount} eventos antigos removidos`);
    return deletedCount;
  }

  async recalculateAllUserStats(): Promise<void> {
    const { data: users } = await this.client.from('users').select('id');

    if (!users) {
      return;
    }

    for (const user of users) {
      try {
        await this.recalculateUserStats(user.id);
        logger.info(`Estatísticas recalculadas para usuário ${user.id}`);
      } catch (error) {
        logger.error(
          `Erro ao recalcular estatísticas para usuário ${user.id}:`,
          error,
        );
      }
    }

    logger.info(
      `Recálculo de estatísticas concluído para ${users.length} usuários`,
    );
  }

  // === IMPORTAÇÃO/EXPORTAÇÃO ===

  async exportUserAchievements(userId: string): Promise<{
    achievements: UserAchievement[];
    stats: UserAchievementStats;
    notifications: AchievementNotification[];
  }> {
    const [achievements, stats, notifications] = await Promise.all([
      this.getUserAchievements(userId),
      this.getUserAchievementStats(userId),
      this.getUserNotifications(userId, true),
    ]);

    return {
      achievements,
      stats,
      notifications,
    };
  }

  async importUserAchievements(
    userId: string,
    data: {
      achievements: UserAchievement[];
      stats: UserAchievementStats;
      notifications: AchievementNotification[];
    },
  ): Promise<boolean> {
    try {
      // Importar conquistas do usuário
      for (const achievement of data.achievements) {
        await this.client
          .from(this.userAchievementsTable)
          .upsert({ ...achievement, userId });
      }

      // Importar estatísticas
      await this.client
        .from(this.userStatsTable)
        .upsert({ ...data.stats, userId });

      // Importar notificações
      for (const notification of data.notifications) {
        await this.client
          .from(this.notificationsTable)
          .upsert({ ...notification, userId });
      }

      logger.info(`Dados de conquistas importados para usuário ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Erro ao importar dados para usuário ${userId}:`, error);
      return false;
    }
  }

  // === HEALTH CHECK ===

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: Record<string, number>;
  }> {
    const checks: Record<string, boolean> = {};
    const metrics: Record<string, number> = {};

    try {
      // Verificar conexão com banco
      const { error: dbError } = await this.client
        .from(this.achievementsTable)
        .select('id')
        .limit(1);
      checks.database = !dbError;

      // Verificar contadores
      const { count: achievementsCount } = await this.client
        .from(this.achievementsTable)
        .select('*', { count: 'exact', head: true });
      metrics.totalAchievements = achievementsCount || 0;

      const { count: usersCount } = await this.client
        .from(this.userAchievementsTable)
        .select('userId', { count: 'exact', head: true });
      metrics.activeUsers = usersCount || 0;

      const { count: notificationsCount } = await this.client
        .from(this.notificationsTable)
        .select('*', { count: 'exact', head: true })
        .eq('isRead', false);
      metrics.pendingNotifications = notificationsCount || 0;

      checks.metrics = true;
    } catch (error) {
      logger.error('Erro no health check:', error);
      checks.database = false;
      checks.metrics = false;
    }

    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, checks, metrics };
  }

  // === MÉTODOS FALTANTES DA MIGRAÇÃO ===

  async recalculateAllLeaderboards(): Promise<void> {
    try {
      logger.info('Iniciando recálculo de todos os leaderboards');

      // Recalcular leaderboard global
      await this.getGlobalLeaderboard(100);

      // Recalcular leaderboards por categoria
      const categories: AchievementCategory[] = [
        AchievementCategory.STUDY_TIME,
        AchievementCategory.EXAM_PERFORMANCE,
        AchievementCategory.STUDY_STREAK,
        AchievementCategory.SOCIAL,
        AchievementCategory.SPECIALTY,
      ];
      for (const category of categories) {
        await this.getCategoryLeaderboard(category, 50);
      }

      // Recalcular leaderboard semanal
      await this.getWeeklyLeaderboard(50);

      logger.info('Recálculo de leaderboards concluído');
    } catch (error) {
      logger.error('Erro ao recalcular leaderboards:', error);
      throw new AppError('Erro ao recalcular leaderboards', 500);
    }
  }

  async getUserEventHistory(
    userId: string,
    limit = 50,
  ): Promise<AchievementEvent[]> {
    try {
      const { data, error } = await this.client
        .from(this.eventsTable)
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error(
          `Erro ao buscar histórico de eventos do usuário ${userId}:`,
          error,
        );
        throw new AppError('Erro ao buscar histórico de eventos', 500);
      }

      return data || [];
    } catch (error) {
      logger.error(
        `Erro ao buscar histórico de eventos do usuário ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async getAchievementEventHistory(
    achievementId: string,
    limit = 50,
  ): Promise<AchievementEvent[]> {
    try {
      const { data, error } = await this.client
        .from(this.eventsTable)
        .select('*')
        .eq('achievementId', achievementId)
        .order('createdAt', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error(
          `Erro ao buscar histórico de eventos da conquista ${achievementId}:`,
          error,
        );
        throw new AppError(
          'Erro ao buscar histórico de eventos da conquista',
          500,
        );
      }

      return data || [];
    } catch (error) {
      logger.error(
        `Erro ao buscar histórico de eventos da conquista ${achievementId}:`,
        error,
      );
      throw error;
    }
  }

  async syncWithUserStatistics(userId: string): Promise<AchievementCheckResult> {
    try {
      if (!this.userStatsService) {
        logger.warn('UserStatisticsService não disponível para sincronização');
        return await this.checkAchievements({
          userId,
          eventType: 'user_stats_sync',
          eventData: {},
          timestamp: new Date().toISOString(),
          triggerSource: 'user_statistics',
        });
      }

      // Buscar estatísticas do usuário
      await this.userStatsService.getOrCreateUserStatistics(userId);

      // Atualizar progresso das conquistas baseado nas estatísticas
      const userAchievements = await this.getUserAchievements(userId);

      for (const userAchievement of userAchievements) {
        if (userAchievement.status === 'in_progress') {
          const achievement = await this.getAchievementById(
            userAchievement.achievementId,
          );
          if (achievement) {
            const progress = await this.calculateAchievementProgress(
              userId,
              achievement,
            );

            if (progress.current !== userAchievement.progress.current) {
              await this.updateUserAchievementProgress(userId, achievement.id, {
                current: progress.current,
                target: progress.target,
                percentage: progress.percentage,
              });
            }
          }
        }
      }

      const result = await this.checkAchievements({
        userId,
        eventType: 'user_stats_sync',
        eventData: {},
        timestamp: new Date().toISOString(),
        triggerSource: 'user_statistics',
      });
      logger.info(
        `Sincronização com estatísticas concluída para usuário ${userId}`,
      );
      return result;
    } catch (error) {
      logger.error(
        `Erro ao sincronizar com estatísticas do usuário ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async syncWithSRSSystem(userId: string): Promise<AchievementCheckResult> {
    try {
      const result = await this.checkAchievements({
        userId,
        eventType: 'srs_review',
        eventData: { userId },
        timestamp: new Date().toISOString(),
        triggerSource: 'srs',
      });

      logger.info(
        `Sincronização com sistema SRS concluída para usuário ${userId}`,
      );
      return result;
    } catch (error) {
      logger.error(
        `Erro ao sincronizar com sistema SRS do usuário ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async onQuestionAnswered(
    userId: string,
    questionData: {
      questionId: string;
      isCorrect: boolean;
      difficulty: string;
      timeSpent: number;
      filterId: string;
    },
  ): Promise<AchievementCheckResult> {
    try {
      const result = await this.checkAchievements({
        userId,
        eventType: 'question_answered',
        eventData: questionData,
        timestamp: new Date().toISOString(),
        triggerSource: 'questions',
      });

      await this.logEvent({
        userId,
        eventType: 'completed',
        triggerSource: 'questions',
        triggerData: questionData,
      });
      return result;
    } catch (error) {
      logger.error(
        `Erro ao processar resposta de questão para usuário ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async onExamCompleted(
    userId: string,
    examData: { score: number; totalQuestions: number; specialty: string; timeSpent: number },
  ): Promise<AchievementCheckResult> {
    try {
      const result = await this.checkAchievements({
        userId,
        eventType: 'exam_completed',
        eventData: examData,
        timestamp: new Date().toISOString(),
        triggerSource: 'simulated_exam',
      });

      await this.logEvent({
        userId,
        eventType: 'completed',
        triggerSource: 'simulated_exam',
        triggerData: examData,
      });
      return result;
    } catch (error) {
      logger.error(
        `Erro ao processar conclusão de exame para usuário ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async onStreakUpdated(
    userId: string,
    streakData: { currentStreak: number; longestStreak: number; streakType: string },
  ): Promise<AchievementCheckResult> {
    try {
      const result = await this.checkAchievements({
        userId,
        eventType: 'streak_updated',
        eventData: streakData,
        timestamp: new Date().toISOString(),
        triggerSource: 'streaks',
      });

      await this.logEvent({
        userId,
        eventType: 'progress_updated',
        triggerSource: 'streaks',
        triggerData: streakData,
      });
      return result;
    } catch (error) {
      logger.error(
        `Erro ao processar atualização de streak para usuário ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async onStudyMilestone(
    userId: string,
    milestoneData: { type: 'time' | 'questions' | 'accuracy' | 'level'; value: number; previous: number },
  ): Promise<AchievementCheckResult> {
    try {
      const result = await this.checkAchievements({
        userId,
        eventType: 'study_milestone',
        eventData: milestoneData,
        timestamp: new Date().toISOString(),
        triggerSource: 'study',
      });

      await this.logEvent({
        userId,
        eventType: 'completed',
        triggerSource: 'study',
        triggerData: milestoneData,
      });
      return result;
    } catch (error) {
      logger.error(
        `Erro ao processar marco de estudo para usuário ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async deleteUserAchievementData(userId: string): Promise<boolean> {
    try {
      // Deletar conquistas do usuário
      const { error: achievementsError } = await this.client
        .from(this.userAchievementsTable)
        .delete()
        .eq('userId', userId);

      if (achievementsError) {
        throw achievementsError;
      }

      // Deletar estatísticas do usuário
      const { error: statsError } = await this.client
        .from(this.userStatsTable)
        .delete()
        .eq('userId', userId);

      if (statsError) {
        throw statsError;
      }

      // Deletar notificações do usuário
      const { error: notificationsError } = await this.client
        .from(this.notificationsTable)
        .delete()
        .eq('userId', userId);

      if (notificationsError) {
        throw notificationsError;
      }

      // Deletar eventos do usuário
      const { error: eventsError } = await this.client
        .from(this.eventsTable)
        .delete()
        .eq('userId', userId);

      if (eventsError) {
        throw eventsError;
      }

      logger.info(`Dados de conquistas deletados para usuário ${userId}`);
      return true;
    } catch (error) {
      logger.error(
        `Erro ao deletar dados de conquistas do usuário ${userId}:`,
        error,
      );
      return false;
    }
  }

  async exportUserAchievementData(
    userId: string,
    format: 'json' | 'csv',
  ): Promise<string> {
    const userAchievements = await this.getUserAchievements(userId);
    if (format === 'json') {
      return JSON.stringify(userAchievements);
    }
    const header = 'id,achievementId,status,completedAt\n';
    const rows = userAchievements
      .map(
        (ua) =>
          `${ua.id},${ua.achievementId},${ua.status},${ua.completedAt || ''}`,
      )
      .join('\n');
    return header + rows;
  }

  async getAdminMetrics(): Promise<{
    totalAchievements: number;
    totalUsers: number;
    completionRates: Record<AchievementRarity, number>;
    popularAchievements: Array<{
      achievementId: string;
      completionCount: number;
      completionRate: number;
    }>;
    userEngagement: {
      activeUsers: number;
      avgCompletionsPerUser: number;
      retentionByAchievements: Record<string, number>;
    };
  }> {
    try {
      // Total de conquistas
      const { count: totalAchievements } = await this.client
        .from(this.achievementsTable)
        .select('*', { count: 'exact', head: true });

      // Total de usuários únicos
      const { count: totalUsers } = await this.client
        .from(this.userAchievementsTable)
        .select('userId', { count: 'exact', head: true });

      // Taxa de conclusão geral
      const { count: completedAchievements } = await this.client
        .from(this.userAchievementsTable)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: _totalUserAchievements } = await this.client
        .from(this.userAchievementsTable)
        .select('*', { count: 'exact', head: true });

      

      // Conquistas mais populares
      const { data: popularData } = await this.client
        .from(this.userAchievementsTable)
        .select('achievementId')
        .eq('status', 'completed');

      const achievementCounts =
        popularData?.reduce(
          (acc, item) => {
            acc[item.achievementId] = (acc[item.achievementId] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      const topAchievementIds = Object.entries(achievementCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id);

      const popularAchievements: Array<{
        achievementId: string;
        completionCount: number;
        completionRate: number;
      }> = [];
      for (const achievementId of topAchievementIds) {
        const completionCount = achievementCounts[achievementId] || 0;
        const completionRate = totalUsers
          ? Math.round((completionCount / totalUsers) * 100)
          : 0;
        popularAchievements.push({
          achievementId,
          completionCount,
          completionRate,
        });
      }

      const completionRates: Record<AchievementRarity, number> = {
        [AchievementRarity.COMMON]: 0,
        [AchievementRarity.UNCOMMON]: 0,
        [AchievementRarity.RARE]: 0,
        [AchievementRarity.EPIC]: 0,
        [AchievementRarity.LEGENDARY]: 0,
        [AchievementRarity.MYTHICAL]: 0,
      };

      const userEngagement = {
        activeUsers: totalUsers || 0,
        avgCompletionsPerUser:
          totalUsers && completedAchievements
            ? Math.round((completedAchievements / totalUsers) * 100) / 100
            : 0,
        retentionByAchievements: {},
      };

      return {
        totalAchievements: totalAchievements || 0,
        totalUsers: totalUsers || 0,
        completionRates,
        popularAchievements,
        userEngagement,
      };
    } catch (error) {
      logger.error('Erro ao buscar métricas administrativas:', error);
      throw new AppError('Erro ao buscar métricas administrativas', 500);
    }
  }
}
