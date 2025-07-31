import { Timestamp } from 'firebase-admin/firestore';

/**
 * Tipos de dificuldade para análise de performance
 */
export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate', 
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

/**
 * Tipos de padrões de estudo identificados
 */
export enum StudyPattern {
  MORNING_BIRD = 'morning_bird',
  NIGHT_OWL = 'night_owl',
  SPRINT_LEARNER = 'sprint_learner',
  MARATHON_LEARNER = 'marathon_learner',
  WEEKEND_WARRIOR = 'weekend_warrior',
  CONSISTENT_DAILY = 'consistent_daily'
}

/**
 * Níveis de retenção de conhecimento
 */
export enum RetentionLevel {
  POOR = 'poor',           // < 50%
  AVERAGE = 'average',     // 50-70%
  GOOD = 'good',          // 70-85%
  EXCELLENT = 'excellent'  // > 85%
}

/**
 * Métricas detalhadas por filtro/tópico
 */
export interface FilterStatistics {
  filterId: string;
  filterName: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number | null;
  averageTimePerQuestion: number | null; // em segundos
  difficultyDistribution: Record<DifficultyLevel, number>;
  lastStudied: Timestamp | null;
  masteryLevel: number | null; // 0-100
  retentionRate: number | null; // Taxa de retenção ao longo do tempo
  improvementTrend: number | null; // Tendência de melhoria (-1 a 1)
  predictedPerformance: number | null; // Performance prevista (0-100)
}

/**
 * Análise de padrões temporais de estudo
 */
export interface StudyTimeAnalysis {
  totalMinutesStudied: number;
  sessionsCount: number;
  averageSessionDuration: number | null;
  longestSession: number | null;
  shortestSession: number | null;
  preferredTimeSlots: Array<{
    hour: number;
    frequency: number;
    averagePerformance: number;
  }>;
  weeklyDistribution: Record<string, number>; // day -> minutes
  monthlyTrend: Array<{
    month: string;
    minutes: number;
    performance: number;
  }>;
  studyPattern: StudyPattern | null;
  consistencyScore: number | null; // 0-100
}

/**
 * Métricas de performance e aprendizado
 */
export interface LearningMetrics {
  totalXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  accuracyTrend: Array<{
    date: Timestamp;
    accuracy: number;
    questionsAnswered: number;
  }>;
  learningVelocity: number | null; // Velocidade de aprendizado
  retentionCurve: Array<{
    timeInterval: string; // '1d', '7d', '30d', etc.
    retentionRate: number;
  }>;
  knowledgeGaps: Array<{
    filterId: string;
    severity: number; // 0-100
    lastReview: Timestamp;
    recommendedReview: Timestamp;
  }>;
  strengths: string[]; // IDs dos filtros onde o usuário é forte
  weaknesses: string[]; // IDs dos filtros onde o usuário precisa melhorar
}

/**
 * Sistema de streaks avançado
 */
export interface AdvancedStreakData {
  currentStreak: number;
  longestStreak: number;
  totalDaysStudied: number;
  streakType: 'daily' | 'weekly' | 'custom';
  streakGoal: number;
  freezeCards: number; // Cartas para "congelar" streak em dias perdidos
  perfectDays: number; // Dias com 100% de acertos
  challengeDays: number; // Dias com meta de estudo atingida
  streakMultiplier: number; // Multiplicador de XP baseado no streak
  lastActivityDate: Timestamp | null; // Data da última atividade
  streakMilestones: Array<{
    milestone: number;
    achievedAt: Timestamp | null;
    reward: string;
  }>;
}

/**
 * Métricas de simulados avançadas
 */
export interface ExamMetrics {
  totalExamsTaken: number;
  averageScore: number | null;
  bestScore: number | null;
  worstScore: number | null;
  improvementRate: number | null; // Taxa de melhoria ao longo do tempo
  examsBySpecialty: Record<string, {
    count: number;
    averageScore: number;
    lastTaken: Timestamp;
    trend: number;
  }>;
  timeManagement: {
    averageTimePerQuestion: number | null;
    timeEfficiencyScore: number | null; // 0-100
    rushRate: number | null; // % de questões respondidas com pressa
  };
  confidenceMetrics: {
    accuracyWhenConfident: number | null;
    accuracyWhenUnsure: number | null;
    overconfidenceRate: number | null;
  };
}

/**
 * Dados de comparação com peers
 */
export interface PeerComparison {
  userPercentile: number; // Percentil do usuário (0-100)
  averagePeerAccuracy: number;
  userAccuracy: number;
  averagePeerStudyTime: number;
  userStudyTime: number;
  strongerThanPeersIn: string[]; // Áreas onde supera os peers
  weakerThanPeersIn: string[]; // Áreas onde está abaixo dos peers
  similarUsers: Array<{
    userId: string;
    similarityScore: number;
    commonStrengths: string[];
    commonWeaknesses: string[];
  }>;
}

/**
 * Sistema de recomendações inteligentes
 */
export interface SmartRecommendations {
  nextTopicsToStudy: Array<{
    filterId: string;
    priority: number; // 0-100
    reason: string;
    estimatedStudyTime: number;
    difficultyLevel: DifficultyLevel;
  }>;
  reviewSchedule: Array<{
    filterId: string;
    scheduledFor: Timestamp;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  studyGoals: Array<{
    type: 'accuracy' | 'time' | 'coverage' | 'retention';
    current: number;
    target: number;
    timeframe: string;
    achievable: boolean;
  }>;
  personalizedInsights: Array<{
    type: 'warning' | 'suggestion' | 'congratulation' | 'insight';
    message: string;
    actionable: boolean;
    priority: number;
  }>;
}

/**
 * Estatísticas principais do usuário com recursos avançados
 */
export interface UserStatistics {
  id: string;
  userId: string;
  
  // Métricas básicas
  totalQuestionsAnswered: number;
  correctAnswers: number;
  overallAccuracy: number | null;
  
  // Análise temporal avançada
  studyTimeAnalysis: StudyTimeAnalysis;
  
  // Métricas de aprendizado
  learningMetrics: LearningMetrics;
  
  // Sistema de streaks avançado
  streakData: AdvancedStreakData;
  
  // Métricas de simulados
  examMetrics: ExamMetrics;
  
  // Estatísticas por filtro/tópico
  filterStatistics: Record<string, FilterStatistics>;
  
  // Comparação com peers
  peerComparison: PeerComparison | null;
  
  // Recomendações inteligentes
  recommendations: SmartRecommendations | null;
  
  // Dados de sessão atual
  currentSession: {
    startTime: Timestamp | null;
    questionsAnswered: number;
    currentAccuracy: number;
    timeSpent: number;
    focusScore: number; // 0-100 baseado em padrões de resposta
  } | null;
  
  // Metadados
  lastCalculated: Timestamp;
  version: string; // Para versionamento de algoritmos
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Payload para atualizações de estatísticas
 */
export interface StatisticsUpdatePayload {
  questionAnswered?: {
    isCorrect: boolean;
    filterId: string;
    difficulty: DifficultyLevel;
    timeSpent: number;
    confidenceLevel?: number; // 1-5
  };
  studyTimeAdded?: {
    minutes: number;
    sessionType: 'questions' | 'flashcards' | 'reading' | 'video';
  };
  examCompleted?: {
    score: number;
    totalQuestions: number;
    timeSpent: number;
    specialty: string;
    examType: string;
  };
  sessionStarted?: {
    startTime: Timestamp;
  };
  sessionEnded?: {
    endTime: Timestamp;
    questionsAnswered: number;
    focusEvents: number; // Número de vezes que saiu de foco
  };
}

/**
 * Opções para consulta de estatísticas
 */
export interface StatisticsQueryOptions {
  includeFilterStats?: boolean;
  includePeerComparison?: boolean;
  includeRecommendations?: boolean;
  forceRecalculate?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
  filterIds?: string[];
}

/**
 * Resultado de análise preditiva
 */
export interface PredictiveAnalysis {
  userId: string;
  predictions: {
    nextWeekPerformance: number;
    examReadiness: Record<string, number>; // specialty -> readiness %
    timeToMastery: Record<string, number>; // filterId -> days
    riskOfBurnout: number; // 0-100
    optimalStudySchedule: Array<{
      date: Date;
      duration: number;
      topics: string[];
      priority: number;
    }>;
  };
  confidence: number; // Confiança nas predições (0-100)
  basedOnDataPoints: number;
  lastAnalysis: Timestamp;
}

export default UserStatistics; 