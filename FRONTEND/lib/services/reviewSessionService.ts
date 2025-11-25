import { fetchWithAuth } from '../utils/fetchWithAuth';

export interface ReviewSession {
  id: string;
  user_id: string;
  content_type: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK';
  date: string;
  review_ids: string[];
  completed_ids: string[];
  status: 'active' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string;
}

export const reviewSessionService = {
  // Criar sessão de revisão
  async createSession(contentType: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK', reviewIds: string[]): Promise<ReviewSession> {
    const response = await fetchWithAuth('/review-sessions', {
      method: 'POST',
      body: JSON.stringify({
        content_type: contentType,
        review_ids: reviewIds,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Erro ao criar sessão de revisão');
    }
    
    return data.data.session;
  },

  // Buscar sessão ativa
  async getActiveSession(contentType: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK'): Promise<ReviewSession | null> {
    const response = await fetchWithAuth(`/review-sessions/active?contentType=${contentType}`);
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Erro ao buscar sessão ativa');
    }
    
    return data.data.session;
  },

  // Marcar item como completado
  async markItemCompleted(sessionId: string, itemId: string): Promise<void> {
    const response = await fetchWithAuth(`/review-sessions/${sessionId}/complete-item`, {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Erro ao marcar item como completado');
    }
  },

  // Finalizar sessão
  async completeSession(sessionId: string): Promise<void> {
    const response = await fetchWithAuth(`/review-sessions/${sessionId}/complete`, {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Erro ao finalizar sessão');
    }
  },
};
