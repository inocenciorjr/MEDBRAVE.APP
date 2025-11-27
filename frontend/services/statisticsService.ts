import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import type {
  UserStatistics,
  StatisticsWithComparison,
  RankingData,
  ComparisonData,
  RecordQuestionAnswerPayload,
  RecordStudyTimePayload,
  RecordFlashcardPayload,
  RecordReviewPayload,
} from '../types/statistics';

/**
 * Service para consumir API de estatísticas
 */
export class StatisticsService {
  private baseUrl = '/statistics';

  /**
   * Obter estatísticas do usuário
   */
  async getUserStatistics(): Promise<UserStatistics> {
    const response = await fetchWithAuth(this.baseUrl);
    const data = await response.json();
    return data.data;
  }

  /**
   * Obter estatísticas com comparação
   */
  async getStatisticsWithComparison(): Promise<StatisticsWithComparison> {
    const response = await fetchWithAuth(`${this.baseUrl}/with-comparison`);
    const data = await response.json();
    return data.data;
  }

  /**
   * Registrar resposta de questão
   */
  async recordQuestionAnswer(
    payload: RecordQuestionAnswerPayload,
  ): Promise<UserStatistics> {
    const response = await fetchWithAuth(`${this.baseUrl}/question-answer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.data;
  }

  /**
   * Registrar tempo de estudo
   */
  async recordStudyTime(
    payload: RecordStudyTimePayload,
  ): Promise<UserStatistics> {
    const response = await fetchWithAuth(`${this.baseUrl}/study-time`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.data;
  }

  /**
   * Registrar flashcard estudado
   */
  async recordFlashcard(
    payload: RecordFlashcardPayload,
  ): Promise<UserStatistics> {
    const response = await fetchWithAuth(`${this.baseUrl}/flashcard`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.data;
  }

  /**
   * Registrar revisão completada
   */
  async recordReview(
    payload: RecordReviewPayload,
  ): Promise<UserStatistics> {
    const response = await fetchWithAuth(`${this.baseUrl}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.data;
  }

  /**
   * Atualizar streak
   */
  async updateStreak(): Promise<UserStatistics> {
    const response = await fetchWithAuth(`${this.baseUrl}/streak`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
    const data = await response.json();
    return data.data;
  }

  /**
   * Obter ranking geral de acertos
   */
  async getAccuracyRanking(): Promise<RankingData> {
    const response = await fetchWithAuth(`${this.baseUrl}/rankings/accuracy`);
    const data = await response.json();
    return data.data;
  }

  /**
   * Obter ranking por especialidade
   */
  async getSpecialtyAccuracyRanking(
    specialtyId: string,
  ): Promise<RankingData> {
    const response = await fetchWithAuth(
      `${this.baseUrl}/rankings/accuracy/${specialtyId}`
    );
    const data = await response.json();
    return data.data;
  }

  /**
   * Obter ranking de questões
   */
  async getQuestionsRanking(): Promise<RankingData> {
    const response = await fetchWithAuth(`${this.baseUrl}/rankings/questions`);
    const data = await response.json();
    return data.data;
  }

  /**
   * Obter comparação de métrica
   */
  async getMetricComparison(
    metric: 'accuracy' | 'questions' | 'studyTime' | 'flashcards' | 'reviews',
    specialty?: string,
  ): Promise<ComparisonData> {
    const url = specialty
      ? `${this.baseUrl}/comparison/${metric}?specialty=${specialty}`
      : `${this.baseUrl}/comparison/${metric}`;

    const response = await fetchWithAuth(url);
    const data = await response.json();
    return data.data;
  }

  /**
   * Recalcular estatísticas
   */
  async recalculateStatistics(): Promise<UserStatistics> {
    const response = await fetchWithAuth(`${this.baseUrl}/recalculate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const data = await response.json();
    return data.data;
  }

  /**
   * Deletar estatísticas
   */
  async deleteStatistics(): Promise<void> {
    await fetchWithAuth(this.baseUrl, {
      method: 'DELETE',
    });
  }

  /**
   * Obter dados de tempo de estudo por dia
   */
  async getStudyTimeData(days: number = 7): Promise<Array<{ date: string; minutes: number; sessions: number }>> {
    const response = await fetchWithAuth(`${this.baseUrl}/study-time?days=${days}`);
    const data = await response.json();
    return data.data || [];
  }

  // === COMPARAÇÕES GLOBAIS ===

  /**
   * Obter média global de acertos por mês
   */
  async getGlobalAccuracyByMonth(startDate?: Date, endDate?: Date): Promise<Array<{ month: string; averageAccuracy: number }>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const url = `${this.baseUrl}/global/accuracy-by-month${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Obter média global de acertos por especialidade
   */
  async getGlobalAccuracyBySpecialty(startDate?: Date, endDate?: Date): Promise<Array<{ 
    filterId: string; 
    filterName: string; 
    averageAccuracy: number; 
    totalQuestions: number;
    totalUsers: number;
  }>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const url = `${this.baseUrl}/global/accuracy-by-specialty${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Obter questões do usuário por especialidade
   */
  async getUserQuestionsBySpecialty(
    period: 'day' | 'week' | 'month' = 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ 
    filterId: string; 
    filterName: string; 
    count: number;
    accuracy: number;
  }>> {
    const params = new URLSearchParams();
    params.append('period', period);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const url = `${this.baseUrl}/user/questions-by-specialty?${params.toString()}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Obter questões do usuário por universidade (com filtro de período)
   */
  async getUserQuestionsByUniversity(
    period: 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ 
    subFilterId: string; 
    universityName: string; 
    count: number;
    accuracy: number;
  }>> {
    const params = new URLSearchParams();
    params.append('period', period);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const url = `${this.baseUrl}/user/questions-by-university?${params.toString()}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Obter questões do usuário por subespecialidade (com filtro de período)
   */
  async getUserQuestionsBySubspecialty(
    period: 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ 
    subFilterId: string; 
    subspecialtyName: string; 
    count: number;
    accuracy: number;
  }>> {
    const params = new URLSearchParams();
    params.append('period', period);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const url = `${this.baseUrl}/user/questions-by-subspecialty?${params.toString()}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Obter média global de acertos por subespecialidade
   */
  async getGlobalAccuracyBySubspecialty(startDate?: Date, endDate?: Date): Promise<Array<{ 
    subFilterId: string; 
    subspecialtyName: string; 
    averageAccuracy: number;
    totalQuestions: number;
    totalUsers: number;
  }>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const url = `${this.baseUrl}/global/accuracy-by-subspecialty?${params.toString()}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Obter média global de acertos por universidade
   */
  async getGlobalAccuracyByUniversity(startDate?: Date, endDate?: Date): Promise<Array<{ 
    subFilterId: string; 
    universityName: string; 
    averageAccuracy: number; 
    totalQuestions: number;
    totalUsers: number;
  }>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const url = `${this.baseUrl}/global/accuracy-by-university${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();
    return data.data || [];
  }
}

// Exportar instância singleton
export const statisticsService = new StatisticsService();
