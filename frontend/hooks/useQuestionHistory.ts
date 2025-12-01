import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

export interface QuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  selected_alternative_id: string;
  selected_alternative_letter?: string;
  is_correct: boolean;
  study_mode: 'normal_list' | 'simulated_exam' | 'unified_review';
  was_focus_mode: boolean;
  attempt_number: number;
  answered_at: string;
}

export interface QuestionStats {
  total_attempts: number;
  correct_attempts: number;
  accuracy_rate: number;
  first_attempt_date: string;
  last_attempt_date: string;
  attempts_by_mode: {
    normal_list: number;
    simulated_exam: number;
    unified_review: number;
  };
  attempts_in_focus_mode: number;
  current_streak: {
    type: 'correct' | 'incorrect';
    count: number;
  };
  most_selected_wrong_alternative?: {
    alternative_id: string;
    count: number;
    percentage: number;
  };
  evolution: 'improving' | 'stable' | 'declining';
  temporal_data: {
    date: string;
    is_correct: boolean;
    attempt_number: number;
  }[];
  error_pattern?: {
    type: 'same_alternative' | 'random' | 'regression';
    description: string;
  };
  global_stats?: {
    total_attempts_all_users: number;
    total_unique_users: number;
    users_correct_first_attempt_percentage: number;
    users_correct_any_attempt_percentage: number;
    global_accuracy_rate: number;
    user_percentile: number;
    alternative_distribution: Record<string, number>;
  };
}

export function useQuestionHistory(questionId: string, statsOnly: boolean = false) {
  const [history, setHistory] = useState<QuestionAttempt[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async (limit?: number) => {
    try {
      setLoading(true);
      const url = limit 
        ? `/questions/${questionId}/history?limit=${limit}`
        : `/questions/${questionId}/history`;
      const response = await fetchWithAuth(url);
      const data = await response.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (includeComparison: boolean = false) => {
    try {
      setLoading(true);
      const url = `/questions/${questionId}/stats${includeComparison ? '?includeComparison=true' : ''}`;
      const response = await fetchWithAuth(url);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (questionId) {
      // Se statsOnly, não carrega automaticamente (stats vêm do contexto pré-carregado)
      // Só carrega se não for statsOnly (modo completo)
      if (!statsOnly) {
        fetchStats();
        fetchHistory();
      }
    }
  }, [questionId, statsOnly]);

  // Recarregar quando a questão é respondida
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes(questionId)) {
        // Aguardar um pouco para o backend processar
        setTimeout(() => {
          fetchHistory();
          fetchStats();
        }, 500);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [questionId]);

  return {
    history,
    stats,
    loading,
    error,
    refetchHistory: () => fetchHistory(),
    refetchStats: (includeComparison?: boolean) => fetchStats(includeComparison),
  };
}
