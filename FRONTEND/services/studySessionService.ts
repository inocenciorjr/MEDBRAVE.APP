import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

export interface StudySession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  activity_type: 'questions' | 'flashcards' | 'review' | 'simulated_exam' | 'reading';
  items_completed: number;
  is_active: boolean;
}

export interface StartSessionRequest {
  activity_type: 'questions' | 'flashcards' | 'review' | 'simulated_exam' | 'reading';
}

export interface EndSessionRequest {
  items_completed: number;
}

export const studySessionService = {
  async startSession(data: StartSessionRequest): Promise<StudySession> {
    try {
      const response = await fetchWithAuth('/study-sessions/start', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Erro ao iniciar sessão');
      }
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      throw error;
    }
  },

  async endSession(sessionId: string, data: EndSessionRequest): Promise<StudySession> {
    try {
      const response = await fetchWithAuth(`/study-sessions/${sessionId}/end`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Erro ao finalizar sessão');
      }
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
      throw error;
    }
  },

  async heartbeat(sessionId: string): Promise<void> {
    try {
      const response = await fetchWithAuth(`/study-sessions/${sessionId}/heartbeat`, {
        method: 'PUT',
      });
      if (!response.ok) {
        console.warn('Erro ao enviar heartbeat');
      }
    } catch (error) {
      console.warn('Erro ao enviar heartbeat:', error);
    }
  },

  async getActiveSession(): Promise<StudySession | null> {
    try {
      const response = await fetchWithAuth('/study-sessions/active');
      if (!response.ok) {
        return null;
      }
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Erro ao buscar sessão ativa:', error);
      return null;
    }
  },

  async getSessionHistory(limit = 50): Promise<StudySession[]> {
    try {
      const response = await fetchWithAuth(`/study-sessions/history?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar histórico');
      }
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  },

  async getWeeklyStudyTime(): Promise<{
    totalHours: number;
    totalMinutes: number;
    sessionsCount: number;
    weekStart: string;
    weekEnd: string;
  }> {
    try {
      const response = await fetchWithAuth('/study-sessions/weekly');
      if (!response.ok) {
        throw new Error('Erro ao buscar tempo semanal');
      }
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Erro ao buscar tempo semanal:', error);
      return {
        totalHours: 0,
        totalMinutes: 0,
        sessionsCount: 0,
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
      };
    }
  },

  async getStudyTimeByDay(days: number = 7): Promise<Array<{ date: string; minutes: number; sessions: number }>> {
    try {
      const response = await fetchWithAuth(`/study-sessions/by-day?days=${days}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar tempo por dia');
      }
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Erro ao buscar tempo por dia:', error);
      return [];
    }
  },
};
