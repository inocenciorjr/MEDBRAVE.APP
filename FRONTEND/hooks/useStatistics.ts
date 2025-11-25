import { useState, useEffect, useCallback } from 'react';
import { statisticsService } from '../services/statisticsService';
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
 * Hook para gerenciar estatísticas do usuário
 */
export function useStatistics(token: string | null) {
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Buscar estatísticas
   */
  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await statisticsService.getUserStatistics();
      setStatistics(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar estatísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Buscar estatísticas com comparação
   */
  const fetchStatisticsWithComparison = useCallback(async (): Promise<StatisticsWithComparison | null> => {
    setLoading(true);
    setError(null);

    try {
      const data = await statisticsService.getStatisticsWithComparison();
      setStatistics(data.statistics);
      return data;
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar estatísticas');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Registrar resposta de questão
   */
  const recordQuestionAnswer = useCallback(
    async (payload: RecordQuestionAnswerPayload) => {
      try {
        const data = await statisticsService.recordQuestionAnswer(payload);
        setStatistics(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao registrar resposta');
      }
    },
    [],
  );

  /**
   * Registrar tempo de estudo
   */
  const recordStudyTime = useCallback(
    async (payload: RecordStudyTimePayload) => {
      try {
        const data = await statisticsService.recordStudyTime(payload);
        setStatistics(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao registrar tempo');
      }
    },
    [],
  );

  /**
   * Registrar flashcard
   */
  const recordFlashcard = useCallback(
    async (payload: RecordFlashcardPayload) => {
      try {
        const data = await statisticsService.recordFlashcard(payload);
        setStatistics(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao registrar flashcard');
      }
    },
    [],
  );

  /**
   * Registrar revisão
   */
  const recordReview = useCallback(
    async (payload: RecordReviewPayload) => {
      try {
        const data = await statisticsService.recordReview(payload);
        setStatistics(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao registrar revisão');
      }
    },
    [],
  );

  /**
   * Atualizar streak
   */
  const updateStreak = useCallback(async () => {
    try {
      const data = await statisticsService.updateStreak();
      setStatistics(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar streak');
    }
  }, []);

  /**
   * Recalcular estatísticas
   */
  const recalculate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await statisticsService.recalculateStatistics();
      setStatistics(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao recalcular estatísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar estatísticas ao montar
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    loading,
    error,
    fetchStatistics,
    fetchStatisticsWithComparison,
    recordQuestionAnswer,
    recordStudyTime,
    recordFlashcard,
    recordReview,
    updateStreak,
    recalculate,
  };
}

/**
 * Hook para rankings
 */
export function useRankings(token: string | null) {
  const [accuracyRanking, setAccuracyRanking] = useState<RankingData | null>(null);
  const [questionsRanking, setQuestionsRanking] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Buscar ranking de acertos
   */
  const fetchAccuracyRanking = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await statisticsService.getAccuracyRanking();
      setAccuracyRanking(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar ranking');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Buscar ranking por especialidade
   */
  const fetchSpecialtyRanking = useCallback(
    async (specialtyId: string): Promise<RankingData | null> => {
      setLoading(true);
      setError(null);

      try {
        const data = await statisticsService.getSpecialtyAccuracyRanking(
          specialtyId,
        );
        return data;
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar ranking');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Buscar ranking de questões
   */
  const fetchQuestionsRanking = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await statisticsService.getQuestionsRanking();
      setQuestionsRanking(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar ranking');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    accuracyRanking,
    questionsRanking,
    loading,
    error,
    fetchAccuracyRanking,
    fetchSpecialtyRanking,
    fetchQuestionsRanking,
  };
}

/**
 * Hook para comparações
 */
export function useComparison(token: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Buscar comparação de métrica
   */
  const fetchComparison = useCallback(
    async (
      metric: 'accuracy' | 'questions' | 'studyTime' | 'flashcards' | 'reviews',
      specialty?: string,
    ): Promise<ComparisonData | null> => {
      setLoading(true);
      setError(null);

      try {
        const data = await statisticsService.getMetricComparison(
          metric,
          specialty,
        );
        return data;
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar comparação');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    fetchComparison,
  };
}
