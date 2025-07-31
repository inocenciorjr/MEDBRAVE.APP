import { Timestamp } from 'firebase-admin/firestore';
// import { QuestionRetentionRecord, LearningPhase } from './retention';
import { LearningPhase } from './retention';
// import { ListCompletionStatistics, PerformancePrediction } from './statistics';

/**
 * Pontos de acesso ao dashboard de retenção
 */
export enum DashboardAccessPoint {
  MAIN_MENU = 'MAIN_MENU',                    // Menu principal: "Meu Desempenho"
  POST_LIST = 'POST_LIST',                    // Pós-lista: versão resumida
  FSRS_VIEW = 'FSRS_VIEW',                    // FSRS: focada em revisões
  QUESTION_DETAIL = 'QUESTION_DETAIL'        // Por questão: histórico individual
}

/**
 * Configuração de visualização do dashboard
 */
export interface DashboardViewConfig {
  accessPoint: DashboardAccessPoint;
  showDetailedAnalysis: boolean;
  showPredictions: boolean;
  showRecommendations: boolean;
  timeframe?: 'WEEK' | 'MONTH' | 'QUARTER' | 'ALL';
}

/**
 * Dashboard principal de retenção (Menu Principal)
 */
export interface MainRetentionDashboard {
  overview: {
    totalQuestionsTracked: number;
    masteredQuestions: number;
    decliningQuestions: number;
    learningQuestions: number;
    inconsistentQuestions: number;
  };
  
  // Gráfico de retenção ao longo do tempo
  retentionTrend: Array<{
    date: string;                             // "2025-01-15"
    retentionRate: number;                    // 0.75
    questionsAnswered: number;
  }>;
  
  // Lista de questões em declínio (alertas)
  decliningQuestions: Array<{
    questionId: string;
    questionTitle: string;
    learningPattern: {
      phase: LearningPhase;
      patternMessage: string;
      recommendation: string;
    };
    lastAttempt: Timestamp;
    retentionRate: number;
  }>;
  
  // Questões dominadas recentemente
  recentlyMastered: Array<{
    questionId: string;
    questionTitle: string;
    masteredAt: Timestamp;
    attemptsToMaster: number;
  }>;
  
  // Padrões de estudo identificados
  studyPatterns: {
    bestTimeOfDay: string;
    worstTimeOfDay: string;
    averageSessionLength: number;
    optimalBreakInterval: number;
  };
  
  // Alertas de regressão
  regressionAlerts: Array<{
    questionId: string;
    questionTitle: string;
    message: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  
  // Recomendações de foco
  focusRecommendations: Array<{
    area: string;
    questionsCount: number;
    avgRetentionRate: number;
    recommendation: string;
  }>;
}

/**
 * Dashboard resumido pós-lista
 */
export interface PostListRetentionSummary {
  listId: string;
  
  // Retenção específica desta lista
  listRetention: {
    questionsSeenBefore: number;
    questionsImproved: number;
    questionsRegressed: number;
    newQuestionsLearned: number;
  };
  
  // Questões que regrediu
  regressionHighlights: Array<{
    questionId: string;
    previousCorrect: boolean;
    currentCorrect: boolean;
    message: string;
  }>;
  
  // Questões que melhorou
  improvementHighlights: Array<{
    questionId: string;
    previousCorrect: boolean;
    currentCorrect: boolean;
    message: string;
  }>;
  
  // Link para dashboard completo
  fullDashboardUrl: string;
}

/**
 * Dashboard focado em revisões FSRS
 */
export interface FSRSRetentionView {
  // Histórico de revisões FSRS
  reviewHistory: Array<{
    date: Timestamp;
    totalReviews: number;
    averageGrade: number;
    retentionRate: number;
  }>;
  
  // Performance por tipo de conteúdo
  contentTypePerformance: Array<{
    contentType: string;                      // "Cardiologia", "Neurologia"
    totalCards: number;
    averageRetention: number;
    averageInterval: number;
  }>;
  
  // Tendências de retenção no FSRS
  fsrsTrends: {
    retentionTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    intervalTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
    difficultyTrend: 'EASIER' | 'STABLE' | 'HARDER';
  };
  
  // Cards com problemas
  problematicCards: Array<{
    questionId: string;
    difficulty: number;
    stability: number;
    lastGrade: number;
    issue: 'LOW_RETENTION' | 'FREQUENT_LAPSES' | 'DIFFICULTY_SPIKE';
  }>;
}

/**
 * Histórico individual de questão
 */
export interface QuestionRetentionHistory {
  questionId: string;
  questionTitle: string;
  
  // Timeline de tentativas
  timeline: Array<{
    date: Timestamp;
    correct: boolean;
    context: string;
    responseTime: number;
    confidence?: string;
  }>;
  
  // Análise de padrão específico
  patternAnalysis: {
    phase: LearningPhase;
    turningPoint?: Timestamp;
    consistencyScore: number;
    improvementRate: number;
  };
  
  // Recomendações individuais
  individualRecommendations: Array<{
    type: 'STUDY_TIMING' | 'REVIEW_FREQUENCY' | 'FOCUS_AREA';
    message: string;
    actionable: boolean;
  }>;
  
  // Comparação com média do usuário
  comparison: {
    userAverageRetention: number;
    thisQuestionRetention: number;
    relativeDifficulty: 'EASIER' | 'AVERAGE' | 'HARDER';
  };
}

/**
 * Widget de predição de performance
 */
export interface PerformancePredictionWidget {
  // Predição para próxima lista
  nextListPrediction: {
    expectedAccuracy: number;
    confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    basedOnSessions: number;
  };
  
  // Explicação da metodologia
  methodology: {
    factorsConsidered: string[];
    dataPoints: number;
    algorithm: string;
  };
  
  // Tendências identificadas
  identifiedTrends: Array<{
    trend: string;
    direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  
  // Recomendações de timing
  timingRecommendations: {
    bestStudyTime: string;
    optimalSessionLength: number;
    recommendedBreaks: number;
  };
  
  // Áreas de foco sugeridas
  suggestedFocusAreas: Array<{
    area: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  }>;
}

/**
 * Configurações do dashboard
 */
export interface DashboardSettings {
  userId: string;
  
  // Preferências de visualização
  viewPreferences: {
    defaultTimeframe: 'WEEK' | 'MONTH' | 'QUARTER' | 'ALL';
    showPredictions: boolean;
    showDetailedAnalysis: boolean;
    compactMode: boolean;
  };
  
  // Alertas e notificações
  alertSettings: {
    enableRegressionAlerts: boolean;
    enableMasteryNotifications: boolean;
    enableStudyReminders: boolean;
    alertThreshold: number;               // 0-1 (limite de retenção para alertar)
  };
  
  // Personalização
  customization: {
    favoriteMetrics: string[];
    hiddenSections: string[];
    customTimeframes: Array<{
      name: string;
      days: number;
    }>;
  };
  
  updatedAt: Timestamp;
}

/**
 * Payload para busca de dados do dashboard
 */
export interface DashboardDataRequest {
  userId: string;
  accessPoint: DashboardAccessPoint;
  config: DashboardViewConfig;
  filters?: {
    questionIds?: string[];
    learningPhases?: LearningPhase[];
    dateRange?: {
      start: Timestamp;
      end: Timestamp;
    };
  };
}

/**
 * Resposta unificada do dashboard
 */
export interface DashboardResponse {
  accessPoint: DashboardAccessPoint;
  generatedAt: Timestamp;
  
  // Dados específicos baseado no ponto de acesso
  mainDashboard?: MainRetentionDashboard;
  postListSummary?: PostListRetentionSummary;
  fsrsView?: FSRSRetentionView;
  questionHistory?: QuestionRetentionHistory;
  
  // Widgets opcionais
  predictionWidget?: PerformancePredictionWidget;
  
  // Metadados
  dataFreshness: {
    lastCalculated: Timestamp;
    nextUpdate: Timestamp;
    cacheHit: boolean;
  };
} 