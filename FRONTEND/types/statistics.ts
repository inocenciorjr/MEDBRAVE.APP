/**
 * TIPOS LIMPOS E SIMPLIFICADOS PARA ESTATÍSTICAS DE USUÁRIO
 * Espelhados do backend - apenas métricas acionáveis
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
  firstTimeSuccessRate: number;
  questionsByMonth: Record<string, number>;
  accuracyByMonth: Record<string, number>;
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
  byHour: Record<number, number>;
  byDay: Record<string, number>;
  byWeek: Record<string, number>;
  byMonth: Record<string, number>;
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
  date: string;
  minutesStudied: number;
  questionsAnswered: number;
  accuracy: number;
}

/**
 * Estatísticas principais do usuário
 */
export interface UserStatistics {
  id: string;
  userId: string;

  // Métricas básicas
  totalQuestionsAnswered: number;
  correctAnswers: number;
  overallAccuracy: number;
  firstTimeSuccessRate: number;

  // Tempo de estudo
  totalMinutesStudied: number;
  sessionsCount: number;
  averageSessionDuration: number;
  studyTimeDistribution: StudyTimeDistribution;
  averageDailyStudyTime: number;

  // Engajamento
  streakData: StreakData;
  daysStudiedThisMonth: number;
  daysStudiedByMonth: Record<string, number>;

  // Flashcards e Revisões
  totalFlashcardsStudied: number;
  totalReviews: number;
  reviewsByType: ReviewsByType;

  // Por especialidade
  statsBySpecialty: Record<string, SpecialtyStatistics>;

  // Por universidade
  statsByUniversity: Record<string, UniversityStatistics>;

  // Evolução temporal
  questionsByMonth: Record<string, number>;
  accuracyByMonth: Record<string, number>;
  heatmapData: HeatmapData[];

  // Comparação temporal
  stats30DaysAgo: StatisticsSnapshot | null;
  stats60DaysAgo: StatisticsSnapshot | null;
  stats90DaysAgo: StatisticsSnapshot | null;

  // Metadados
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
  percentile: number;
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
  percentile: number;
  totalUsers: number;
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
 * Payload para registrar resposta de questão
 */
export interface RecordQuestionAnswerPayload {
  questionId: string;
  isCorrect: boolean;
  isFirstAttempt: boolean;
  specialtyId: string;
  universityId?: string;
  timeSpent?: number;
}

/**
 * Payload para registrar tempo de estudo
 */
export interface RecordStudyTimePayload {
  minutes: number;
  date?: string;
}

/**
 * Payload para registrar flashcard
 */
export interface RecordFlashcardPayload {
  flashcardId: string;
  date?: string;
}

/**
 * Payload para registrar revisão
 */
export interface RecordReviewPayload {
  type: 'questions' | 'flashcards' | 'errorNotebook';
  itemsReviewed: number;
  date?: string;
}
