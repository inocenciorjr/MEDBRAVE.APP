import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

export interface ReviewPreferences {
  id: string;
  user_id: string;
  reviews_enabled: boolean;
  auto_add_questions: boolean;
  auto_add_flashcards: boolean;
  auto_add_error_notebook: boolean;
  enable_questions: boolean;
  enable_flashcards: boolean;
  enable_error_notebook: boolean;
  max_interval_days: number;
  target_retention: number;
  study_mode: 'intensive' | 'balanced' | 'relaxed';
  auto_adjust_mode: boolean;
  exam_date?: string;
  scheduling_mode: 'traditional' | 'smart';
  daily_new_items_limit: number;
  daily_reviews_limit: number;
  study_days: number[];
  content_distribution: {
    questions: number;
    flashcards: number;
    error_notebook: number;
  };
  created_at: string;
  updated_at: string;
}

export function useReviewPreferences() {
  const [preferences, setPreferences] = useState<ReviewPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/review-preferences');
      const data = await response.json();
      console.log('Review preferences data:', data);
      if (data.success) {
        setPreferences(data.data);
      } else {
        console.error('Failed to fetch preferences:', data);
        setPreferences(null);
      }
    } catch (err: any) {
      console.error('Error fetching preferences:', err);
      setError(err.message || 'Erro ao carregar preferências');
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<ReviewPreferences>) => {
    try {
      const response = await fetchWithAuth('/api/review-preferences', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (data.success) {
        setPreferences(data.data);
        return data.data;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar preferências');
      throw err;
    }
  };

  const setExamDate = async (examDate: string) => {
    try {
      const response = await fetchWithAuth('/api/review-preferences/set-exam-date', {
        method: 'POST',
        body: JSON.stringify({ exam_date: examDate }),
      });
      const data = await response.json();
      if (data.success) {
        setPreferences(data.data);
        return data.data;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao definir data da prova');
      throw err;
    }
  };

  const clearExamDate = async () => {
    try {
      const response = await fetchWithAuth('/api/review-preferences/exam-date', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setPreferences(data.data);
        return data.data;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao remover data da prova');
      throw err;
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    setExamDate,
    clearExamDate,
    refetch: fetchPreferences,
  };
}
