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
  AchievementRarity
} from '../types';

/**
 * Interface principal do serviço de conquistas
 */
export interface IAchievementService {
  // === GESTÃO DE CONQUISTAS ===
  
  /**
   * Cria uma nova conquista
   */
  createAchievement(achievement: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Achievement>;
  
  /**
   * Obtém uma conquista por ID
   */
  getAchievementById(achievementId: string): Promise<Achievement | null>;
  
  /**
   * Atualiza uma conquista existente
   */
  updateAchievement(achievementId: string, updates: Partial<Achievement>): Promise<Achievement>;
  
  /**
   * Deleta uma conquista
   */
  deleteAchievement(achievementId: string): Promise<boolean>;
  
  /**
   * Lista todas as conquistas ativas
   */
  getAllAchievements(filters?: AchievementFilters): Promise<Achievement[]>;
  
  /**
   * Cria conquistas em massa usando templates
   */
  createAchievementsFromTemplate(template: AchievementTemplate): Promise<Achievement[]>;
  
  // === CONQUISTAS DO USUÁRIO ===
  
  /**
   * Obtém todas as conquistas de um usuário
   */
  getUserAchievements(userId: string, filters?: AchievementFilters): Promise<UserAchievement[]>;
  
  /**
   * Obtém conquista específica de um usuário
   */
  getUserAchievement(userId: string, achievementId: string): Promise<UserAchievement | null>;
  
  /**
   * Inicializa conquistas para um novo usuário
   */
  initializeUserAchievements(userId: string): Promise<UserAchievement[]>;
  
  /**
   * Força atualização de uma conquista específica
   */
  updateUserAchievementProgress(
    userId: string, 
    achievementId: string, 
    progressData: any
  ): Promise<UserAchievement>;
  
  // === VERIFICAÇÃO E TRIGGERS ===
  
  /**
   * Verifica conquistas baseado em um evento do usuário
   */
  checkAchievements(payload: AchievementCheckPayload): Promise<AchievementCheckResult>;
  
  /**
   * Executa verificação diária de conquistas
   */
  runDailyChecks(userId?: string): Promise<AchievementCheckResult[]>;
  
  /**
   * Executa verificação semanal de conquistas
   */
  runWeeklyChecks(userId?: string): Promise<AchievementCheckResult[]>;
  
  /**
   * Executa verificação mensal de conquistas
   */
  runMonthlyChecks(userId?: string): Promise<AchievementCheckResult[]>;
  
  /**
   * Força verificação de conquistas específicas
   */
  forceCheckSpecificAchievements(
    userId: string, 
    achievementIds: string[]
  ): Promise<AchievementCheckResult>;
  
  // === ESTATÍSTICAS E RANKINGS ===
  
  /**
   * Obtém estatísticas de conquistas do usuário
   */
  getUserAchievementStats(userId: string): Promise<UserAchievementStats>;
  
  /**
   * Recalcula estatísticas de conquistas do usuário
   */
  recalculateUserStats(userId: string): Promise<UserAchievementStats>;
  
  /**
   * Obtém leaderboard global
   */
  getGlobalLeaderboard(limit?: number): Promise<AchievementLeaderboard>;
  
  /**
   * Obtém leaderboard por categoria
   */
  getCategoryLeaderboard(
    category: AchievementCategory, 
    limit?: number
  ): Promise<AchievementLeaderboard>;
  
  /**
   * Obtém leaderboard semanal
   */
  getWeeklyLeaderboard(limit?: number): Promise<AchievementLeaderboard>;
  
  /**
   * Obtém ranking de um usuário específico
   */
  getUserRanking(userId: string): Promise<{
    global: number;
    categoryRanks: Record<AchievementCategory, number>;
    percentile: number;
  }>;
  
  // === NOTIFICAÇÕES ===
  
  /**
   * Obtém notificações de conquistas do usuário
   */
  getUserNotifications(
    userId: string, 
    includeRead?: boolean
  ): Promise<AchievementNotification[]>;
  
  /**
   * Marca notificação como lida
   */
  markNotificationAsRead(notificationId: string): Promise<boolean>;
  
  /**
   * Marca todas as notificações como lidas
   */
  markAllNotificationsAsRead(userId: string): Promise<number>;
  
  /**
   * Cria uma notificação de conquista
   */
  createNotification(
    notification: Omit<AchievementNotification, 'id' | 'createdAt'>
  ): Promise<AchievementNotification>;
  
  // === RECOMPENSAS ===
  
  /**
   * Coleta recompensas de uma conquista
   */
  collectRewards(userId: string, achievementId: string): Promise<{
    success: boolean;
    rewards: any[];
    newUserState: any;
  }>;
  
  /**
   * Verifica recompensas pendentes do usuário
   */
  getPendingRewards(userId: string): Promise<Array<{
    achievementId: string;
    achievement: Achievement;
    rewards: any[];
  }>>;
  
  // === ANÁLISE E INSIGHTS ===
  
  /**
   * Gera sugestões de conquistas para o usuário
   */
  generateAchievementSuggestions(userId: string): Promise<Array<{
    achievementId: string;
    achievement: Achievement;
    probability: number;
    estimatedDays: number;
    tips: string[];
  }>>;
  
  /**
   * Analisa padrões de conquistas do usuário
   */
  analyzeUserAchievementPatterns(userId: string): Promise<{
    preferredCategories: AchievementCategory[];
    averageCompletionTime: number;
    strengths: string[];
    recommendations: string[];
  }>;
  
  /**
   * Gera relatório de progresso personalizado
   */
  generateProgressReport(userId: string, timeframe?: string): Promise<{
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
  }>;
  
  // === CONFIGURAÇÕES E ADMIN ===
  
  /**
   * Obtém configurações globais
   */
  getConfig(): Promise<AchievementConfig>;
  
  /**
   * Atualiza configurações globais
   */
  updateConfig(config: Partial<AchievementConfig>): Promise<AchievementConfig>;
  
  /**
   * Obtém métricas administrativas
   */
  getAdminMetrics(): Promise<{
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
  }>;
  
  /**
   * Recalcula todos os leaderboards
   */
  recalculateAllLeaderboards(): Promise<void>;
  
  // === EVENTOS E LOGS ===
  
  /**
   * Registra um evento de conquista
   */
  logEvent(event: Omit<AchievementEvent, 'id' | 'timestamp'>): Promise<AchievementEvent>;
  
  /**
   * Obtém histórico de eventos do usuário
   */
  getUserEventHistory(
    userId: string, 
    limit?: number
  ): Promise<AchievementEvent[]>;
  
  /**
   * Obtém eventos de uma conquista específica
   */
  getAchievementEventHistory(
    achievementId: string, 
    limit?: number
  ): Promise<AchievementEvent[]>;
  
  // === INTEGRAÇÃO COM OUTROS SISTEMAS ===
  
  /**
   * Integração com sistema de estatísticas do usuário
   */
  syncWithUserStatistics(userId: string): Promise<AchievementCheckResult>;
  
  /**
   * Integração com sistema SRS
   */
  syncWithSRSSystem(userId: string): Promise<AchievementCheckResult>;
  
  /**
   * Trigger para resposta de questão
   */
  onQuestionAnswered(
    userId: string, 
    questionData: {
      questionId: string;
      isCorrect: boolean;
      difficulty: string;
      timeSpent: number;
      filterId: string;
    }
  ): Promise<AchievementCheckResult>;
  
  /**
   * Trigger para conclusão de simulado
   */
  onExamCompleted(
    userId: string, 
    examData: {
      score: number;
      totalQuestions: number;
      specialty: string;
      timeSpent: number;
    }
  ): Promise<AchievementCheckResult>;
  
  /**
   * Trigger para atualização de streak
   */
  onStreakUpdated(
    userId: string, 
    streakData: {
      currentStreak: number;
      longestStreak: number;
      streakType: string;
    }
  ): Promise<AchievementCheckResult>;
  
  /**
   * Trigger para milestone de estudo
   */
  onStudyMilestone(
    userId: string, 
    milestoneData: {
      type: 'time' | 'questions' | 'accuracy' | 'level';
      value: number;
      previous: number;
    }
  ): Promise<AchievementCheckResult>;
  
  // === UTILITÁRIOS ===
  
  /**
   * Valida condições de uma conquista
   */
  validateAchievementConditions(achievement: Achievement): Promise<{
    isValid: boolean;
    errors: string[];
  }>;
  
  /**
   * Calcula progresso de uma conquista para um usuário
   */
  calculateAchievementProgress(
    userId: string, 
    achievement: Achievement
  ): Promise<{
    current: number;
    target: number;
    percentage: number;
  }>;
  
  /**
   * Exporta dados de conquistas do usuário
   */
  exportUserAchievementData(
    userId: string, 
    format: 'json' | 'csv'
  ): Promise<string>;
  
  /**
   * Deleta todos os dados de conquistas de um usuário
   */
  deleteUserAchievementData(userId: string): Promise<boolean>;
} 