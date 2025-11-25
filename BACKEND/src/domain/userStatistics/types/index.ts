/**
 * TIPOS LIMPOS E SIMPLIFICADOS PARA ESTATÍSTICAS DE USUÁRIO
 * Apenas métricas acionáveis e úteis
 */

export type Timestamp = string;

/**
 * Estatísticas por especialidade
 */
export interface SpecialtyStatistics {
  specialtyId: string;
  specialtyName: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  firstTimeSuccessRate: number; // % de acertos na primeira tentativa
  questionsByMonth: Record<string, number>; // YYYY-MM -> count
  accuracyByMonth: Record<string, number>; // YYYY-MM -> accuracy
}

/**
 * Estatísticas por universidade/banca
 */
export interface UniversityStatistics {
  universityId: string;
  universityName: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

/**
 * Distribuição temporal de estudo
 */
export interface StudyTimeDistribution {
  byHour: Record<number, number>; // hora (0-23) -> minutos
  byDay: Record<string, number>; // YYYY-MM-DD -> minutos
  byWeek: Record<string, number>; // YYYY-WW -> minutos
  byMonth: Record<string, number>; // YYYY-MM -> minutos
}

/**
 * Dados de streak
 */
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Timestamp | null;
}

/**
 * Revisões por tipo
 */
export interface ReviewsByType {
  questions: number;
  flashcards: number;
  errorNotebook: number;
  total: number;
}

/**
 * Snapshot de estatísticas para comparação temporal
 */
export interface StatisticsSnapshot {
  accuracy: number;
  questionsAnswered: number;
  averageSessionDuration: number;
  timestamp: Timestamp;
}

/**
 * Dados de calendário de calor
 */
export interface HeatmapData {
  date: string; // YYYY-MM-DD
  minutesStudied: number;
  questionsAnswered: number;
  accuracy: number;
}

/**
 * Estatísticas principais do usuário (SIMPLIFICADAS)
 */
export interface UserStatistics {
  id: string;
  userId: string;

  // === MÉTRICAS BÁSICAS ===
  totalQuestionsAnswered: number;
  correctAnswers: number;
  overallAccuracy: number;
  firstTimeSuccessRate: number; // % de questões acertadas na primeira tentativa

  // === TEMPO DE ESTUDO ===
  totalMinutesStudied: number;
  sessionsCount: number;
  averageSessionDuration: number;
  studyTimeDistribution: StudyTimeDistribution;
  averageDailyStudyTime: number; // minutos/dia (últimos 30 dias)

  // === ENGAJAMENTO ===
  streakData: StreakData;
  daysStudiedThisMonth: number;
  daysStudiedByMonth: Record<string, number>; // YYYY-MM -> count

  // === FLASHCARDS E REVISÕES ===
  totalFlashcardsStudied: number;
  totalReviews: number;
  reviewsByType: ReviewsByType;

  // === POR ESPECIALIDADE ===
  statsBySpecialty: Record<string, SpecialtyStatistics>;

  // === POR UNIVERSIDADE ===
  statsByUniversity: Record<string, UniversityStatistics>;

  // === EVOLUÇÃO TEMPORAL ===
  questionsByMonth: Record<string, number>; // YYYY-MM -> count
  accuracyByMonth: Record<string, number>; // YYYY-MM -> accuracy %
  heatmapData: HeatmapData[]; // últimos 90 dias

  // === COMPARAÇÃO TEMPORAL (Você vs Você) ===
  stats30DaysAgo: StatisticsSnapshot | null;
  stats60DaysAgo: StatisticsSnapshot | null;
  stats90DaysAgo: StatisticsSnapshot | null;

  // === METADADOS ===
  lastCalculated: Timestamp;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

/**
 * Ranking de usuário
 */
export interface UserRanking {
  userId: string;
  userName: string;
  userAvatar?: string;
  position: number;
  value: number;
  percentile: number; // 0-100
}

/**
 * Dados de ranking completo
 */
export interface RankingData {
  type: 'accuracy_general' | 'accuracy_specialty' | 'questions_total';
  specialty?: string;
  top20: UserRanking[];
  currentUser: UserRanking;
  totalUsers: number;
}

/**
 * Dados de comparação com outros usuários
 */
export interface ComparisonData {
  metric: string;
  userValue: number;
  averageValue: number;
  medianValue: number;
  percentile: number; // 0-100 (ex: 75 = melhor que 75% dos usuários)
  totalUsers: number;
}

/**
 * Payload para atualização de estatísticas
 */
export interface StatisticsUpdatePayload {
  // Resposta de questão
  questionAnswered?: {
    questionId: string;
    isCorrect: boolean;
    isFirstAttempt: boolean;
    specialtyId: string;
    universityId?: string;
    timeSpent: number; // segundos
  };

  // Tempo de estudo
  studyTimeAdded?: {
    minutes: number;
    date: string; // YYYY-MM-DD
  };

  // Sessão de estudo
  sessionCompleted?: {
    duration: number; // minutos
    questionsAnswered: number;
    date: string; // YYYY-MM-DD
  };

  // Flashcard estudado
  flashcardStudied?: {
    flashcardId: string;
    date: string; // YYYY-MM-DD
  };

  // Revisão realizada
  reviewCompleted?: {
    type: 'questions' | 'flashcards' | 'errorNotebook';
    itemsReviewed: number;
    date: string; // YYYY-MM-DD
  };
}

/**
 * Opções para consulta de estatísticas
 */
export interface StatisticsQueryOptions {
  includeSpecialtyStats?: boolean;
  includeUniversityStats?: boolean;
  includeHeatmap?: boolean;
  includeComparison?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Resposta de estatísticas com comparação
 */
export interface StatisticsWithComparison {
  statistics: UserStatistics;
  comparison?: {
    accuracy: ComparisonData;
    questionsAnswered: ComparisonData;
    studyTime: ComparisonData;
    flashcardsStudied: ComparisonData;
    reviewsCompleted: ComparisonData;
    bySpecialty?: Record<string, ComparisonData>;
  };
}

/**
 * Filtros para rankings
 */
export interface RankingFilters {
  type: 'accuracy_general' | 'accuracy_specialty' | 'questions_total';
  specialty?: string;
  timeRange?: 'all_time' | 'last_30_days' | 'last_90_days' | 'this_year';
}

export default UserStatistics;
