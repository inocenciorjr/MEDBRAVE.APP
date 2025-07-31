import {
  UserStatistics,
  StatisticsUpdatePayload,
  StatisticsQueryOptions,
  PredictiveAnalysis,
  DifficultyLevel,
  StudyPattern
} from '../types';

/**
 * Interface do serviço de estatísticas de usuário com integração SRS avançada
 */
export interface IUserStatisticsService {
  /**
   * Obtém ou cria estatísticas de usuário
   */
  getOrCreateUserStatistics(userId: string, options?: StatisticsQueryOptions): Promise<UserStatistics>;

  /**
   * Atualiza estatísticas do usuário
   */
  updateUserStatistics(userId: string, payload: StatisticsUpdatePayload): Promise<UserStatistics>;

  /**
   * Registra uma resposta de questão com integração SRS
   */
  recordQuestionAnswer(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    options: {
      filterId: string;
      difficulty: DifficultyLevel;
      timeSpent: number;
      confidenceLevel?: number;
      srsQuality?: number; // 0-3 para integração SRS
      reviewType?: 'first_time' | 'review' | 'spaced_repetition';
    }
  ): Promise<UserStatistics>;

  /**
   * Inicia uma sessão de estudo
   */
  startStudySession(userId: string, sessionType: string): Promise<UserStatistics>;

  /**
   * Finaliza uma sessão de estudo
   */
  endStudySession(
    userId: string,
    sessionData: {
      questionsAnswered: number;
      timeSpent: number;
      focusEvents: number;
      topicsStudied: string[];
    }
  ): Promise<UserStatistics>;

  /**
   * Registra tempo de estudo adicional
   */
  recordStudyTime(
    userId: string,
    minutes: number,
    sessionType: 'questions' | 'flashcards' | 'reading' | 'video'
  ): Promise<UserStatistics>;

  /**
   * Registra conclusão de simulado
   */
  recordExamCompletion(
    userId: string,
    examData: {
      score: number;
      totalQuestions: number;
      timeSpent: number;
      specialty: string;
      examType: string;
      questionsCorrect: number;
      confidenceMetrics?: {
        confidentAndCorrect: number;
        confidentAndWrong: number;
        unsureAndCorrect: number;
        unsureAndWrong: number;
      };
    }
  ): Promise<UserStatistics>;

  /**
   * Atualiza streak do usuário
   */
  updateStreak(userId: string, date?: Date): Promise<UserStatistics>;

  /**
   * Recalcula estatísticas avançadas (análise preditiva, comparação com peers)
   */
  recalculateAdvancedMetrics(userId: string): Promise<UserStatistics>;

  /**
   * Gera análise preditiva personalizada
   */
  generatePredictiveAnalysis(userId: string): Promise<PredictiveAnalysis>;

  /**
   * Calcula recomendações inteligentes baseadas em SRS e performance
   */
  generateSmartRecommendations(userId: string): Promise<UserStatistics['recommendations']>;

  /**
   * Identifica padrão de estudo do usuário
   */
  identifyStudyPattern(userId: string): Promise<StudyPattern>;

  /**
   * Calcula nível de mastery de um tópico específico
   */
  calculateTopicMastery(userId: string, filterId: string): Promise<number>;

  /**
   * Obtém rankings de usuários para comparação
   */
  getUserRankings(userId: string, context: 'global' | 'specialty' | 'institution'): Promise<{
    overall: number;
    byTopic: Record<string, number>;
    percentile: number;
  }>;

  /**
   * Identifica gaps de conhecimento baseado em SRS
   */
  identifyKnowledgeGaps(userId: string): Promise<Array<{
    filterId: string;
    severity: number;
    lastReview: Date;
    recommendedReview: Date;
    srsInterval: number;
  }>>;

  /**
   * Calcula eficiência de estudo
   */
  calculateStudyEfficiency(userId: string, timeframe?: string): Promise<{
    timeEfficiency: number;
    retentionEfficiency: number;
    accuracyImprovement: number;
    overallEfficiency: number;
  }>;

  /**
   * Gera insights personalizados baseados em ML
   */
  generatePersonalizedInsights(userId: string): Promise<Array<{
    type: 'warning' | 'suggestion' | 'congratulation' | 'insight';
    message: string;
    actionable: boolean;
    priority: number;
    category: 'performance' | 'time_management' | 'retention' | 'motivation';
  }>>;

  /**
   * Exporta dados para análise externa
   */
  exportUserAnalytics(
    userId: string,
    format: 'json' | 'csv',
    timeRange?: { start: Date; end: Date }
  ): Promise<string>;

  /**
   * Deleta estatísticas de usuário
   */
  deleteUserStatistics(userId: string): Promise<boolean>;
} 