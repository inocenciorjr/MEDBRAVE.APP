import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

// Types defined in the backend (ensure these match the actual backend response structure)
// It's recommended to share types between backend and frontend if possible

export interface UserStatistics {
  id: string;
  user_id: string;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  overallAccuracy: number; // 0.0 to 1.0
  studyTimeAnalysis: StudyTimeAnalysis;
  learningMetrics: LearningMetrics;
  streakData: AdvancedStreakData;
  examMetrics: ExamMetrics;
  filterStatistics: Record<string, FilterStatistics>; // Key is filterId
  peerComparison: PeerComparison | null; // Can be null if not calculated
  recommendations: SmartRecommendations | null; // Can be null if not calculated
  currentSession: CurrentSession | null;
  lastCalculated: Date | string; // Backend might send ISO string
  version: string;
  created_at: Date | string;
  updated_at: Date | string;
  
  // Additional computed properties for frontend
  bestPerformingArea?: { name: string; accuracy: number; };
  worstPerformingArea?: { name: string; accuracy: number; };
  studyPattern?: StudyPattern | string;
  smartRecommendations?: {
    insights: string[];
    recommendedTopics: string[];
  };
}

export interface StudyTimeAnalysis {
  totalMinutesStudied: number;
  sessionsCount: number;
  averageSessionDuration: number; // minutes
  longestSession: number; // minutes
  shortestSession: number; // minutes
  preferredTimeSlots: Array<{ hour: number; frequency: number; averagePerformance: number | null }>;
  weeklyDistribution: Record<string, number>; // e.g., { mon: 120, tue: 90, ... }
  monthlyTrend: Array<{ month: string; minutesStudied: number; questionsAnswered: number; accuracy: number }>;
  studyPattern: StudyPattern | null;
  consistencyScore: number; // 0-100
}

export interface LearningMetrics {
  totalXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  accuracyTrend: Array<{ date: Date | string; accuracy: number; questionsAnswered: number }>;
  learningVelocity: number | null;
  retentionCurve: Array<{ date: Date | string; retentionRate: number }>;
  knowledgeGaps: string[]; // List of filterIds identified as gaps
  strengths: string[]; // List of filterIds identified as strengths
  weaknesses: string[]; // List of filterIds identified as weaknesses
}

export interface AdvancedStreakData {
  currentStreak: number;
  longestStreak: number;
  totalDaysStudied: number;
  streakType: 'daily' | 'weekly';
  streakGoal: number;
  freezeCards: number;
  perfectDays: number;
  challengeDays: number;
  streakMultiplier: number;
  streakMilestones: Array<{ milestone: number; achievedAt: Date | string | null; reward: string }>;
  lastActivityDate?: Date | string | null; // Added from backend refactor
}

export interface ExamMetrics {
  totalExamsTaken: number;
  averageScore: number; // Percentage
  bestScore: number; // Percentage
  worstScore: number; // Percentage
  improvementRate: number | null;
  examsBySpecialty: Record<string, { count: number; averageScore: number; lastTaken: Date | string | null; trend: number | null }>;
  timeManagement: { averageTimePerQuestion: number | null; timeEfficiencyScore: number | null; rushRate: number | null };
  confidenceMetrics: { accuracyWhenConfident: number | null; accuracyWhenUnsure: number | null; overconfidenceRate: number | null };
}

export interface FilterStatistics {
  filterId: string;
  filterName: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number; // 0.0 to 1.0
  averageTimePerQuestion: number | null; // seconds
  difficultyDistribution: Record<string, number>; // e.g., { BEGINNER: 10, INTERMEDIATE: 5 }
  lastStudied: Date | string | null;
  masteryLevel: number | null; // 0-100
  retentionRate: number | null; // 0-100
  improvementTrend: number | null;
  predictedPerformance: number | null; // 0-100
}

export interface PeerComparison {
  userPercentile: number | null;
  averagePeerAccuracy: number | null;
  userAccuracy: number;
  averagePeerStudyTime: number | null;
  userStudyTime: number;
  strongerThanPeersIn: string[];
  weakerThanPeersIn: string[];
  similarUsers: Array<{ user_id: string; similarity: number }>;
}

export interface SmartRecommendations {
  nextTopicsToStudy: Array<{ filterId: string; priority: number; reason: string; estimatedTime: number | null }>;
  reviewSchedule: Array<{ contentId: string; reviewDate: Date | string; priority: number }>;
  studyGoals: Array<{ type: string; target: number; current: number; deadline: Date | string | null }>;
  personalizedInsights: Array<{
    type: 'warning' | 'suggestion' | 'congratulation' | 'insight';
    message: string;
    actionable: boolean;
    priority: number;
    category: 'performance' | 'time_management' | 'retention' | 'motivation';
  }>;
}

export interface CurrentSession {
  id: string;
  startTime: Date | string;
  type: string;
  questionsAnswered: number;
  currentAccuracy: number; // Percentage
  timeSpent: number; // seconds
  focusScore: number; // 0-100
}

export enum StudyPattern {
  CONSISTENT_DAILY = 'consistent_daily',
  MORNING_BIRD = 'morning_bird',
  NIGHT_OWL = 'night_owl',
  WEEKEND_WARRIOR = 'weekend_warrior',
  MARATHON_LEARNER = 'marathon_learner',
  SPRINT_LEARNER = 'sprint_learner'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

// --- Data types for specific backend endpoints ---

export interface SpecialtyPerformanceData {
  [specialtyName: string]: {
    total: number;
    correct: number;
    accuracy: number; // Percentage
  };
}

export interface PerformanceHistoryData {
  total: number;
  correct: number;
  accuracy: number; // Percentage
  date: string; // YYYY-MM-DD
}

export interface StudyTimeData {
  totalMinutesStudied: number;
  sessionsCount: number;
  averageSessionDuration: number; // minutes
  longestSession: number; // minutes
  shortestSession: number; // minutes
  consistencyScore: number; // 0-100
  
  // Additional properties for frontend compatibility
  totalMinutes?: number; // alias for totalMinutesStudied
  sessions?: number; // alias for sessionsCount
  goalMinutes?: number; // study goal in minutes
}

// --- Refactored Service ---

/**
 * Serviço de Estatísticas do Usuário - Frontend (Refatorado)
 * Conecta-se aos endpoints do backend para buscar dados reais.
 * Remove toda a lógica de simulação e transformação de dados que existia anteriormente.
 */
class UserStatisticsService {
  private readonly baseApiUrl = '/api'; // Base URL for API calls

  /**
   * Converte strings de data ISO recebidas da API em objetos Date.
   * Percorre recursivamente o objeto de dados.
   */
  private parseDates<T>(data: T): T {
    if (!data) return data;

    if (typeof data === 'string') {
      // Basic check for ISO date format (YYYY-MM-DDTHH:mm:ss.sssZ)
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
      if (isoDateRegex.test(data)) {
        const date = new Date(data);
        // Check if the date is valid before returning
        if (!isNaN(date.getTime())) {
          return date as any;
        }
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.parseDates(item)) as any;
    }

    if (typeof data === 'object') {
      const transformed: { [key: string]: any } = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          transformed[key] = this.parseDates((data as any)[key]);
        }
      }
      return transformed as T;
    }

    return data;
  }

  /**
   * Busca as estatísticas principais do usuário no endpoint dedicado.
   * Inclui opções para solicitar dados adicionais como recomendações.
   */
  /**
   * Compute missing properties for frontend compatibility
   */
  private computeAdditionalProperties(stats: UserStatistics): UserStatistics {
    // Compute best and worst performing areas from filterStatistics
    const filterStats = Object.values(stats.filterStatistics || {});
    if (filterStats.length > 0) {
      const sortedByAccuracy = filterStats.sort((a, b) => b.accuracy - a.accuracy);
      
      stats.bestPerformingArea = {
        name: sortedByAccuracy[0]?.filterName || 'N/A',
        accuracy: sortedByAccuracy[0]?.accuracy || 0
      };
      
      stats.worstPerformingArea = {
        name: sortedByAccuracy[sortedByAccuracy.length - 1]?.filterName || 'N/A',
        accuracy: sortedByAccuracy[sortedByAccuracy.length - 1]?.accuracy || 0
      };
    }
    
    // Map study pattern from StudyTimeAnalysis
    stats.studyPattern = stats.studyTimeAnalysis?.studyPattern || 'indefinido';
    
    // Create smartRecommendations from existing recommendations
    if (stats.recommendations?.personalizedInsights) {
      stats.smartRecommendations = {
        insights: stats.recommendations.personalizedInsights.map(insight => insight.message),
        recommendedTopics: stats.recommendations.nextTopicsToStudy?.map(topic => topic.filterId) || []
      };
    }
    
    return stats;
  }

  async getUserStatistics(user_id: string, options?: {
    includeFilterStats?: boolean; // Backend handles filtering based on its logic
    includePeerComparison?: boolean;
    includeRecommendations?: boolean;
    forceRecalculate?: boolean; // Option to trigger backend recalculation
  }): Promise<UserStatistics> {
    try {
      console.log(`📊 [Frontend Service] Fetching main statistics for user ${user_id} with options:`, options);
      // Construct query parameters based on options
      const queryParams = new URLSearchParams();
      if (options?.includePeerComparison) queryParams.append('includePeerComparison', 'true');
      if (options?.includeRecommendations) queryParams.append('includeRecommendations', 'true');
      if (options?.forceRecalculate) queryParams.append('forceRecalculate', 'true');

      // Use the specific user statistics endpoint from the refactored backend
      const url = `${this.baseApiUrl}/user/${user_id}/statistics?${queryParams.toString()}`;
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ [Frontend Service] Error fetching main statistics: ${response.status}`, errorData);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorData.error || 'Failed to fetch statistics'}`);
      }

      const statsData = await response.json();
      console.log('✅ [Frontend Service] Received main statistics:', statsData);

      // Ensure the response structure matches expectations
      if (!statsData || typeof statsData !== 'object') {
         throw new Error('Invalid statistics data received from backend');
      }

      // Parse dates and compute additional properties before returning
      const parsedStats = this.parseDates(statsData as UserStatistics);
      return this.computeAdditionalProperties(parsedStats);

    } catch (error) {
      console.error('❌ [Frontend Service] Exception in getUserStatistics:', error);
      // Re-throw the error so the component can handle it (e.g., show error message)
      throw error;
    }
  }

  /**
   * Busca dados de performance por especialidade.
   */
  async getSpecialtyPerformance(user_id: string): Promise<SpecialtyPerformanceData> {
    try {
      console.log(`🏥 [Frontend Service] Fetching specialty performance for user ${user_id}`);
      const url = `${this.baseApiUrl}/dashboard/specialty-performance/${user_id}`;
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ [Frontend Service] Error fetching specialty performance: ${response.status}`, errorData);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorData.error || 'Failed to fetch specialty performance'}`);
      }

      const result = await response.json();
      console.log('✅ [Frontend Service] Received specialty performance:', result.data);
      if (!result.success || !result.data) {
          throw new Error('Backend indicated failure or missing data for specialty performance');
      }
      return result.data as SpecialtyPerformanceData;

    } catch (error) {
      console.error('❌ [Frontend Service] Exception in getSpecialtyPerformance:', error);
      throw error;
    }
  }

  /**
   * Busca histórico de performance (diário).
   */
  async getPerformanceHistory(user_id: string, days: number = 30): Promise<PerformanceHistoryData[]> {
    try {
      console.log(`📈 [Frontend Service] Fetching performance history for user ${user_id} (last ${days} days)`);
      const url = `${this.baseApiUrl}/dashboard/performance-history/${user_id}?days=${days}`;
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ [Frontend Service] Error fetching performance history: ${response.status}`, errorData);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorData.error || 'Failed to fetch performance history'}`);
      }

      const result = await response.json();
       console.log('✅ [Frontend Service] Received performance history:', result.data);
      if (!result.success || !result.data) {
          throw new Error('Backend indicated failure or missing data for performance history');
      }
      // Dates are already strings (YYYY-MM-DD) from this endpoint
      return result.data as PerformanceHistoryData[];

    } catch (error) {
      console.error('❌ [Frontend Service] Exception in getPerformanceHistory:', error);
      throw error;
    }
  }

  /**
   * Busca dados consolidados de tempo de estudo.
   */
  async getStudyTimeData(user_id: string): Promise<StudyTimeData> {
    try {
      console.log(`⏱️ [Frontend Service] Fetching study time data for user ${user_id}`);
      const url = `${this.baseApiUrl}/dashboard/study-time/${user_id}`;
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ [Frontend Service] Error fetching study time data: ${response.status}`, errorData);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorData.error || 'Failed to fetch study time data'}`);
      }

      const result = await response.json();
      console.log('✅ [Frontend Service] Received study time data:', result.data);
       if (!result.success || !result.data) {
          throw new Error('Backend indicated failure or missing data for study time data');
      }
      const studyTimeData = result.data as StudyTimeData;
      
      // Add computed properties for backward compatibility
      studyTimeData.totalMinutes = studyTimeData.totalMinutesStudied;
      studyTimeData.sessions = studyTimeData.sessionsCount;
      studyTimeData.goalMinutes = 300; // Default goal of 5 hours (300 minutes)
      
      return studyTimeData;

    } catch (error) {
      console.error('❌ [Frontend Service] Exception in getStudyTimeData:', error);
      throw error;
    }
  }

  /**
   * Solicita ao backend para recalcular métricas (operação potencialmente longa).
   */
  async triggerMetricsRecalculation(user_id: string): Promise<UserStatistics> {
    try {
      console.log(`🔄 [Frontend Service] Triggering metrics recalculation for user ${user_id}`);
      // Use the main statistics endpoint with the forceRecalculate flag
      const recalculatedStats = await this.getUserStatistics(user_id, { forceRecalculate: true });
      console.log('✅ [Frontend Service] Metrics recalculation completed, received updated stats.');
      return recalculatedStats;
    } catch (error) {
      console.error('❌ [Frontend Service] Exception triggering metrics recalculation:', error);
      throw error;
    }
  }

  /**
   * Exporta dados do usuário (solicita ao backend).
   */
  async exportUserData(user_id: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      console.log(`📤 [Frontend Service] Requesting user data export for user ${user_id} in ${format} format`);
      // Assuming the backend provides an export endpoint
      const url = `${this.baseApiUrl}/users/${user_id}/statistics/export?format=${format}`;
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        const errorData = await response.text().catch(() => 'Failed to read error response');
        console.error(`❌ [Frontend Service] Error exporting user data: ${response.status}`, errorData);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorData || 'Failed to export data'}`);
      }

      const data = await response.text();
      console.log(`✅ [Frontend Service] User data export received (${format}).`);
      return data;
    } catch (error) {
      console.error('❌ [Frontend Service] Exception exporting user data:', error);
      throw error;
    }
  }

  // --- Métodos que foram removidos ou simplificados --- 
  // A lógica de cálculo/geração agora reside no backend.
  // - generateAdvancedInsights
  // - generatePredictiveAnalysis
  // - generateSmartRecommendations
  // - calculateStudyEfficiency
  // - identifyKnowledgeGaps
  // - getUserRankings
  // - identifyStudyPattern
  // - getPersonalizedInsights
  // - recalculateMetrics (agora triggerMetricsRecalculation)
  // - calculateStudyPattern (removido, backend calcula)
}

export const userStatisticsService = new UserStatisticsService();
export default userStatisticsService;

