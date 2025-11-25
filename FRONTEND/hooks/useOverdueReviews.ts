import { useState, useEffect } from 'react';
import { unifiedReviewService } from '@/services/unifiedReviewService';

export interface OverdueStats {
  total_overdue: number;
  by_type: Record<string, number>;
  very_overdue: number;
  oldest_overdue_days: number;
}

export interface RescheduleOptions {
  contentTypes?: string[];
  newDate?: string;
  daysToDistribute?: number;
}

export function useOverdueReviews() {
  const [stats, setStats] = useState<OverdueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await unifiedReviewService.getOverdueStats();
      setStats(response.data || response);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar estatísticas');
      console.error('Erro ao buscar estatísticas de revisões atrasadas:', err);
    } finally {
      setLoading(false);
    }
  };

  const rescheduleReviews = async (options: RescheduleOptions) => {
    try {
      setLoading(true);
      setError(null);
      await unifiedReviewService.bulkReschedule({
        contentTypes: options.contentTypes,
        newDate: options.newDate,
        daysToDistribute: options.daysToDistribute,
      });
      await fetchStats(); // Atualizar estatísticas
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao reagendar revisões');
      console.error('Erro ao reagendar revisões:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteReviews = async (options: {
    cardIds?: string[];
    contentTypes?: string[];
    deleteAll?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);
      await unifiedReviewService.bulkDelete({
        cardIds: options.cardIds || [],
        contentTypes: options.contentTypes || [],
        deleteAll: options.deleteAll,
      });
      await fetchStats(); // Atualizar estatísticas
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar revisões');
      console.error('Erro ao deletar revisões:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetProgress = async (options: {
    cardIds?: string[];
    contentTypes?: string[];
  }) => {
    try {
      setLoading(true);
      setError(null);
      await unifiedReviewService.bulkResetProgress({
        cardIds: options.cardIds || [],
        contentTypes: options.contentTypes || [],
      });
      await fetchStats(); // Atualizar estatísticas
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao resetar progresso');
      console.error('Erro ao resetar progresso:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    rescheduleReviews,
    deleteReviews,
    resetProgress,
  };
}
