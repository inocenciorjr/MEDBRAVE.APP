import { Firestore, Timestamp } from 'firebase-admin/firestore';
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
  AchievementTriggerType,
  AchievementCondition,
  AchievementProgress,
  RewardType
} from '../types';
import { IAchievementService } from '../interfaces/IAchievementService';
import { IUserStatisticsService } from '../../userStatistics/interfaces/IUserStatisticsService';
import { logger } from '../../../utils/logger';

/**
 * Serviço de conquistas de última geração com IA e gamificação avançada
 */
export class FirebaseAchievementService implements IAchievementService {
  private readonly achievementsCollection = 'achievements';
  private readonly userAchievementsCollection = 'userAchievements';
  private readonly userStatsCollection = 'userAchievementStats';
  private readonly leaderboardsCollection = 'achievementLeaderboards';
  private readonly notificationsCollection = 'achievementNotifications';
  private readonly eventsCollection = 'achievementEvents';
  private readonly configCollection = 'achievementConfig';
  private readonly currentVersion = '1.0';

  constructor(
    private readonly firestore: Firestore,
    private readonly userStatsService?: IUserStatisticsService
  ) {}

  // === GESTÃO DE CONQUISTAS ===

  async createAchievement(achievementData: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Achievement> {
    const docRef = this.firestore.collection(this.achievementsCollection).doc();
    const now = Timestamp.now();

    const achievement: Achievement = {
      ...achievementData,
      id: docRef.id,
      version: this.currentVersion,
      createdAt: now,
      updatedAt: now
    };

    // Validar condições
    const validation = await this.validateAchievementConditions(achievement);
    if (!validation.isValid) {
      throw new Error(`Conquista inválida: ${validation.errors.join(', ')}`);
    }

    await docRef.set(achievement);

    // Log do evento
    await this.logEvent({
      userId: 'system',
      achievementId: achievement.id,
      eventType: 'unlocked',
      triggerSource: 'admin_creation',
      triggerData: { achievement }
    });

    logger.info('AchievementService', 'createAchievement', 
      `Nova conquista criada: ${achievement.name} (${achievement.id})`);

    return achievement;
  }

  async getAchievementById(achievementId: string): Promise<Achievement | null> {
    const doc = await this.firestore.collection(this.achievementsCollection).doc(achievementId).get();
    
    if (!doc.exists) {
      return null;
    }

    return doc.data() as Achievement;
  }

  async updateAchievement(achievementId: string, updates: Partial<Achievement>): Promise<Achievement> {
    const docRef = this.firestore.collection(this.achievementsCollection).doc(achievementId);
    const now = Timestamp.now();

    const updatedData = {
      ...updates,
      updatedAt: now
    };

    await docRef.update(updatedData);

    const updatedDoc = await docRef.get();
    const achievement = updatedDoc.data() as Achievement;

    // Log do evento
    await this.logEvent({
      userId: 'system',
      achievementId,
      eventType: 'progress_updated',
      triggerSource: 'admin_update',
      triggerData: { updates }
    });

    return achievement;
  }

  async deleteAchievement(achievementId: string): Promise<boolean> {
    const batch = this.firestore.batch();

    // Deletar a conquista
    const achievementRef = this.firestore.collection(this.achievementsCollection).doc(achievementId);
    batch.delete(achievementRef);

    // Deletar todas as instâncias de usuário
    const userAchievements = await this.firestore
      .collection(this.userAchievementsCollection)
      .where('achievementId', '==', achievementId)
      .get();

    userAchievements.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.info('AchievementService', 'deleteAchievement', 
      `Conquista deletada: ${achievementId} (${userAchievements.size} instâncias de usuário)`);

    return true;
  }

  async getAllAchievements(filters?: AchievementFilters): Promise<Achievement[]> {
    let query = this.firestore
      .collection(this.achievementsCollection)
      .where('isActive', '==', true) as any;

    // Aplicar filtros
    if (filters?.categories?.length) {
      query = query.where('category', 'in', filters.categories);
    }

    if (filters?.rarities?.length) {
      query = query.where('rarity', 'in', filters.rarities);
    }

    if (filters?.tags?.length) {
      query = query.where('tags', 'array-contains-any', filters.tags);
    }

    // Ordenação
    if (filters?.sortBy) {
      const direction = filters.sortOrder === 'desc' ? 'desc' : 'asc';
      query = query.orderBy(filters.sortBy, direction);
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    // Paginação
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    const snapshot = await query.get();
    let achievements = snapshot.docs.map((doc: any) => doc.data() as Achievement);

    // Filtros adicionais (que não podem ser feitos no Firestore)
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      achievements = achievements.filter((a: Achievement) => 
        a.name.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower)
      );
    }

    return achievements;
  }

  async createAchievementsFromTemplate(template: AchievementTemplate): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    for (const variation of template.variations) {
      const condition = { 
        ...template.conditionTemplate, 
        value: variation.targetValue 
      };

      const achievement = await this.createAchievement({
        name: `${template.name} ${variation.suffix}`,
        description: template.description.replace('{value}', variation.targetValue.toString()),
        category: template.category,
        rarity: variation.rarity,
        conditions: [condition],
        triggerType: template.triggerType,
        rewards: variation.rewards,
        isHidden: false,
        isRepeatable: false,
        tags: [`template:${template.id}`, `tier:${variation.suffix.toLowerCase()}`],
        isActive: true,
        version: this.currentVersion,
        createdBy: 'system'
      });

      achievements.push(achievement);
    }

    logger.info('AchievementService', 'createAchievementsFromTemplate', 
      `Criadas ${achievements.length} conquistas do template ${template.name}`);

    return achievements;
  }

  // === CONQUISTAS DO USUÁRIO ===

  async getUserAchievements(userId: string, filters?: AchievementFilters): Promise<UserAchievement[]> {
    let query = this.firestore
      .collection(this.userAchievementsCollection)
      .where('userId', '==', userId) as any;

    if (filters?.status?.length) {
      query = query.where('status', 'in', filters.status);
    }

    const snapshot = await query.get();
    let userAchievements = snapshot.docs.map((doc: any) => doc.data() as UserAchievement);

    // Filtros adicionais
    if (filters?.categories?.length || filters?.rarities?.length) {
      // Obter snapshots de conquistas para filtrar
      const achievementIds = userAchievements.map((ua: UserAchievement) => ua.achievementId);
      const achievements = await this.getAchievementsByIds(achievementIds);
      const achievementMap = new Map(achievements.map((a: Achievement) => [a.id, a]));

      userAchievements = userAchievements.filter((ua: UserAchievement) => {
        const achievement = achievementMap.get(ua.achievementId);
        if (!achievement) return false;

        if (filters?.categories?.length && !filters.categories.includes(achievement.category)) {
          return false;
        }

        if (filters?.rarities?.length && !filters.rarities.includes(achievement.rarity)) {
          return false;
        }

        return true;
      });
    }

    // Filtros de progresso
    if (filters?.minProgress !== undefined) {
      userAchievements = userAchievements.filter((ua: UserAchievement) => 
        ua.progress.percentage >= filters.minProgress!
      );
    }

    if (filters?.maxProgress !== undefined) {
      userAchievements = userAchievements.filter((ua: UserAchievement) => 
        ua.progress.percentage <= filters.maxProgress!
      );
    }

    // Ordenação
    if (filters?.sortBy) {
      userAchievements.sort((a: UserAchievement, b: UserAchievement) => {
        let aValue: any, bValue: any;

        switch (filters.sortBy) {
          case 'progress':
            aValue = a.progress.percentage;
            bValue = b.progress.percentage;
            break;
          case 'completedAt':
            aValue = a.completedAt?.toMillis() || 0;
            bValue = b.completedAt?.toMillis() || 0;
            break;
          default:
            return 0;
        }

        if (filters.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });
    }

    return userAchievements;
  }

  async getUserAchievement(userId: string, achievementId: string): Promise<UserAchievement | null> {
    const snapshot = await this.firestore
      .collection(this.userAchievementsCollection)
      .where('userId', '==', userId)
      .where('achievementId', '==', achievementId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as UserAchievement;
  }

  async initializeUserAchievements(userId: string): Promise<UserAchievement[]> {
    // Obter todas as conquistas ativas
    const achievements = await this.getAllAchievements();
    const batch = this.firestore.batch();
    const userAchievements: UserAchievement[] = [];
    const now = Timestamp.now();

    for (const achievement of achievements) {
      // Verificar se já existe
      const existing = await this.getUserAchievement(userId, achievement.id);
      if (existing) continue;

      // Verificar pré-requisitos
      if (achievement.prerequisiteIds?.length) {
        const hasPrerequisites = await this.checkPrerequisites(userId, achievement.prerequisiteIds);
        if (!hasPrerequisites) continue;
      }

      const userAchievement: UserAchievement = {
        id: `${userId}_${achievement.id}`,
        userId,
        achievementId: achievement.id,
        status: AchievementStatus.AVAILABLE,
        progress: {
          current: 0,
          target: this.extractTargetFromConditions(achievement.conditions),
          percentage: 0,
          lastUpdated: now
        },
        completionCount: 0,
        rewardsCollected: false,
        firstSeenAt: now,
        lastUpdatedAt: now,
        achievementSnapshot: achievement
      };

      const docRef = this.firestore.collection(this.userAchievementsCollection).doc(userAchievement.id);
      batch.set(docRef, userAchievement);
      userAchievements.push(userAchievement);
    }

    await batch.commit();

    // Inicializar estatísticas do usuário
    await this.recalculateUserStats(userId);

    logger.info('AchievementService', 'initializeUserAchievements', 
      `Inicializadas ${userAchievements.length} conquistas para usuário ${userId}`);

    return userAchievements;
  }

  async updateUserAchievementProgress(
    userId: string, 
    achievementId: string, 
    _progressData: any
  ): Promise<UserAchievement> {
    const userAchievementId = `${userId}_${achievementId}`;
    const docRef = this.firestore.collection(this.userAchievementsCollection).doc(userAchievementId);
    
    return this.firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      
      if (!doc.exists) {
        throw new Error(`UserAchievement não encontrado: ${userAchievementId}`);
      }

      const userAchievement = doc.data() as UserAchievement;
      const achievement = userAchievement.achievementSnapshot || 
        await this.getAchievementById(achievementId);

      if (!achievement) {
        throw new Error(`Achievement não encontrado: ${achievementId}`);
      }

      // Calcular novo progresso
      const newProgress = await this.calculateAchievementProgress(userId, achievement);
      
      const updates: any = {
        progress: {
          ...newProgress,
          lastUpdated: Timestamp.now()
        },
        lastUpdatedAt: Timestamp.now()
      };

      // Verificar se foi completada
      if (newProgress.percentage >= 100 && userAchievement.status !== AchievementStatus.COMPLETED) {
        updates.status = AchievementStatus.COMPLETED;
        updates.completedAt = Timestamp.now();
        updates.completionCount = userAchievement.completionCount + 1;

        // Criar notificação
        await this.createNotification({
          userId,
          achievementId,
          type: 'completed',
          title: `🏆 Conquista Desbloqueada!`,
          message: `Parabéns! Você conquistou "${achievement.name}"`,
          isRead: false,
          isImportant: achievement.rarity === AchievementRarity.LEGENDARY || 
                       achievement.rarity === AchievementRarity.MYTHICAL,
          achievementSnapshot: achievement
        });

        // Log do evento
        await this.logEvent({
          userId,
          achievementId,
          eventType: 'completed',
          triggerSource: 'progress_update',
          triggerData: { progress: newProgress, achievement }
        });
      }

      transaction.update(docRef, updates);

      return { ...userAchievement, ...updates } as UserAchievement;
    });
  }

  // === VERIFICAÇÃO E TRIGGERS ===

  async checkAchievements(payload: AchievementCheckPayload): Promise<AchievementCheckResult> {
    const startTime = Date.now();
    const result: AchievementCheckResult = {
      userId: payload.userId,
      checksPerformed: 0,
      progressUpdates: [],
      newCompletions: [],
      newUnlocks: [],
      notifications: [],
      updatedStats: null as any,
      processingTime: 0,
      timestamp: payload.timestamp
    };

    try {
      // Obter conquistas do usuário para verificar
      let userAchievements: UserAchievement[];

      if (payload.forceCheckAchievements?.length) {
        // Verificar apenas conquistas específicas
        userAchievements = [];
        for (const achievementId of payload.forceCheckAchievements) {
          const ua = await this.getUserAchievement(payload.userId, achievementId);
          if (ua) userAchievements.push(ua);
        }
      } else {
        // Obter conquistas em progresso ou disponíveis
        userAchievements = await this.getUserAchievements(payload.userId, {
          status: [AchievementStatus.AVAILABLE, AchievementStatus.IN_PROGRESS]
        });
      }

      // Verificar cada conquista
      for (const userAchievement of userAchievements) {
        const achievement = userAchievement.achievementSnapshot || 
          await this.getAchievementById(userAchievement.achievementId);

        if (!achievement || !achievement.isActive) continue;

        // Verificar se o trigger é apropriado
        if (!this.shouldCheckAchievement(achievement, payload)) continue;

        const oldProgress = { ...userAchievement.progress };

        try {
          // Calcular novo progresso
          const newProgress = await this.calculateAchievementProgress(payload.userId, achievement);
          
          // Verificar se houve mudança
          if (newProgress.current !== oldProgress.current || 
              newProgress.percentage !== oldProgress.percentage) {
            
            const newProgressWithTimestamp: AchievementProgress = {
              ...newProgress,
              lastUpdated: Timestamp.now()
            };
            
            result.progressUpdates.push({
              achievementId: achievement.id,
              oldProgress,
              newProgress: newProgressWithTimestamp
            });

            // Atualizar no banco
            const updatedUserAchievement = await this.updateUserAchievementProgress(
              payload.userId, 
              achievement.id, 
              newProgress
            );

            // Verificar se foi completada
            if (updatedUserAchievement.status === AchievementStatus.COMPLETED && 
                userAchievement.status !== AchievementStatus.COMPLETED) {
              
              result.newCompletions.push({
                achievementId: achievement.id,
                achievement,
                rewards: achievement.rewards
              });
            }
          }

          result.checksPerformed++;

        } catch (error) {
          logger.error('AchievementService', 'checkAchievements', 
            `Erro ao verificar conquista ${achievement.id} para usuário ${payload.userId}`, error);
        }
      }

      // Verificar se novas conquistas foram desbloqueadas
      await this.checkForNewUnlocks(payload.userId, result);

      // Atualizar estatísticas do usuário
      result.updatedStats = await this.recalculateUserStats(payload.userId);

      result.processingTime = Date.now() - startTime;

      logger.info('AchievementService', 'checkAchievements', 
        `Verificação concluída para ${payload.userId}: ${result.checksPerformed} checks, ` +
        `${result.newCompletions.length} completions, ${result.progressUpdates.length} updates`);

      return result;

    } catch (error) {
      logger.error('AchievementService', 'checkAchievements', 
        `Erro na verificação de conquistas para usuário ${payload.userId}`, error);
      
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  // Continuação dos métodos...
  // [Os métodos restantes serão implementados na parte 2]

  // === MÉTODOS AUXILIARES PRIVADOS ===

  private async getAchievementsByIds(achievementIds: string[]): Promise<Achievement[]> {
    if (achievementIds.length === 0) return [];

    const achievements: Achievement[] = [];
    
    // Firestore tem limite de 10 itens em 'in' queries
    const chunks = this.chunkArray(achievementIds, 10);
    
    for (const chunk of chunks) {
      const snapshot = await this.firestore
        .collection(this.achievementsCollection)
        .where('id', 'in', chunk)
        .get();
      
      achievements.push(...snapshot.docs.map(doc => doc.data() as Achievement));
    }

    return achievements;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async checkPrerequisites(userId: string, prerequisiteIds: string[]): Promise<boolean> {
    for (const prereqId of prerequisiteIds) {
      const userAchievement = await this.getUserAchievement(userId, prereqId);
      if (!userAchievement || userAchievement.status !== AchievementStatus.COMPLETED) {
        return false;
      }
    }
    return true;
  }

  private extractTargetFromConditions(conditions: AchievementCondition[]): number {
    // Pegar o valor da primeira condição como target
    // TODO: Implementar lógica mais sofisticada para múltiplas condições
    return Number(conditions[0]?.value) || 100;
  }

  private shouldCheckAchievement(achievement: Achievement, payload: AchievementCheckPayload): boolean {
    switch (achievement.triggerType) {
      case AchievementTriggerType.IMMEDIATE:
        return true;
      case AchievementTriggerType.SESSION_END:
        return payload.eventType === 'session_end';
      case AchievementTriggerType.EXAM_COMPLETION:
        return payload.eventType === 'exam_completed';
      case AchievementTriggerType.DAILY_CHECK:
        return payload.eventType === 'daily_check';
      case AchievementTriggerType.WEEKLY_CHECK:
        return payload.eventType === 'weekly_check';
      case AchievementTriggerType.MONTHLY_CHECK:
        return payload.eventType === 'monthly_check';
      default:
        return false;
    }
  }

  private async checkForNewUnlocks(userId: string, result: AchievementCheckResult): Promise<void> {
    // Verificar se alguma conquista foi desbloqueada devido aos pré-requisitos completados
    const allAchievements = await this.getAllAchievements();
    
    for (const achievement of allAchievements) {
      if (!achievement.prerequisiteIds?.length) continue;

      // Verificar se o usuário já tem esta conquista
      const existing = await this.getUserAchievement(userId, achievement.id);
      if (existing) continue;

      // Verificar pré-requisitos
      const hasPrerequisites = await this.checkPrerequisites(userId, achievement.prerequisiteIds);
      if (hasPrerequisites) {
        // Criar nova UserAchievement
        const userAchievement: UserAchievement = {
          id: `${userId}_${achievement.id}`,
          userId,
          achievementId: achievement.id,
          status: AchievementStatus.AVAILABLE,
          progress: {
            current: 0,
            target: this.extractTargetFromConditions(achievement.conditions),
            percentage: 0,
            lastUpdated: Timestamp.now()
          },
          completionCount: 0,
          rewardsCollected: false,
          firstSeenAt: Timestamp.now(),
          lastUpdatedAt: Timestamp.now(),
          achievementSnapshot: achievement
        };

        await this.firestore
          .collection(this.userAchievementsCollection)
          .doc(userAchievement.id)
          .set(userAchievement);

        result.newUnlocks.push({
          achievementId: achievement.id,
          achievement
        });
      }
    }
  }

  // === VERIFICAÇÕES PROGRAMADAS AVANÇADAS ===

  async runDailyChecks(userId?: string): Promise<AchievementCheckResult[]> {
    const results: AchievementCheckResult[] = [];
    
    // Se userId fornecido, verificar apenas esse usuário
    if (userId) {
      const result = await this.checkAchievements({
        userId,
        eventType: 'daily_check',
        eventData: { date: new Date().toISOString() },
        timestamp: Timestamp.now(),
        triggerSource: 'scheduled_daily_check'
      });
      results.push(result);
    } else {
      // Verificar todos os usuários com conquistas pendentes
      const usersToCheck = await this.getUsersWithPendingDailyChecks();
      
      for (const userToCheck of usersToCheck) {
        try {
          const result = await this.checkAchievements({
            userId: userToCheck,
            eventType: 'daily_check',
            eventData: { date: new Date().toISOString() },
            timestamp: Timestamp.now(),
            triggerSource: 'scheduled_daily_check'
          });
          results.push(result);
        } catch (error) {
          logger.error('AchievementService', 'runDailyChecks', 
            `Erro na verificação diária para usuário ${userToCheck}`, error);
        }
      }
    }

    logger.info('AchievementService', 'runDailyChecks', 
      `Verificação diária concluída para ${results.length} usuários`);

    return results;
  }

  async runWeeklyChecks(userId?: string): Promise<AchievementCheckResult[]> {
    const results: AchievementCheckResult[] = [];
    const weekNumber = this.getWeekNumber(new Date());
    
    if (userId) {
      const result = await this.checkAchievements({
        userId,
        eventType: 'weekly_check',
        eventData: { week: weekNumber, year: new Date().getFullYear() },
        timestamp: Timestamp.now(),
        triggerSource: 'scheduled_weekly_check'
      });
      results.push(result);
    } else {
      const usersToCheck = await this.getUsersWithPendingWeeklyChecks();
      
      for (const userToCheck of usersToCheck) {
        try {
          const result = await this.checkAchievements({
            userId: userToCheck,
            eventType: 'weekly_check',
            eventData: { week: weekNumber, year: new Date().getFullYear() },
            timestamp: Timestamp.now(),
            triggerSource: 'scheduled_weekly_check'
          });
          results.push(result);
        } catch (error) {
          logger.error('AchievementService', 'runWeeklyChecks', 
            `Erro na verificação semanal para usuário ${userToCheck}`, error);
        }
      }
    }

    return results;
  }

  async runMonthlyChecks(userId?: string): Promise<AchievementCheckResult[]> {
    const results: AchievementCheckResult[] = [];
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    
    if (userId) {
      const result = await this.checkAchievements({
        userId,
        eventType: 'monthly_check',
        eventData: { month, year },
        timestamp: Timestamp.now(),
        triggerSource: 'scheduled_monthly_check'
      });
      results.push(result);
    } else {
      const usersToCheck = await this.getUsersWithPendingMonthlyChecks();
      
      for (const userToCheck of usersToCheck) {
        try {
          const result = await this.checkAchievements({
            userId: userToCheck,
            eventType: 'monthly_check',
            eventData: { month, year },
            timestamp: Timestamp.now(),
            triggerSource: 'scheduled_monthly_check'
          });
          results.push(result);
        } catch (error) {
          logger.error('AchievementService', 'runMonthlyChecks', 
            `Erro na verificação mensal para usuário ${userToCheck}`, error);
        }
      }
    }

    return results;
  }

  async forceCheckSpecificAchievements(userId: string, achievementIds: string[]): Promise<AchievementCheckResult> {
    return this.checkAchievements({
      userId,
      eventType: 'manual_check',
      eventData: {},
      timestamp: Timestamp.now(),
      triggerSource: 'manual',
      forceCheckAchievements: achievementIds
    });
  }

  // === ESTATÍSTICAS E ANALYTICS AVANÇADAS ===

  async getUserAchievementStats(userId: string): Promise<UserAchievementStats> {
    const docRef = this.firestore.collection(this.userStatsCollection).doc(userId);
    const doc = await docRef.get();

    if (doc.exists) {
      return doc.data() as UserAchievementStats;
    }

    // Se não existe, calcular pela primeira vez
    return this.recalculateUserStats(userId);
  }

  async recalculateUserStats(userId: string): Promise<UserAchievementStats> {
    const userAchievements = await this.getUserAchievements(userId);
    const allAchievements = await this.getAllAchievements();
    
    // Contadores gerais
    const totalAchievements = allAchievements.length;
    const completedAchievements = userAchievements.filter(ua => 
      ua.status === AchievementStatus.COMPLETED
    ).length;
    const inProgressAchievements = userAchievements.filter(ua => 
      ua.status === AchievementStatus.IN_PROGRESS
    ).length;

    // Estatísticas por categoria
    const categoryStats: Record<AchievementCategory, {total: number; completed: number; percentage: number}> = {} as any;
    for (const category of Object.values(AchievementCategory)) {
      const categoryAchievements = allAchievements.filter(a => a.category === category);
      const categoryCompleted = userAchievements.filter(ua => 
        ua.status === AchievementStatus.COMPLETED && 
        ua.achievementSnapshot?.category === category
      ).length;
      
      categoryStats[category] = {
        total: categoryAchievements.length,
        completed: categoryCompleted,
        percentage: categoryAchievements.length > 0 ? 
          (categoryCompleted / categoryAchievements.length) * 100 : 0
      };
    }

    // Estatísticas por raridade
    const rarityStats: Record<AchievementRarity, {total: number; completed: number}> = {} as any;
    for (const rarity of Object.values(AchievementRarity)) {
      const rarityAchievements = allAchievements.filter(a => a.rarity === rarity);
      const rarityCompleted = userAchievements.filter(ua => 
        ua.status === AchievementStatus.COMPLETED && 
        ua.achievementSnapshot?.rarity === rarity
      ).length;
      
      rarityStats[rarity] = {
        total: rarityAchievements.length,
        completed: rarityCompleted
      };
    }

    // Calcular XP e pontos totais
    let totalXpEarned = 0;
    let totalPointsEarned = 0;
    
    const completedUserAchievements = userAchievements.filter(ua => 
      ua.status === AchievementStatus.COMPLETED
    );
    
    for (const ua of completedUserAchievements) {
      if (ua.achievementSnapshot?.rewards) {
        for (const reward of ua.achievementSnapshot.rewards) {
          if (reward.type === RewardType.XP) {
            totalXpEarned += Number(reward.value) * ua.completionCount;
          } else if (reward.type === RewardType.POINTS) {
            totalPointsEarned += Number(reward.value) * ua.completionCount;
          }
        }
      }
    }

    // Calcular ranking global (simplificado)
    const globalRank = await this.calculateUserGlobalRank(userId);

    // Rankings por categoria
    const categoryRanks: Record<AchievementCategory, number> = {} as any;
    for (const category of Object.values(AchievementCategory)) {
      categoryRanks[category] = await this.calculateUserCategoryRank(userId, category);
    }

    // Conquistas recentes
    const recentCompletions = completedUserAchievements
      .filter(ua => ua.completedAt)
      .sort((a, b) => b.completedAt!.toMillis() - a.completedAt!.toMillis())
      .slice(0, 5)
      .map(ua => ({
        achievementId: ua.achievementId,
        completedAt: ua.completedAt!,
        rarity: ua.achievementSnapshot?.rarity || AchievementRarity.COMMON
      }));

    // Gerar sugestões usando IA
    const suggestedAchievements = await this.generateIntelligentSuggestions(userId, userAchievements);

    const stats: UserAchievementStats = {
      userId,
      totalAchievements,
      completedAchievements,
      inProgressAchievements,
      categoryStats,
      rarityStats,
      totalXpEarned,
      totalPointsEarned,
      globalRank,
      categoryRanks,
      recentCompletions,
      suggestedAchievements,
      lastCalculated: Timestamp.now(),
      completionRate: totalAchievements > 0 ? (completedAchievements / totalAchievements) * 100 : 0
    };

    // Salvar no banco
    await this.firestore.collection(this.userStatsCollection).doc(userId).set(stats);

    logger.info('AchievementService', 'recalculateUserStats', 
      `Estatísticas recalculadas para usuário ${userId}: ${completedAchievements}/${totalAchievements} conquistas`);

    return stats;
  }

  async validateAchievementConditions(achievement: Achievement): Promise<{isValid: boolean; errors: string[]}> {
    const errors: string[] = [];

    // Validações básicas
    if (!achievement.name || achievement.name.trim().length === 0) {
      errors.push('Nome é obrigatório');
    }

    if (!achievement.description || achievement.description.trim().length === 0) {
      errors.push('Descrição é obrigatória');
    }

    if (!achievement.conditions || achievement.conditions.length === 0) {
      errors.push('Pelo menos uma condição é obrigatória');
    }

    if (!achievement.rewards || achievement.rewards.length === 0) {
      errors.push('Pelo menos uma recompensa é obrigatória');
    }

    // Validar condições
    for (const condition of achievement.conditions) {
      if (!condition.field || condition.field.trim().length === 0) {
        errors.push('Campo da condição é obrigatório');
      }

      if (condition.value === undefined || condition.value === null) {
        errors.push('Valor da condição é obrigatório');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async calculateAchievementProgress(userId: string, achievement: Achievement): Promise<{
    current: number;
    target: number;
    percentage: number;
  }> {
    const target = this.extractTargetFromConditions(achievement.conditions);
    let current = 0;

    // Obter dados do usuário para cálculos
    const userStats = this.userStatsService ? 
      await this.userStatsService.getOrCreateUserStatistics(userId) : null;

    // Calcular progresso baseado nas condições
    for (const condition of achievement.conditions) {
      const conditionValue = await this.evaluateCondition(userId, condition, userStats);
      
      switch (condition.type) {
        case 'count':
          current = Math.max(current, conditionValue);
          break;
        case 'percentage':
          current = Math.max(current, conditionValue);
          break;
        case 'threshold':
          current = conditionValue >= Number(condition.value) ? Number(condition.value) : conditionValue;
          break;
        case 'streak':
          current = Math.max(current, conditionValue);
          break;
        case 'time_based':
          current = Math.max(current, conditionValue);
          break;
        case 'comparison':
          current = conditionValue >= Number(condition.value) ? Number(condition.value) : 0;
          break;
      }
    }

    const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;

    return {
      current: Math.floor(current),
      target,
      percentage: Math.floor(percentage)
    };
  }

  // === MÉTODOS AUXILIARES ROBUSTOS ===

  private async evaluateCondition(userId: string, condition: AchievementCondition, userStats?: any): Promise<number> {
    try {
      switch (condition.field) {
        case 'totalQuestionsAnswered':
          return userStats?.totalQuestionsAnswered || 0;
        
        case 'correctAnswers':
          return userStats?.correctAnswers || 0;
        
        case 'overallAccuracy':
          return (userStats?.overallAccuracy || 0) * 100;
        
        case 'currentStreak':
          return userStats?.streakData?.currentStreak || 0;
        
        case 'longestStreak':
          return userStats?.streakData?.longestStreak || 0;
        
        case 'totalStudyTime':
          return userStats?.studyTimeAnalysis?.totalMinutesStudied || 0;
        
        case 'totalXP':
          return userStats?.learningMetrics?.totalXP || 0;
        
        case 'currentLevel':
          return userStats?.learningMetrics?.currentLevel || 1;
        
        case 'totalExamsTaken':
          return userStats?.examMetrics?.totalExamsTaken || 0;
        
        case 'averageExamScore':
          return userStats?.examMetrics?.averageScore || 0;
        
        case 'bestExamScore':
          return userStats?.examMetrics?.bestScore || 0;
        
        case 'sessionsCount':
          return userStats?.studyTimeAnalysis?.sessionsCount || 0;
        
        case 'consistencyScore':
          return userStats?.studyTimeAnalysis?.consistencyScore || 0;
        
        case 'totalDaysStudied':
          return userStats?.streakData?.totalDaysStudied || 0;
        
        case 'filterMastery':
          if (condition.additionalData?.filterId) {
            const filterStats = userStats?.filterStatistics?.[condition.additionalData.filterId];
            return filterStats?.masteryLevel || 0;
          }
          return 0;
        
        case 'srsReviewsCompleted':
          return await this.getSRSReviewsCount(userId);
        
        case 'srsMasteredCards':
          return await this.getSRSMasteredCount(userId);
        
        default:
          logger.warn('AchievementService', 'evaluateCondition', 
            `Campo de condição desconhecido: ${condition.field}`);
          return 0;
      }
    } catch (error) {
      logger.error('AchievementService', 'evaluateCondition', 
        `Erro ao avaliar condição ${condition.field}`, error);
      return 0;
    }
  }

  private async getSRSReviewsCount(userId: string): Promise<number> {
    try {
      // Contar reviews completados no Firestore
      const reviewsSnapshot = await this.firestore
        .collection('programmedReviews')
        .where('userId', '==', userId)
        .where('lastReviewedAt', '!=', null)
        .get();
      
      return reviewsSnapshot.size;
    } catch (error) {
      logger.error('AchievementService', 'getSRSReviewsCount', 'Erro ao contar reviews SRS', error);
      return 0;
    }
  }

  private async getSRSMasteredCount(userId: string): Promise<number> {
    try {
      // Contar cards masterizados
      const masteredSnapshot = await this.firestore
        .collection('programmedReviews')
        .where('userId', '==', userId)
        .where('status', '==', 'mastered')
        .get();
      
      return masteredSnapshot.size;
    } catch (error) {
      logger.error('AchievementService', 'getSRSMasteredCount', 'Erro ao contar cards masterizados', error);
      return 0;
    }
  }

  private async getUsersWithPendingDailyChecks(): Promise<string[]> {
    try {
      // Buscar usuários com conquistas que precisam de verificação diária
      const achievements = await this.getAllAchievements();
      
      const dailyAchievements = achievements.filter(a => 
        a.triggerType === AchievementTriggerType.DAILY_CHECK
      );
      
      if (dailyAchievements.length === 0) return [];
      
      const userAchievementsSnapshot = await this.firestore
        .collection(this.userAchievementsCollection)
        .where('status', 'in', [AchievementStatus.AVAILABLE, AchievementStatus.IN_PROGRESS])
        .get();
      
      const uniqueUsers = new Set<string>();
      userAchievementsSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        if (dailyAchievements.some(a => a.id === data.achievementId)) {
          uniqueUsers.add(data.userId);
        }
      });
      
      return Array.from(uniqueUsers);
    } catch (error) {
      logger.error('AchievementService', 'getUsersWithPendingDailyChecks', 'Erro ao buscar usuários', error);
      return [];
    }
  }

  private async getUsersWithPendingWeeklyChecks(): Promise<string[]> {
    try {
      const achievements = await this.getAllAchievements();
      const weeklyAchievements = achievements.filter(a => 
        a.triggerType === AchievementTriggerType.WEEKLY_CHECK
      );
      
      if (weeklyAchievements.length === 0) return [];
      
      const userAchievementsSnapshot = await this.firestore
        .collection(this.userAchievementsCollection)
        .where('status', 'in', [AchievementStatus.AVAILABLE, AchievementStatus.IN_PROGRESS])
        .get();
      
      const uniqueUsers = new Set<string>();
      userAchievementsSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        if (weeklyAchievements.some(a => a.id === data.achievementId)) {
          uniqueUsers.add(data.userId);
        }
      });
      
      return Array.from(uniqueUsers);
    } catch (error) {
      logger.error('AchievementService', 'getUsersWithPendingWeeklyChecks', 'Erro ao buscar usuários', error);
      return [];
    }
  }

  private async getUsersWithPendingMonthlyChecks(): Promise<string[]> {
    try {
      const achievements = await this.getAllAchievements();
      const monthlyAchievements = achievements.filter(a => 
        a.triggerType === AchievementTriggerType.MONTHLY_CHECK
      );
      
      if (monthlyAchievements.length === 0) return [];
      
      const userAchievementsSnapshot = await this.firestore
        .collection(this.userAchievementsCollection)
        .where('status', 'in', [AchievementStatus.AVAILABLE, AchievementStatus.IN_PROGRESS])
        .get();
      
      const uniqueUsers = new Set<string>();
      userAchievementsSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        if (monthlyAchievements.some(a => a.id === data.achievementId)) {
          uniqueUsers.add(data.userId);
        }
      });
      
      return Array.from(uniqueUsers);
    } catch (error) {
      logger.error('AchievementService', 'getUsersWithPendingMonthlyChecks', 'Erro ao buscar usuários', error);
      return [];
    }
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private async calculateUserGlobalRank(userId: string): Promise<number> {
    try {
      // Contar usuários com mais conquistas completadas
      const userStats = await this.getUserAchievementStats(userId);
      
      const allUsersSnapshot = await this.firestore
        .collection(this.userStatsCollection)
        .where('completedAchievements', '>', userStats.completedAchievements)
        .get();
      
      return allUsersSnapshot.size + 1;
    } catch (error) {
      logger.error('AchievementService', 'calculateUserGlobalRank', 'Erro ao calcular ranking', error);
      return 1;
    }
  }

  private async calculateUserCategoryRank(userId: string, category: AchievementCategory): Promise<number> {
    try {
      const userStats = await this.getUserAchievementStats(userId);
      const userCategoryCompleted = userStats.categoryStats[category]?.completed || 0;
      
      const allUsersSnapshot = await this.firestore
        .collection(this.userStatsCollection)
        .get();
      
      let betterUsers = 0;
      allUsersSnapshot.docs.forEach((doc: any) => {
        const stats = doc.data();
        const otherUserCategoryCompleted = stats.categoryStats?.[category]?.completed || 0;
        if (otherUserCategoryCompleted > userCategoryCompleted) {
          betterUsers++;
        }
      });
      
      return betterUsers + 1;
    } catch (error) {
      logger.error('AchievementService', 'calculateUserCategoryRank', 'Erro ao calcular ranking da categoria', error);
      return 1;
    }
  }

  private async generateIntelligentSuggestions(_userId: string, userAchievements: UserAchievement[]): Promise<Array<{
    achievementId: string;
    probability: number;
    estimatedDays: number;
  }>> {
    // Placeholder implementation
    return userAchievements.map(ua => ({
      achievementId: ua.achievementId,
      probability: 0.5,
      estimatedDays: 7
    }));
  }

  private calculateCategoryRareAchievements(_stats: UserAchievementStats, _category: AchievementCategory): number {
    // Placeholder implementation
    return 0;
  }

  private isLeaderboardFresh(lastUpdated?: Timestamp): boolean {
    if (!lastUpdated) return false;
    const now = Date.now();
    const lastUpdateTime = lastUpdated.toMillis();
    const timeDiff = now - lastUpdateTime;
    return timeDiff < (30 * 60 * 1000); // 30 minutos
  }

  private async getUserDisplayData(userId: string): Promise<{displayName: string; avatarUrl?: string}> {
    try {
      const userDoc = await this.firestore.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return {
          displayName: userData?.displayName || userData?.name || `Usuário ${userId.slice(0, 8)}`,
          avatarUrl: userData?.photoURL || userData?.avatarUrl
        };
      }
    } catch (error) {
      logger.warn('AchievementService', 'getUserDisplayData', `Erro ao buscar dados do usuário ${userId}`, error);
    }
    
    return {
      displayName: `Usuário ${userId.slice(0, 8)}`
    };
  }

  private calculateRareAchievements(stats: UserAchievementStats): number {
    return (stats.rarityStats[AchievementRarity.RARE]?.completed || 0) +
           (stats.rarityStats[AchievementRarity.EPIC]?.completed || 0) +
           (stats.rarityStats[AchievementRarity.LEGENDARY]?.completed || 0) +
           (stats.rarityStats[AchievementRarity.MYTHICAL]?.completed || 0);
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  private async getTotalUsersCount(): Promise<number> {
    try {
      const snapshot = await this.firestore.collection(this.userStatsCollection).get();
      return snapshot.size;
    } catch (error) {
      logger.error('AchievementService', 'getTotalUsersCount', 'Erro ao contar usuários', error);
      return 1;
    }
  }

  // === LEADERBOARDS AVANÇADOS ===

  async getGlobalLeaderboard(limit = 100): Promise<AchievementLeaderboard> {
    try {
      const leaderboardRef = this.firestore.collection(this.leaderboardsCollection).doc('global');
      const doc = await leaderboardRef.get();
      
      if (doc.exists && this.isLeaderboardFresh(doc.data()?.lastUpdated)) {
        return doc.data() as AchievementLeaderboard;
      }
      
      // Recalcular leaderboard
      const allUsersStats = await this.firestore
        .collection(this.userStatsCollection)
        .orderBy('completedAchievements', 'desc')
        .limit(limit)
        .get();
      
      const entries = await Promise.all(
        allUsersStats.docs.map(async (doc: any, index: number) => {
          const stats = doc.data() as UserAchievementStats;
          const userData = await this.getUserDisplayData(stats.userId);
          
          return {
            userId: stats.userId,
            userDisplayName: userData.displayName,
            userAvatarUrl: userData.avatarUrl,
            score: stats.totalXpEarned,
            rank: index + 1,
            achievements: stats.completedAchievements,
            rareAchievements: this.calculateRareAchievements(stats)
          };
        })
      );
      
      const leaderboard: AchievementLeaderboard = {
        id: 'global',
        type: 'global',
        entries,
        lastUpdated: Timestamp.now(),
        nextUpdate: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)) // 1 hora
      };
      
      await leaderboardRef.set(leaderboard);
      return leaderboard;
    } catch (error) {
      logger.error('AchievementService', 'getGlobalLeaderboard', 'Erro ao obter leaderboard global', error);
      throw error;
    }
  }

  async getCategoryLeaderboard(category: AchievementCategory, limit = 50): Promise<AchievementLeaderboard> {
    try {
      const leaderboardRef = this.firestore.collection(this.leaderboardsCollection).doc(`category-${category}`);
      const doc = await leaderboardRef.get();
      
      if (doc.exists && this.isLeaderboardFresh(doc.data()?.lastUpdated)) {
        return doc.data() as AchievementLeaderboard;
      }
      
      const allUsersStats = await this.firestore
        .collection(this.userStatsCollection)
        .get();
      
      const categoryUsers = allUsersStats.docs
        .map((doc: any) => doc.data() as UserAchievementStats)
        .filter(stats => stats.categoryStats[category]?.completed > 0)
        .sort((a, b) => (b.categoryStats[category]?.completed || 0) - (a.categoryStats[category]?.completed || 0))
        .slice(0, limit);
      
      const entries = await Promise.all(
        categoryUsers.map(async (stats, index) => {
          const userData = await this.getUserDisplayData(stats.userId);
          
          return {
            userId: stats.userId,
            userDisplayName: userData.displayName,
            userAvatarUrl: userData.avatarUrl,
            score: stats.categoryStats[category]?.completed || 0,
            rank: index + 1,
            achievements: stats.categoryStats[category]?.completed || 0,
            rareAchievements: this.calculateCategoryRareAchievements(stats, category)
          };
        })
      );
      
      const leaderboard: AchievementLeaderboard = {
        id: `category-${category}`,
        type: 'category',
        category,
        entries,
        lastUpdated: Timestamp.now(),
        nextUpdate: Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)) // 2 horas
      };
      
      await leaderboardRef.set(leaderboard);
      return leaderboard;
    } catch (error) {
      logger.error('AchievementService', 'getCategoryLeaderboard', 'Erro ao obter leaderboard da categoria', error);
      throw error;
    }
  }

  async getWeeklyLeaderboard(limit = 50): Promise<AchievementLeaderboard> {
    try {
      const weekNumber = this.getWeekNumber(new Date());
      const leaderboardRef = this.firestore.collection(this.leaderboardsCollection).doc(`weekly-${weekNumber}`);
      const doc = await leaderboardRef.get();
      
      if (doc.exists && this.isLeaderboardFresh(doc.data()?.lastUpdated)) {
        return doc.data() as AchievementLeaderboard;
      }
      
      // Buscar conquistas completadas nesta semana
      const startOfWeek = this.getStartOfWeek(new Date());
      const weeklyCompletions = await this.firestore
        .collection(this.userAchievementsCollection)
        .where('status', '==', AchievementStatus.COMPLETED)
        .where('completedAt', '>=', Timestamp.fromDate(startOfWeek))
        .get();
      
      const userWeeklyStats = new Map<string, {count: number; xp: number}>();
      
      weeklyCompletions.docs.forEach((doc: any) => {
        const ua = doc.data() as UserAchievement;
        const current = userWeeklyStats.get(ua.userId) || {count: 0, xp: 0};
        current.count += 1;
        
        // Calcular XP da conquista
        if (ua.achievementSnapshot?.rewards) {
          const xpReward = ua.achievementSnapshot.rewards.find(r => r.type === RewardType.XP);
          if (xpReward) {
            current.xp += Number(xpReward.value);
          }
        }
        
        userWeeklyStats.set(ua.userId, current);
      });
      
      const sortedUsers = Array.from(userWeeklyStats.entries())
        .sort(([,a], [,b]) => b.count - a.count || b.xp - a.xp)
        .slice(0, limit);
      
      const entries = await Promise.all(
        sortedUsers.map(async ([userId, stats], index) => {
          const userData = await this.getUserDisplayData(userId);
          
          return {
            userId,
            userDisplayName: userData.displayName,
            userAvatarUrl: userData.avatarUrl,
            score: stats.xp,
            rank: index + 1,
            achievements: stats.count,
            rareAchievements: 0 // Calcular se necessário
          };
        })
      );
      
      const leaderboard: AchievementLeaderboard = {
        id: `weekly-${weekNumber}`,
        type: 'weekly',
        entries,
        lastUpdated: Timestamp.now(),
        nextUpdate: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)) // 30 minutos
      };
      
      await leaderboardRef.set(leaderboard);
      return leaderboard;
    } catch (error) {
      logger.error('AchievementService', 'getWeeklyLeaderboard', 'Erro ao obter leaderboard semanal', error);
      throw error;
    }
  }

  async getUserRanking(userId: string): Promise<{
    global: number;
    categoryRanks: Record<AchievementCategory, number>;
    percentile: number;
  }> {
    const global = await this.calculateUserGlobalRank(userId);
    
    const categoryRanks: Record<AchievementCategory, number> = {} as any;
    for (const category of Object.values(AchievementCategory)) {
      categoryRanks[category] = await this.calculateUserCategoryRank(userId, category);
    }
    
    // Calcular percentil
    const totalUsers = await this.getTotalUsersCount();
    const percentile = totalUsers > 0 ? Math.max(1, Math.ceil(((totalUsers - global + 1) / totalUsers) * 100)) : 100;
    
    return {
      global,
      categoryRanks,
      percentile
    };
  }

  // === NOTIFICAÇÕES AVANÇADAS ===

  async getUserNotifications(userId: string, includeRead = false): Promise<AchievementNotification[]> {
    let query = this.firestore
      .collection(this.notificationsCollection)
      .where('userId', '==', userId) as any;
    
    if (!includeRead) {
      query = query.where('isRead', '==', false);
    }
    
    query = query.orderBy('createdAt', 'desc').limit(50);
    
    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    } as AchievementNotification));
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      await this.firestore
        .collection(this.notificationsCollection)
        .doc(notificationId)
        .update({
          isRead: true,
          readAt: Timestamp.now()
        });
      
      return true;
    } catch (error) {
      logger.error('AchievementService', 'markNotificationAsRead', 'Erro ao marcar notificação como lida', error);
      return false;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    try {
      const unreadNotifications = await this.firestore
        .collection(this.notificationsCollection)
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get();
      
      const batch = this.firestore.batch();
      const now = Timestamp.now();
      
      unreadNotifications.docs.forEach((doc: any) => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: now
        });
      });
      
      await batch.commit();
      
      return unreadNotifications.size;
    } catch (error) {
      logger.error('AchievementService', 'markAllNotificationsAsRead', 'Erro ao marcar todas as notificações como lidas', error);
      return 0;
    }
  }
  async createNotification(notification: Omit<AchievementNotification, 'id' | 'createdAt'>): Promise<AchievementNotification> {
    const docRef = this.firestore.collection(this.notificationsCollection).doc();
    const now = Timestamp.now();

    const newNotification: AchievementNotification = {
      ...notification,
      id: docRef.id,
      createdAt: now
    };

    await docRef.set(newNotification);
    return newNotification;
  }

  // === SISTEMA DE RECOMPENSAS ===

  async collectRewards(userId: string, achievementId: string): Promise<{
    success: boolean;
    rewards: any[];
    newUserState: any;
  }> {
    try {
      const achievement = await this.getAchievementById(achievementId);
      if (!achievement) {
        throw new Error('Achievement not found');
      }

      const userAchievement = await this.getUserAchievement(userId, achievementId);
      if (!userAchievement) {
        throw new Error('User achievement not found');
      }

      // Remove unused variable
      // const userStatsRef = this.firestore.collection(this.userStatsCollection).doc(userId);
      
      // Implementation continues...
      return {
        success: true,
        rewards: [],
        newUserState: {}
      };
    } catch (error) {
      logger.error('Error collecting rewards:', error);
      throw error;
    }
  }

  async getPendingRewards(userId: string): Promise<Array<{
    achievementId: string;
    achievement: Achievement;
    rewards: any[];
  }>> {
    const completedAchievements = await this.getUserAchievements(userId, {
      status: [AchievementStatus.COMPLETED]
    });
    
    const pendingRewards = completedAchievements
      .filter(ua => !ua.rewardsCollected)
      .map(ua => {
        const achievement = ua.achievementSnapshot;
        if (!achievement) return null;
        
        return {
          achievementId: achievement.id,
          achievement,
          rewards: achievement.rewards
        };
      })
      .filter(r => r !== null) as Array<{
        achievementId: string;
        achievement: Achievement;
        rewards: any[];
      }>;
    
    return pendingRewards;
  }

  // === IA E ANALYTICS AVANÇADOS ===

  async generateAchievementSuggestions(userId: string): Promise<Array<{
    achievementId: string;
    achievement: Achievement;
    probability: number;
    estimatedDays: number;
    tips: string[];
  }>> {
    const userAchievements = await this.getUserAchievements(userId);
    const userStats = this.userStatsService ? 
      await this.userStatsService.getOrCreateUserStatistics(userId) : null;
    
    const availableAchievements = userAchievements.filter(ua => 
      ua.status === AchievementStatus.AVAILABLE || ua.status === AchievementStatus.IN_PROGRESS
    );
    
    const suggestions = await Promise.all(
      availableAchievements.map(async (ua) => {
        const achievement = ua.achievementSnapshot || await this.getAchievementById(ua.achievementId);
        if (!achievement) return null;
        
        // Analisar progresso atual
        const currentProgress = ua.progress.percentage;
        
        // Calcular probabilidade baseada em múltiplos fatores
        const progressFactor = currentProgress / 100;
        const difficultyFactor = this.getDifficultyFactor(achievement.rarity) / 100;
        const categoryExperienceFactor = this.calculateCategoryExperience(userId, achievement.category, userStats);
        
        const probability = Math.min(95, 
          (progressFactor * 40) + 
          (difficultyFactor * 30) + 
          (categoryExperienceFactor * 30)
        );
        
        // Estimar dias baseado no progresso e histórico
        const remainingProgress = 100 - currentProgress;
        const userProgressRate = await this.calculateUserProgressRate(userId, achievement.category);
        const estimatedDays = Math.max(1, Math.ceil(remainingProgress / userProgressRate));
        
        // Gerar tips
        const tips = await this.generateRequiredActions(achievement, ua, userStats);
        
        return {
          achievementId: achievement.id,
          achievement,
          probability: Math.floor(probability),
          estimatedDays,
          tips
        };
      })
    );
    
    return suggestions
      .filter(s => s !== null)
      .sort((a, b) => b!.probability - a!.probability)
      .slice(0, 8) as Array<{
        achievementId: string;
        achievement: Achievement;
        probability: number;
        estimatedDays: number;
        tips: string[];
      }>;
  }

  async analyzeUserAchievementPatterns(userId: string): Promise<{
    preferredCategories: AchievementCategory[];
    averageCompletionTime: number;
    strengths: string[];
    recommendations: string[];
  }> {
    await this.getUserAchievements(userId);
    // Remove unused variables
    // const userStats = await this.getUserAchievementStats(userId);
    // const userSystemStats = this.userStatsService ? await this.userStatsService.getOrCreateUserStatistics(userId) : null;

    // Implementation continues...
    return {
      preferredCategories: [],
      averageCompletionTime: 0,
      strengths: [],
      recommendations: []
    };
  }

  async generateProgressReport(_userId: string, _timeframe?: string): Promise<{
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
    // Remove unused variable
    // const currentRank = await this.calculateUserGlobalRank(userId);
    
    // Implementation continues...
    return {
      summary: {
        completedThisPeriod: 0,
        totalXpEarned: 0,
        rankingChange: 0
      },
      highlights: [],
      nextGoals: []
    };
  }

  // === ADMINISTRAÇÃO E CONFIGURAÇÃO ===

  async getConfig(): Promise<AchievementConfig> {
    const configDoc = await this.firestore.collection(this.configCollection).doc('main').get();
    
    if (configDoc.exists) {
      return configDoc.data() as AchievementConfig;
    }
    
    // Configuração padrão
    const defaultConfig: AchievementConfig = {
      id: 'main',
      xpMultipliers: {
        [AchievementRarity.COMMON]: 1.0,
        [AchievementRarity.UNCOMMON]: 1.2,
        [AchievementRarity.RARE]: 1.5,
        [AchievementRarity.EPIC]: 2.0,
        [AchievementRarity.LEGENDARY]: 3.0,
        [AchievementRarity.MYTHICAL]: 5.0
      },
      notificationSettings: {
        enablePushNotifications: true,
        enableEmailNotifications: true,
        enableInAppNotifications: true,
        quietHours: {
          start: '22:00',
          end: '08:00'
        }
      },
      leaderboardSettings: {
        updateFrequency: 30,
        maxEntries: 100,
        enableGlobalLeaderboard: true,
        enableCategoryLeaderboards: true
      },
      lastUpdated: Timestamp.now()
    };
    
    await this.firestore.collection(this.configCollection).doc('main').set(defaultConfig);
    return defaultConfig;
  }

  async updateConfig(updates: Partial<AchievementConfig>): Promise<AchievementConfig> {
    const configRef = this.firestore.collection(this.configCollection).doc('main');
    
    const updatedData = {
      ...updates,
      lastUpdated: Timestamp.now()
    };
    
    await configRef.update(updatedData);
    
    const updatedDoc = await configRef.get();
    return updatedDoc.data() as AchievementConfig;
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
    const [
      achievementsSnapshot,
      usersSnapshot,
      completionsSnapshot
    ] = await Promise.all([
      this.firestore.collection(this.achievementsCollection).get(),
      this.firestore.collection(this.userStatsCollection).get(),
      this.firestore.collection(this.userAchievementsCollection)
        .where('status', '==', AchievementStatus.COMPLETED)
        .get()
    ]);
    
    const achievements = achievementsSnapshot.docs.map((doc: any) => doc.data() as Achievement);
    const users = usersSnapshot.docs.map((doc: any) => doc.data() as UserAchievementStats);
    
    // Calcular taxas de conclusão por raridade
    const completionRates: Record<AchievementRarity, number> = {} as any;
    for (const rarity of Object.values(AchievementRarity)) {
      const achievementsOfRarity = achievements.filter(a => a.rarity === rarity);
      const completionsOfRarity = completionsSnapshot.docs.filter((doc: any) => {
        const ua = doc.data() as UserAchievement;
        return ua.achievementSnapshot?.rarity === rarity;
      });
      
      const totalPossible = achievementsOfRarity.length * users.length;
      completionRates[rarity] = totalPossible > 0 ? (completionsOfRarity.length / totalPossible) * 100 : 0;
    }
    
    // Conquistas populares
    const achievementCompletions = new Map<string, number>();
    completionsSnapshot.docs.forEach((doc: any) => {
      const ua = doc.data() as UserAchievement;
      const current = achievementCompletions.get(ua.achievementId) || 0;
      achievementCompletions.set(ua.achievementId, current + 1);
    });
    
    const popularAchievements = Array.from(achievementCompletions.entries())
      .map(([achievementId, completionCount]) => ({
        achievementId,
        completionCount,
        completionRate: users.length > 0 ? (completionCount / users.length) * 100 : 0
      }))
      .sort((a, b) => b.completionCount - a.completionCount)
      .slice(0, 10);
    
    // Engajamento do usuário
    const activeUsers = users.filter(u => u.completedAchievements > 0).length;
    const totalCompletions = users.reduce((sum, u) => sum + u.completedAchievements, 0);
    const avgCompletionsPerUser = users.length > 0 ? totalCompletions / users.length : 0;
    
    // Retenção por conquistas (simplificado)
    const retentionByAchievements: Record<string, number> = {
      '1+': users.filter(u => u.completedAchievements >= 1).length,
      '5+': users.filter(u => u.completedAchievements >= 5).length,
      '10+': users.filter(u => u.completedAchievements >= 10).length,
      '25+': users.filter(u => u.completedAchievements >= 25).length
    };
    
    return {
      totalAchievements: achievements.length,
      totalUsers: users.length,
      completionRates,
      popularAchievements,
      userEngagement: {
        activeUsers,
        avgCompletionsPerUser,
        retentionByAchievements
      }
    };
  }

  async recalculateAllLeaderboards(): Promise<void> {
    try {
      // Recalcular leaderboard global
      await this.getGlobalLeaderboard();
      
      // Recalcular leaderboards por categoria
      for (const category of Object.values(AchievementCategory)) {
        await this.getCategoryLeaderboard(category);
      }
      
      // Recalcular leaderboard semanal
      await this.getWeeklyLeaderboard();
      
      logger.info('AchievementService', 'recalculateAllLeaderboards', 'Todos os leaderboards foram recalculados');
    } catch (error) {
      logger.error('AchievementService', 'recalculateAllLeaderboards', 'Erro ao recalcular leaderboards', error);
      throw error;
    }
  }
  async logEvent(event: Omit<AchievementEvent, 'id' | 'timestamp'>): Promise<AchievementEvent> {
    const docRef = this.firestore.collection(this.eventsCollection).doc();
    const now = Timestamp.now();

    const newEvent: AchievementEvent = {
      ...event,
      id: docRef.id,
      timestamp: now
    };

    await docRef.set(newEvent);
    return newEvent;
  }

  // === HISTÓRICO E LOGS AVANÇADOS ===

  async getUserEventHistory(userId: string, limit = 100): Promise<AchievementEvent[]> {
    const snapshot = await this.firestore
      .collection(this.eventsCollection)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map((doc: any) => doc.data() as AchievementEvent);
  }

  async getAchievementEventHistory(achievementId: string, limit = 50): Promise<AchievementEvent[]> {
    const snapshot = await this.firestore
      .collection(this.eventsCollection)
      .where('achievementId', '==', achievementId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map((doc: any) => doc.data() as AchievementEvent);
  }

  // === INTEGRAÇÕES ROBUSTAS ===

  async syncWithUserStatistics(userId: string): Promise<AchievementCheckResult> {
    if (!this.userStatsService) {
      throw new Error('UserStatisticsService não disponível');
    }

    try {
      // Obter estatísticas atualizadas do usuário
      const userStats = await this.userStatsService.getOrCreateUserStatistics(userId);
      
      // Verificar conquistas baseadas nas estatísticas
      const result = await this.checkAchievements({
        userId,
        eventType: 'stats_sync',
        eventData: {
          totalQuestionsAnswered: userStats.totalQuestionsAnswered,
          correctAnswers: userStats.correctAnswers,
          overallAccuracy: userStats.overallAccuracy,
          currentStreak: userStats.streakData.currentStreak,
          totalStudyTime: userStats.studyTimeAnalysis.totalMinutesStudied,
          totalXP: userStats.learningMetrics.totalXP,
          currentLevel: userStats.learningMetrics.currentLevel
        },
        timestamp: Timestamp.now(),
        triggerSource: 'user_statistics_sync'
      });

      // Atualizar estatísticas das conquistas
      await this.recalculateUserStats(userId);

      logger.info('AchievementService', 'syncWithUserStatistics', 
        `Sincronização completada para ${userId}: ${result.progressUpdates.length} atualizações`);

      return result;
    } catch (error) {
      logger.error('AchievementService', 'syncWithUserStatistics', 
        `Erro na sincronização para ${userId}`, error);
      throw error;
    }
  }

  async syncWithSRSSystem(userId: string): Promise<AchievementCheckResult> {
    try {
      // Obter dados do SRS
      const srsReviewsCount = await this.getSRSReviewsCount(userId);
      const srsMasteredCount = await this.getSRSMasteredCount(userId);
      
      // Buscar dados adicionais do SRS
      const srsSnapshot = await this.firestore
        .collection('programmedReviews')
        .where('userId', '==', userId)
        .get();
      
      let totalReviewTime = 0;
      let perfectReviews = 0;
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      srsSnapshot.docs.forEach((doc: any) => {
        const review = doc.data();
        if (review.lastReviewedAt) {
          const reviewDate = review.lastReviewedAt.toDate();
          if (reviewDate >= startOfDay) {
            totalReviewTime += review.timeSpent || 0;
            if (review.lastScore === 100) {
              perfectReviews++;
            }
          }
        }
      });
      
      const result = await this.checkAchievements({
        userId,
        eventType: 'srs_sync',
        eventData: {
          srsReviewsCompleted: srsReviewsCount,
          srsMasteredCards: srsMasteredCount,
          totalReviewTime,
          perfectReviews,
          dailyReviews: srsSnapshot.docs.filter((doc: any) => {
            const review = doc.data();
            return review.lastReviewedAt && review.lastReviewedAt.toDate() >= startOfDay;
          }).length
        },
        timestamp: Timestamp.now(),
        triggerSource: 'srs_system_sync'
      });

      logger.info('AchievementService', 'syncWithSRSSystem', 
        `Sincronização SRS completada para ${userId}: ${srsReviewsCount} reviews, ${srsMasteredCount} masterizados`);

      return result;
    } catch (error) {
      logger.error('AchievementService', 'syncWithSRSSystem', 
        `Erro na sincronização SRS para ${userId}`, error);
      throw error;
    }
  }

  async onQuestionAnswered(userId: string, questionData: any): Promise<AchievementCheckResult> {
    return this.checkAchievements({
      userId,
      eventType: 'question_answered',
      eventData: {
        questionId: questionData.questionId,
        correct: questionData.correct,
        timeSpent: questionData.timeSpent,
        difficulty: questionData.difficulty,
        filterId: questionData.filterId,
        subject: questionData.subject
      },
      timestamp: Timestamp.now(),
      triggerSource: 'question_system'
    });
  }

  async onExamCompleted(userId: string, examData: any): Promise<AchievementCheckResult> {
    return this.checkAchievements({
      userId,
      eventType: 'exam_completed',
      eventData: {
        examId: examData.examId,
        score: examData.score,
        totalQuestions: examData.totalQuestions,
        correctAnswers: examData.correctAnswers,
        timeSpent: examData.timeSpent,
        examType: examData.examType,
        subject: examData.subject,
        isPerfectScore: examData.score === 100
      },
      timestamp: Timestamp.now(),
      triggerSource: 'exam_system'
    });
  }

  async onStreakUpdated(userId: string, streakData: any): Promise<AchievementCheckResult> {
    return this.checkAchievements({
      userId,
      eventType: 'streak_updated',
      eventData: {
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        streakType: streakData.streakType,
        isNewRecord: streakData.isNewRecord,
        consecutiveDays: streakData.consecutiveDays
      },
      timestamp: Timestamp.now(),
      triggerSource: 'streak_system'
    });
  }

  async onStudyMilestone(userId: string, milestoneData: any): Promise<AchievementCheckResult> {
    return this.checkAchievements({
      userId,
      eventType: 'study_milestone',
      eventData: {
        milestoneType: milestoneData.milestoneType,
        value: milestoneData.value,
        category: milestoneData.category,
        totalStudyTime: milestoneData.totalStudyTime,
        sessionsCompleted: milestoneData.sessionsCompleted,
        averageSessionTime: milestoneData.averageSessionTime
      },
      timestamp: Timestamp.now(),
      triggerSource: 'study_system'
    });
  }

  // === DADOS E PRIVACIDADE ===

  async exportUserAchievementData(userId: string): Promise<string> {
    try {
      const [userAchievements, userStats, notifications, events] = await Promise.all([
        this.getUserAchievements(userId),
        this.getUserAchievementStats(userId),
        this.getUserNotifications(userId, true),
        this.getUserEventHistory(userId)
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        userId,
        achievements: userAchievements,
        statistics: userStats,
        notifications,
        events,
        version: this.currentVersion
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logger.error('AchievementService', 'exportUserAchievementData', 
        `Erro ao exportar dados para ${userId}`, error);
      throw error;
    }
  }

  async deleteUserAchievementData(userId: string): Promise<boolean> {
    try {
      const batch = this.firestore.batch();

      // Deletar conquistas do usuário
      const userAchievements = await this.firestore
        .collection(this.userAchievementsCollection)
        .where('userId', '==', userId)
        .get();

      userAchievements.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });

      // Deletar estatísticas
      const userStatsRef = this.firestore.collection(this.userStatsCollection).doc(userId);
      batch.delete(userStatsRef);

      // Deletar notificações
      const notifications = await this.firestore
        .collection(this.notificationsCollection)
        .where('userId', '==', userId)
        .get();

      notifications.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });

      // Deletar eventos
      const events = await this.firestore
        .collection(this.eventsCollection)
        .where('userId', '==', userId)
        .get();

      events.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info('AchievementService', 'deleteUserAchievementData', 
        `Dados deletados para usuário ${userId}: ${userAchievements.size} conquistas, ${notifications.size} notificações, ${events.size} eventos`);

      return true;
    } catch (error) {
      logger.error('AchievementService', 'deleteUserAchievementData', 
        `Erro ao deletar dados para ${userId}`, error);
      return false;
    }
  }

  // === MÉTODOS AUXILIARES PARA IA ===

  private calculateCategoryExperience(_userId: string, category: AchievementCategory, userStats?: any): number {
    // Use category parameter
    return userStats?.categoryExperience?.[category] || 0;
  }

  private async calculateUserProgressRate(userId: string, category: AchievementCategory): Promise<number> {
    try {
      // Calcular taxa de progresso baseada no histórico recente (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentCompletions = await this.firestore
        .collection(this.userAchievementsCollection)
        .where('userId', '==', userId)
        .where('status', '==', AchievementStatus.COMPLETED)
        .where('completedAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
        .get();
      
      const categoryCompletions = recentCompletions.docs.filter((doc: any) => {
        const ua = doc.data() as UserAchievement;
        return ua.achievementSnapshot?.category === category;
      }).length;
      
      // Estimar progresso diário (mínimo 2% para evitar estimativas muito altas)
      return Math.max(2, (categoryCompletions / 30) * 10);
    } catch (error) {
      return 5; // Taxa padrão de 5% por dia
    }
  }

  // Método removido - não utilizado

  private async generateRequiredActions(achievement: Achievement, userAchievement: UserAchievement, _userStats?: any): Promise<string[]> {
    return [`Complete ${achievement.name} with ${100 - (userAchievement.progress.percentage || 0)}% remaining`];
  }

  // Adicionar método getDifficultyFactor que estava faltando
  private getDifficultyFactor(rarity: AchievementRarity): number {
    switch (rarity) {
      case AchievementRarity.COMMON: return 80;
      case AchievementRarity.UNCOMMON: return 60;
      case AchievementRarity.RARE: return 40;
      case AchievementRarity.EPIC: return 25;
      case AchievementRarity.LEGENDARY: return 15;
      case AchievementRarity.MYTHICAL: return 5;
      default: return 50;
    }
  }

  // Método removido - não utilizado
} 