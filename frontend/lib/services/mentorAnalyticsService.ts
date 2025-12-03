import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

/**
 * Serviço de Analytics para Mentores no Frontend
 * Usa fetchWithAuth que automaticamente adiciona /api e o token
 */
class MentorAnalyticsService {
  private baseUrl = '/mentorship/analytics';

  /**
   * Obtém visão geral de analytics do mentor
   */
  async getOverview(): Promise<MentorOverview> {
    const response = await fetchWithAuth(`${this.baseUrl}/overview`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Lista simulados do mentor com estatísticas
   */
  async getSimulados(): Promise<MentorSimuladoSummary[]> {
    const response = await fetchWithAuth(`${this.baseUrl}/simulados`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Obtém estatísticas de um simulado específico
   */
  async getSimuladoStats(simuladoId: string): Promise<SimuladoStats> {
    const response = await fetchWithAuth(`${this.baseUrl}/simulados/${simuladoId}/stats`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Obtém desempenho por especialidade de um simulado
   */
  async getSimuladoSubjects(simuladoId: string): Promise<SubjectPerformance[]> {
    const response = await fetchWithAuth(`${this.baseUrl}/simulados/${simuladoId}/subjects`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Obtém ranking de um simulado
   */
  async getSimuladoRanking(simuladoId: string): Promise<RankingEntry[]> {
    const response = await fetchWithAuth(`${this.baseUrl}/simulados/${simuladoId}/ranking`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Obtém análise detalhada de questões de um simulado
   */
  async getSimuladoQuestions(simuladoId: string): Promise<QuestionAnalysis[]> {
    const response = await fetchWithAuth(`${this.baseUrl}/simulados/${simuladoId}/questions`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Obtém desempenho de um mentorado específico
   */
  async getMenteePerformance(menteeId: string): Promise<MenteePerformanceData> {
    const response = await fetchWithAuth(`${this.baseUrl}/mentees/${menteeId}/performance`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Compara desempenho de múltiplos mentorados em um simulado
   */
  async compareSimuladoPerformance(
    simuladoId: string,
    menteeIds: string[]
  ): Promise<MenteeComparison[]> {
    const response = await fetchWithAuth(`${this.baseUrl}/simulados/${simuladoId}/compare`, {
      method: 'POST',
      body: JSON.stringify({ menteeIds }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }
}

export const mentorAnalyticsService = new MentorAnalyticsService();
export default mentorAnalyticsService;


// ============================================
// TIPOS E INTERFACES
// ============================================

export interface MentorOverview {
  totalSimulados: number;
  activeSimulados: number;
  totalMentees: number;
  activeMentorships: number;
  totalResponses: number;
  totalQuestionsAnswered: number;
  overallAccuracy: number;
  averageScore: number;
}

export interface MentorSimuladoSummary {
  id: string;
  name: string;
  description?: string;
  questionCount: number;
  visibility: string;
  status: string;
  timeLimitMinutes?: number;
  createdAt: string;
  totalRespondents: number;
  averageScore: number;
  averageTimeSeconds: number;
  completionRate: number;
  highestScore: number;
  lowestScore: number;
}

export interface SimuladoStats {
  totalRespondents: number;
  averageScore: number;
  averageTimeSeconds: number;
  completionRate: number;
  highestScore: number;
  lowestScore: number;
}

export interface SubjectPerformance {
  subFilterId: string;
  subFilterName: string;
  filterId: string;
  totalQuestions: number;
  totalAnswered: number;
  correctAnswers: number;
  accuracy: number;
  averageTimeSeconds: number;
}

export interface RankingEntry {
  position: number;
  userId: string;
  userName: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  completedAt: string;
}


export interface QuestionResponse {
  userId: string;
  userName: string;
  selectedOption: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

export interface QuestionAnalysis {
  questionId: string;
  questionTitle: string;
  questionContent: string;
  correctAnswer: string;
  difficulty: number;
  subFilterIds: string[];
  totalResponses: number;
  correctCount: number;
  accuracy: number;
  optionDistribution: Record<string, number>;
  responses: QuestionResponse[];
}

export interface PerformanceEvolution {
  simuladoId: string;
  simuladoName: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  completedAt: string;
}

export interface SpecialtyPerformance {
  filterId: string;
  filterName: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

export interface MenteePerformanceData {
  menteeId: string;
  totalSimulados: number;
  completedSimulados: number;
  averageScore: number;
  evolution: PerformanceEvolution[];
  performanceBySubject: SubjectPerformance[];
  performanceBySpecialty?: SpecialtyPerformance[];
}

export interface MenteeComparison {
  menteeId: string;
  menteeName: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  completedAt: string;
}
