import {
    UserStatistics,
    StatisticsUpdatePayload,
    StatisticsQueryOptions,
    StatisticsWithComparison,
    RankingData,
    RankingFilters,
    ComparisonData,
} from '../types';

/**
 * Interface do serviço de estatísticas de usuário
 * Apenas funcionalidades essenciais e acionáveis
 */
export interface IUserStatisticsService {
    /**
     * Obtém ou cria estatísticas de usuário
     */
    getOrCreateUserStatistics(
        userId: string,
        options?: StatisticsQueryOptions,
    ): Promise<UserStatistics>;

    /**
     * Obtém estatísticas com comparação vs outros usuários
     */
    getStatisticsWithComparison(
        userId: string,
        options?: StatisticsQueryOptions,
    ): Promise<StatisticsWithComparison>;

    /**
     * Atualiza estatísticas do usuário
     */
    updateUserStatistics(
        userId: string,
        payload: StatisticsUpdatePayload,
    ): Promise<UserStatistics>;

    /**
     * Registra uma resposta de questão
     */
    recordQuestionAnswer(
        userId: string,
        questionId: string,
        isCorrect: boolean,
        isFirstAttempt: boolean,
        specialtyId: string,
        universityId?: string,
        timeSpent?: number,
    ): Promise<UserStatistics>;

    /**
     * Registra tempo de estudo
     */
    recordStudyTime(
        userId: string,
        minutes: number,
        date?: string,
    ): Promise<UserStatistics>;

    /**
     * Registra flashcard estudado
     */
    recordFlashcardStudied(
        userId: string,
        flashcardId: string,
        date?: string,
    ): Promise<UserStatistics>;

    /**
     * Registra revisão completada
     */
    recordReviewCompleted(
        userId: string,
        type: 'questions' | 'flashcards' | 'errorNotebook',
        itemsReviewed: number,
        date?: string,
    ): Promise<UserStatistics>;

    /**
     * Atualiza streak do usuário
     */
    updateStreak(userId: string, date?: Date): Promise<UserStatistics>;

    /**
     * Obtém ranking geral de acertos
     */
    getAccuracyRanking(
        userId: string,
        filters?: RankingFilters,
    ): Promise<RankingData>;

    /**
     * Obtém ranking de acertos por especialidade
     */
    getSpecialtyAccuracyRanking(
        userId: string,
        specialtyId: string,
        filters?: RankingFilters,
    ): Promise<RankingData>;

    /**
     * Obtém ranking de questões respondidas
     */
    getQuestionsRanking(
        userId: string,
        filters?: RankingFilters,
    ): Promise<RankingData>;

    /**
     * Obtém dados de comparação para uma métrica específica
     */
    getMetricComparison(
        userId: string,
        metric: 'accuracy' | 'questions' | 'studyTime' | 'flashcards' | 'reviews',
        specialty?: string,
    ): Promise<ComparisonData>;

    /**
     * Recalcula todas as estatísticas do usuário
     */
    recalculateStatistics(userId: string): Promise<UserStatistics>;

    /**
     * Atualiza apenas o streak do usuário (mais rápido que recalcular tudo)
     */
    updateStreakOnly(userId: string): Promise<{ currentStreak: number; longestStreak: number; lastActivityDate: string | null }>;

    /**
     * Deleta estatísticas do usuário
     */
    deleteUserStatistics(userId: string): Promise<boolean>;

    /**
     * Obtém dados de tempo de estudo por dia
     */
    getStudyTimeData(
        userId: string,
        days?: number,
    ): Promise<Array<{ date: string; minutes: number; sessions: number }>>;

    // === COMPARAÇÕES GLOBAIS ===

    /**
     * Obtém média global de acertos por mês (com filtro de período opcional)
     */
    getGlobalAccuracyByMonth(startDate?: Date, endDate?: Date): Promise<Array<{ month: string; averageAccuracy: number }>>;

    /**
     * Obtém média global de acertos por especialidade (com filtro de período opcional)
     */
    getGlobalAccuracyBySpecialty(startDate?: Date, endDate?: Date): Promise<Array<{ 
        filterId: string; 
        filterName: string; 
        averageAccuracy: number; 
        totalQuestions: number;
        totalUsers: number;
    }>>;

    /**
     * Obtém média global de acertos por universidade (com filtro de período opcional)
     */
    getGlobalAccuracyByUniversity(startDate?: Date, endDate?: Date): Promise<Array<{ 
        subFilterId: string; 
        universityName: string; 
        averageAccuracy: number; 
        totalQuestions: number;
        totalUsers: number;
    }>>;

    /**
     * Obtém média global de questões respondidas por mês (com filtro de período opcional)
     */
    getGlobalQuestionsPerMonth(startDate?: Date, endDate?: Date): Promise<Array<{ month: string; averageQuestions: number }>>;

    /**
     * Obtém quantidade de questões por especialidade do usuário - por período
     */
    getUserQuestionsBySpecialty(
        userId: string,
        period: 'day' | 'week' | 'month',
        startDate?: Date,
        endDate?: Date
    ): Promise<Array<{ 
        filterId: string; 
        filterName: string; 
        count: number;
        accuracy: number;
    }>>;

    /**
     * Obtém quantidade de questões por universidade do usuário - por período
     */
    getUserQuestionsByUniversity(
        userId: string,
        period: 'day' | 'week' | 'month',
        startDate?: Date,
        endDate?: Date
    ): Promise<Array<{ 
        subFilterId: string; 
        universityName: string; 
        count: number;
        accuracy: number;
    }>>;

    /**
     * Obtém quantidade de questões por subespecialidade do usuário - por período
     */
    getUserQuestionsBySubspecialty(
        userId: string,
        period: 'day' | 'week' | 'month',
        startDate?: Date,
        endDate?: Date
    ): Promise<Array<{ 
        subFilterId: string; 
        subspecialtyName: string; 
        count: number;
        accuracy: number;
    }>>;

    /**
     * Obtém média global de acertos por subespecialidade (com filtro de período opcional)
     */
    getGlobalAccuracyBySubspecialty(startDate?: Date, endDate?: Date): Promise<Array<{ 
        subFilterId: string; 
        subspecialtyName: string; 
        averageAccuracy: number; 
        totalQuestions: number;
        totalUsers: number;
    }>>;
}
