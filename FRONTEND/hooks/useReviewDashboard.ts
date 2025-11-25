import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

export interface ReviewDashboard {
  total_due: number;
  completed_today: number;
  estimated_time_minutes: number;
  days_until_exam: number | null;
  breakdown: {
    questions: number;
    flashcards: number;
    errors: number;
  };
  state_breakdown: {
    new: number;
    learning: number;
    review: number;
    relearning: number;
  };
  study_mode: 'intensive' | 'balanced' | 'relaxed';
  max_interval_days: number;
}

export function useReviewDashboard() {
  const [dashboard, setDashboard] = useState<ReviewDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/unified-reviews/dashboard');
      const json = await response.json().catch(() => null);
      if (json) {
        setDashboard(json.data || json);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const activateCramming = async (examDate: string) => {
    try {
      const response = await fetchWithAuth('/unified-reviews/activate-cramming', {
        method: 'POST',
        body: JSON.stringify({ exam_date: examDate }),
      });
      const json = await response.json().catch(() => null);
      await fetchDashboard();
      return !!json;
    } catch (err: any) {
      setError(err.message || 'Erro ao ativar modo cramming');
      throw err;
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return {
    dashboard,
    loading,
    error,
    activateCramming,
    refetch: fetchDashboard,
  };
}
