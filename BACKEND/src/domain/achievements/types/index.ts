// Removed Firebase dependency - using ISO string dates

/**
 * Categorias de conquistas para organização
 */
export enum AchievementCategory {
  STUDY_STREAK = 'study_streak',
  ACCURACY = 'accuracy',
  STUDY_TIME = 'study_time',
  QUESTION_COUNT = 'question_count',
  EXAM_PERFORMANCE = 'exam_performance',
  SRS_MASTERY = 'srs_mastery',
  SOCIAL = 'social',
  SPECIALTY = 'specialty',
  CONSISTENCY = 'consistency',
  IMPROVEMENT = 'improvement',
  MILESTONE = 'milestone',
  SEASONAL = 'seasonal',
  LEADERSHIP = 'leadership',
  DEDICATION = 'dedication',
}

/**
 * Tipos de triggers para conquistas
 */
export enum AchievementTriggerType {
  IMMEDIATE = 'immediate', // Disparado imediatamente
  DAILY_CHECK = 'daily_check', // Verificado diariamente
  WEEKLY_CHECK = 'weekly_check', // Verificado semanalmente
  MONTHLY_CHECK = 'monthly_check', // Verificado mensalmente
  SESSION_END = 'session_end', // Ao final de cada sessão
  EXAM_COMPLETION = 'exam_completion', // Ao completar simulado
  MANUAL = 'manual', // Disparado manualmente
}

/**
 * Raridade da conquista
 */
export enum AchievementRarity {
  COMMON = 'common', // 70%+ dos usuários conseguem
  UNCOMMON = 'uncommon', // 40-70% dos usuários
  RARE = 'rare', // 15-40% dos usuários
  EPIC = 'epic', // 5-15% dos usuários
  LEGENDARY = 'legendary', // 1-5% dos usuários
  MYTHICAL = 'mythical', // <1% dos usuários
}

/**
 * Status de uma conquista
 */
export enum AchievementStatus {
  LOCKED = 'locked', // Não disponível ainda
  AVAILABLE = 'available', // Disponível para conquistar
  IN_PROGRESS = 'in_progress', // Em progresso
  COMPLETED = 'completed', // Conquistada
  EXPIRED = 'expired', // Expirou (se aplicável)
}

/**
 * Tipos de recompensas
 */
export enum RewardType {
  XP = 'xp',
  BADGE = 'badge',
  TITLE = 'title',
  AVATAR_ITEM = 'avatar_item',
  THEME = 'theme',
  FEATURE_UNLOCK = 'feature_unlock',
  STREAK_FREEZE = 'streak_freeze',
  PREMIUM_DAYS = 'premium_days',
  POINTS = 'points',
}

/**
 * Condições para conquistar um achievement
 */
export interface AchievementCondition {
  type:
    | 'count'
    | 'percentage'
    | 'threshold'
    | 'streak'
    | 'time_based'
    | 'comparison';
  field: string; // Campo a ser verificado (ex: 'totalQuestionsAnswered')
  operator: '>' | '<' | '>=' | '<=' | '==' | 'contains';
  value: number | string | boolean;
  timeframe?: string; // Período de tempo (ex: '7d', '30d', '1y')
  additionalData?: Record<string, any>; // Dados extras específicos
}

/**
 * Recompensas por conquistar um achievement
 */
export interface AchievementReward {
  type: RewardType;
  value: number | string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Progresso de uma conquista
 */
export interface AchievementProgress {
  current: number;
  target: number;
  percentage: number;
  lastUpdated: string; // ISO string
  milestones?: Array<{
    value: number;
    achieved: boolean;
    achievedAt?: string; // ISO string
  }>;
}

/**
 * Definição completa de uma conquista
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  longDescription?: string;

  // Categorização
  category: AchievementCategory;
  rarity: AchievementRarity;

  // Lógica de conquista
  conditions: AchievementCondition[];
  triggerType: AchievementTriggerType;

  // Recompensas
  rewards: AchievementReward[];

  // Configurações
  isHidden: boolean; // Se deve ser mostrada antes de ser conquistada
  isRepeatable: boolean; // Se pode ser conquistada múltiplas vezes
  maxCompletions?: number; // Máximo de vezes que pode ser completada

  // Dependências
  prerequisiteIds?: string[]; // IDs de conquistas que devem ser completadas antes

  // Temporalidade
  startDate?: string; // Data de início (conquistas sazonais) - ISO string
  endDate?: string; // Data de fim (conquistas limitadas) - ISO string

  // Metadados
  iconUrl?: string;
  badgeUrl?: string;
  tags: string[];

  // Sistema
  isActive: boolean;
  version: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy: string;
}

/**
 * Achievement conquistado por um usuário
 */
export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;

  // Status e progresso
  status: AchievementStatus;
  progress: AchievementProgress;

  // Histórico de conquistas
  completedAt?: string; // ISO string
  completionCount: number;

  // Dados específicos da conquista
  completionData?: Record<string, any>;

  // Recompensas recebidas
  rewardsCollected: boolean;
  rewardsCollectedAt?: string; // ISO string

  // Metadados
  firstSeenAt: string; // ISO string
  lastUpdatedAt: string; // ISO string

  // Cache do achievement para performance
  achievementSnapshot?: Achievement;
}

/**
 * Estatísticas de conquistas do usuário
 */
export interface UserAchievementStats {
  userId: string;

  // Contadores gerais
  totalAchievements: number;
  completedAchievements: number;
  inProgressAchievements: number;

  // Por categoria
  categoryStats: Record<
    AchievementCategory,
    {
      total: number;
      completed: number;
      percentage: number;
    }
  >;

  // Por raridade
  rarityStats: Record<
    AchievementRarity,
    {
      total: number;
      completed: number;
    }
  >;

  // Pontuações
  totalXpEarned: number;
  totalPointsEarned: number;

  // Rankings
  globalRank: number;
  categoryRanks: Record<AchievementCategory, number>;

  // Tendências
  recentCompletions: Array<{
    achievementId: string;
    completedAt: string; // ISO string
    rarity: AchievementRarity;
  }>;

  // Próximas conquistas prováveis
  suggestedAchievements: Array<{
    achievementId: string;
    probability: number; // 0-100
    estimatedDays: number;
  }>;

  // Metadados
  lastCalculated: string; // ISO string
  completionRate: number; // Percentual geral de conclusão
}

/**
 * Leaderboard de conquistas
 */
export interface AchievementLeaderboard {
  id: string;
  type: 'global' | 'category' | 'weekly' | 'monthly';
  category?: AchievementCategory;

  entries: Array<{
    userId: string;
    userDisplayName: string;
    userAvatarUrl?: string;
    score: number;
    rank: number;
    achievements: number;
    rareAchievements: number;
  }>;

  lastUpdated: string; // ISO string
  nextUpdate: string; // ISO string
}

/**
 * Notificação de conquista
 */
export interface AchievementNotification {
  id: string;
  userId: string;
  achievementId: string;

  type: 'completed' | 'progress' | 'milestone';

  // Dados da notificação
  title: string;
  message: string;

  // Configurações
  isRead: boolean;
  isImportant: boolean; // Para conquistas raras

  // Metadados
  createdAt: string; // ISO string
  readAt?: string; // ISO string

  // Dados extras
  achievementSnapshot?: Achievement;
  progressData?: AchievementProgress;
}

/**
 * Evento de conquista para tracking
 */
export interface AchievementEvent {
  id: string;
  userId: string;
  achievementId?: string;

  // Tipo do evento
  eventType: 'progress_updated' | 'completed' | 'failed_check' | 'unlocked';

  // Contexto do evento
  triggerSource: string; // O que causou o evento
  triggerData?: Record<string, any>;

  // Dados do evento
  beforeState?: any;
  afterState?: any;

  // Metadados
  timestamp: string; // ISO string
  sessionId?: string;
}

/**
 * Configurações globais de conquistas
 */
export interface AchievementConfig {
  id: string;

  // Configurações de XP
  xpMultipliers: Record<AchievementRarity, number>;

  // Configurações de notificações
  notificationSettings: {
    enablePushNotifications: boolean;
    enableEmailNotifications: boolean;
    enableInAppNotifications: boolean;
    quietHours: {
      start: string; // HH:mm
      end: string; // HH:mm
    };
  };

  // Configurações de leaderboard
  leaderboardSettings: {
    updateFrequency: number; // em minutos
    maxEntries: number;
    enableGlobalLeaderboard: boolean;
    enableCategoryLeaderboards: boolean;
  };

  // Sistema de temporadas
  seasonConfig?: {
    isEnabled: boolean;
    currentSeason: string;
    seasonStart: string; // ISO string
    seasonEnd: string; // ISO string
    seasonRewards: AchievementReward[];
  };

  lastUpdated: string; // ISO string
}

/**
 * Template para criação de conquistas em massa
 */
export interface AchievementTemplate {
  id: string;
  name: string;
  description: string;

  // Template de condições
  conditionTemplate: AchievementCondition;

  // Variações
  variations: Array<{
    suffix: string;
    targetValue: number;
    rarity: AchievementRarity;
    rewards: AchievementReward[];
  }>;

  category: AchievementCategory;
  triggerType: AchievementTriggerType;

  createdAt: string; // ISO string
  isActive: boolean;
}

/**
 * Payload para verificação de conquistas
 */
export interface AchievementCheckPayload {
  userId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: string; // ISO string

  // Contexto adicional
  sessionId?: string;
  triggerSource: string;

  // Forçar verificação de conquistas específicas
  forceCheckAchievements?: string[];
}

/**
 * Resultado da verificação de conquistas
 */
export interface AchievementCheckResult {
  userId: string;
  checksPerformed: number;

  // Conquistas atualizadas
  progressUpdates: Array<{
    achievementId: string;
    oldProgress: AchievementProgress;
    newProgress: AchievementProgress;
  }>;

  // Conquistas completadas
  newCompletions: Array<{
    achievementId: string;
    achievement: Achievement;
    rewards: AchievementReward[];
  }>;

  // Novas conquistas desbloqueadas
  newUnlocks: Array<{
    achievementId: string;
    achievement: Achievement;
  }>;

  // Notificações geradas
  notifications: AchievementNotification[];

  // Estatísticas atualizadas
  updatedStats: UserAchievementStats;

  processingTime: number; // em ms
  timestamp: string; // ISO string
}

/**
 * Filtros para busca de conquistas
 */
export interface AchievementFilters {
  categories?: AchievementCategory[];
  rarities?: AchievementRarity[];
  status?: AchievementStatus[];

  // Filtros de texto
  searchQuery?: string;
  tags?: string[];

  // Filtros temporais
  completedAfter?: Date;
  completedBefore?: Date;

  // Filtros de progresso
  minProgress?: number;
  maxProgress?: number;

  // Ordenação
  sortBy?: 'name' | 'category' | 'rarity' | 'progress' | 'completedAt';
  sortOrder?: 'asc' | 'desc';

  // Paginação
  limit?: number;
  offset?: number;
}

export default Achievement;
