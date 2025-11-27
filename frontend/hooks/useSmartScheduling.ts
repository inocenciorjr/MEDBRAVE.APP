import { useState } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

export interface BacklogStatus {
  status: 'normal' | 'warning' | 'critical' | 'severe';
  totalDue: number;
  limit: number;
  backlogRatio: number;
  daysToRecover: number;
  suggestions: string[];
}

export interface StudyPattern {
  shouldSuggestChange: boolean;
  adherenceRate: number;
  expectedDays: number;
  actualDays: number;
}

export function useSmartScheduling() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBacklogStatus = async (): Promise<BacklogStatus | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/unified-reviews/backlog-status');
      const json = await response.json().catch(() => null);
      return json as BacklogStatus;
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar backlog');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const activateRecoveryMode = async (daysToSpread: number = 4) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/unified-reviews/recovery-mode', {
        method: 'POST',
        body: JSON.stringify({ days_to_spread: daysToSpread }),
      });
      const json = await response.json().catch(() => null);
      return json;
    } catch (err: any) {
      setError(err.message || 'Erro ao ativar modo recuperação');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getStudyPattern = async (): Promise<StudyPattern | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/unified-reviews/study-pattern');
      const json = await response.json().catch(() => null);
      return json as StudyPattern;
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar padrão de estudo');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getBacklogStatus,
    activateRecoveryMode,
    getStudyPattern,
  };
}
