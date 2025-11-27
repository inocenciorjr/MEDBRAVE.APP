import { useState, useEffect, useCallback, useMemo } from 'react';
import { getUserGoals, getTodayStats, upsertUserGoals, UserGoals, UserGoalsInput } from '@/services/userGoalsService';

const DEFAULT_STATS = {
  questions_answered: 0,
  correct_answers: 0,
  accuracy: 0,
};

export function useUserGoals() {
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [todayStats, setTodayStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      const [goalsData, statsData] = await Promise.all([
        getUserGoals(),
        getTodayStats(),
      ]);
      
      setGoals(goalsData);
      setTodayStats(statsData || DEFAULT_STATS);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar metas:', err);
      setError(err.message || 'Erro ao carregar metas');
      setTodayStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveGoals = useCallback(async (newGoals: UserGoalsInput) => {
    try {
      const savedGoals = await upsertUserGoals(newGoals);
      setGoals(savedGoals);
      return savedGoals;
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar metas');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return useMemo(() => ({
    goals,
    todayStats,
    loading,
    error,
    refetch: fetchGoals,
    saveGoals,
  }), [goals, todayStats, loading, error, fetchGoals, saveGoals]);
}
