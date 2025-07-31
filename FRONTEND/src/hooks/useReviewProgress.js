import { useState, useEffect, useCallback, useContext } from 'react';
import { useAuth, AuthContext } from '../contexts/AuthContext';

/**
 * Hook personalizado para gerenciar progresso e estatísticas de revisão
 * Calcula métricas de desempenho e acompanha metas de estudo
 */
export const useReviewProgress = () => {
  // Verificar se o AuthContext está disponível antes de usar useAuth
  const authContext = useContext(AuthContext);
  const { user } = authContext ? useAuth() : { user: null };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dailyProgress, setDailyProgress] = useState({
    reviewsCompleted: 0,
    reviewsTarget: 50,
    timeSpent: 0,
    timeTarget: 3600, // 1 hora em segundos
    accuracy: 0,
    streak: 0
  });
  const [weeklyProgress, setWeeklyProgress] = useState({
    reviewsCompleted: 0,
    reviewsTarget: 350,
    timeSpent: 0,
    timeTarget: 25200, // 7 horas em segundos
    averageAccuracy: 0,
    daysActive: 0
  });
  const [monthlyProgress, setMonthlyProgress] = useState({
    reviewsCompleted: 0,
    reviewsTarget: 1500,
    timeSpent: 0,
    timeTarget: 108000, // 30 horas em segundos
    averageAccuracy: 0,
    daysActive: 0
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [performanceHistory, setPerformanceHistory] = useState([]);

  // Carregar progresso diário
  const loadDailyProgress = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Simular dados - em produção, viria da API
      const today = new Date().toISOString().split('T')[0];
      const mockDailyData = {
        reviewsCompleted: Math.floor(Math.random() * 60),
        reviewsTarget: 50,
        timeSpent: Math.floor(Math.random() * 7200),
        timeTarget: 3600,
        accuracy: Math.floor(Math.random() * 30) + 70,
        streak: Math.floor(Math.random() * 15) + 1
      };
      
      setDailyProgress(mockDailyData);
    } catch (err) {
      console.error('Erro ao carregar progresso diário:', err);
      setError('Erro ao carregar progresso diário');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Carregar progresso semanal
  const loadWeeklyProgress = useCallback(async () => {
    if (!user) return;
    
    try {
      const mockWeeklyData = {
        reviewsCompleted: Math.floor(Math.random() * 400),
        reviewsTarget: 350,
        timeSpent: Math.floor(Math.random() * 30000),
        timeTarget: 25200,
        averageAccuracy: Math.floor(Math.random() * 20) + 75,
        daysActive: Math.floor(Math.random() * 7) + 1
      };
      
      setWeeklyProgress(mockWeeklyData);
    } catch (err) {
      console.error('Erro ao carregar progresso semanal:', err);
      setError('Erro ao carregar progresso semanal');
    }
  }, [user]);

  // Carregar progresso mensal
  const loadMonthlyProgress = useCallback(async () => {
    if (!user) return;
    
    try {
      const mockMonthlyData = {
        reviewsCompleted: Math.floor(Math.random() * 1800),
        reviewsTarget: 1500,
        timeSpent: Math.floor(Math.random() * 120000),
        timeTarget: 108000,
        averageAccuracy: Math.floor(Math.random() * 15) + 80,
        daysActive: Math.floor(Math.random() * 30) + 1
      };
      
      setMonthlyProgress(mockMonthlyData);
    } catch (err) {
      console.error('Erro ao carregar progresso mensal:', err);
      setError('Erro ao carregar progresso mensal');
    }
  }, [user]);

  // Carregar sessões recentes
  const loadRecentSessions = useCallback(async () => {
    if (!user) return;
    
    try {
      // Simular dados de sessões recentes
      const mockSessions = Array.from({ length: 5 }, (_, i) => ({
        id: `session-${i}`,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        reviewsCompleted: Math.floor(Math.random() * 30) + 10,
        timeSpent: Math.floor(Math.random() * 3600) + 600,
        accuracy: Math.floor(Math.random() * 30) + 70,
        type: ['flashcards', 'questions', 'mixed'][Math.floor(Math.random() * 3)]
      }));
      
      setRecentSessions(mockSessions);
    } catch (err) {
      console.error('Erro ao carregar sessões recentes:', err);
      setError('Erro ao carregar sessões recentes');
    }
  }, [user]);

  // Carregar histórico de performance
  const loadPerformanceHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      // Simular dados de histórico (últimos 30 dias)
      const mockHistory = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        return {
          date: date.toISOString().split('T')[0],
          reviewsCompleted: Math.floor(Math.random() * 60),
          accuracy: Math.floor(Math.random() * 30) + 70,
          timeSpent: Math.floor(Math.random() * 7200)
        };
      }).reverse();
      
      setPerformanceHistory(mockHistory);
    } catch (err) {
      console.error('Erro ao carregar histórico de performance:', err);
      setError('Erro ao carregar histórico de performance');
    }
  }, [user]);

  // Atualizar progresso após sessão
  const updateProgressAfterSession = useCallback(async (sessionData) => {
    try {
      const { reviewsCompleted, timeSpent, accuracy } = sessionData;
      
      // Atualizar progresso diário
      setDailyProgress(prev => ({
        ...prev,
        reviewsCompleted: prev.reviewsCompleted + reviewsCompleted,
        timeSpent: prev.timeSpent + timeSpent,
        accuracy: Math.round((prev.accuracy + accuracy) / 2) // Média simples
      }));
      
      // Recarregar dados para sincronizar
      await Promise.all([
        loadWeeklyProgress(),
        loadMonthlyProgress(),
        loadRecentSessions()
      ]);
      
      return true;
    } catch (err) {
      console.error('Erro ao atualizar progresso:', err);
      setError('Erro ao atualizar progresso');
      return false;
    }
  }, [loadWeeklyProgress, loadMonthlyProgress, loadRecentSessions]);

  // Calcular porcentagens de progresso
  const getDailyProgressPercentage = useCallback(() => {
    return Math.min(Math.round((dailyProgress.reviewsCompleted / dailyProgress.reviewsTarget) * 100), 100);
  }, [dailyProgress]);

  const getWeeklyProgressPercentage = useCallback(() => {
    return Math.min(Math.round((weeklyProgress.reviewsCompleted / weeklyProgress.reviewsTarget) * 100), 100);
  }, [weeklyProgress]);

  const getMonthlyProgressPercentage = useCallback(() => {
    return Math.min(Math.round((monthlyProgress.reviewsCompleted / monthlyProgress.reviewsTarget) * 100), 100);
  }, [monthlyProgress]);

  // Formatar tempo
  const formatTime = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  // Recarregar todos os dados
  const refresh = useCallback(async () => {
    await Promise.all([
      loadDailyProgress(),
      loadWeeklyProgress(),
      loadMonthlyProgress(),
      loadRecentSessions(),
      loadPerformanceHistory()
    ]);
  }, [loadDailyProgress, loadWeeklyProgress, loadMonthlyProgress, loadRecentSessions, loadPerformanceHistory]);

  // Carregar dados iniciais
  useEffect(() => {
    if (user) {
      refresh();
    }
  }, [user, refresh]);

  return {
    // Estado
    loading,
    error,
    dailyProgress,
    weeklyProgress,
    monthlyProgress,
    recentSessions,
    performanceHistory,
    
    // Ações
    loadDailyProgress,
    loadWeeklyProgress,
    loadMonthlyProgress,
    loadRecentSessions,
    loadPerformanceHistory,
    updateProgressAfterSession,
    refresh,
    
    // Utilitários
    getDailyProgressPercentage,
    getWeeklyProgressPercentage,
    getMonthlyProgressPercentage,
    formatTime,
    
    // Status
    isDailyGoalMet: dailyProgress.reviewsCompleted >= dailyProgress.reviewsTarget,
    isWeeklyGoalMet: weeklyProgress.reviewsCompleted >= weeklyProgress.reviewsTarget,
    isMonthlyGoalMet: monthlyProgress.reviewsCompleted >= monthlyProgress.reviewsTarget
  };
};

export default useReviewProgress;