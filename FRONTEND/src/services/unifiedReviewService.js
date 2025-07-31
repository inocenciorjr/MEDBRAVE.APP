// Serviço de Revisões Unificadas – frontbrave/src/services/unifiedReviewService.js
// Interage com a API /unified-reviews e encapsula as chamadas necessárias
import { fetchWithAuth } from './fetchWithAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, opts = {}) {
  const res = await fetchWithAuth(`${API_URL}/unified-reviews${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`UnifiedReviewService error: ${res.status}`);
  return res.json();
}

export const unifiedReviewService = {
  /** Obtém apenas as revisões de hoje (otimizado para dashboard) */
  async getTodayReviews(limit = 50) {
    const response = await request(`/today?limit=${limit}`);
    console.log('🔍 [UnifiedReviewService] Revisões de hoje:', response.data?.reviews?.length || 0);
    return response.data?.reviews || response;
  },
  /** Obtém todas as revisões do usuário (pendentes, completadas e futuras) para a página de revisões */
  async getAllReviews() {
    try {
      console.log('🔍 [UnifiedReviewService] Carregando todas as revisões...');
      
      // Fazer as 3 requisições em paralelo para otimizar performance
      const [pendingResponse, completedResponse, futureResponse] = await Promise.all([
        request('/due?limit=500&dueOnly=false'), // Incluir pendentes e atrasadas
        request('/completed?limit=100&days=30'), // Últimos 30 dias de completadas
        request('/future?limit=200') // Próximas revisões
      ]);
      
      const pendingReviews = pendingResponse.data?.reviews || pendingResponse || [];
      const completedReviews = completedResponse.data?.reviews || completedResponse || [];
      const futureReviews = futureResponse.data?.reviews || futureResponse || [];
      
      console.log('🔍 [UnifiedReviewService] Revisões carregadas:', {
        pending: pendingReviews.length,
        completed: completedReviews.length,
        future: futureReviews.length
      });
      
      return {
        pending: pendingReviews,
        completed: completedReviews,
        future: futureReviews,
        total: pendingReviews.length + completedReviews.length + futureReviews.length
      };
    } catch (error) {
      console.error('❌ [UnifiedReviewService] Erro ao carregar todas as revisões:', error);
      throw error;
    }
  },
  /** Obtém o resumo diário de revisões pendentes */
  async getDailySummary() {
    const response = await request('/summary');
    console.log('🔍 [UnifiedReviewService] Resposta completa da API:', response);
    console.log('🔍 [UnifiedReviewService] Summary extraído:', response.data?.summary);
    return response.data?.summary || response;
  },
  /** Lista todos os itens de revisão devidos para o dia */
  async getDueReviews(limit = 200) {
    // ✅ CORREÇÃO: Incluir dueOnly=false para buscar pendentes e futuras
    const response = await request(`/due?limit=${limit}&dueOnly=false`);
    return response.data?.reviews || response;
  },
  /** Lista revisões futuras (agendadas para depois de hoje) */
  async getFutureReviews(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await request(`/future${queryParams ? `?${queryParams}` : ''}`);
    return response.data?.reviews || response;
  },
  /** Lista revisões completadas (histórico) */
  async getCompletedReviews(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await request(`/completed${queryParams ? `?${queryParams}` : ''}`);
    return response.data?.reviews || response;
  },
  /** Registra o resultado de uma revisão */
  recordReview(itemId, grade, reviewTimeMs = 0, contentType = 'FLASHCARD') {
    return request('/record', {
      method: 'POST',
      body: JSON.stringify({ 
        contentId: itemId, 
        contentType,
        grade, 
        reviewTimeMs 
      }),
    });
  },
  /** Reagenda revisões pendentes para uma nova data */
  async rescheduleReviews({ types, newDate }) {
    return request('/reschedule', {
      method: 'POST',
      body: JSON.stringify({ 
        types, 
        newDate 
      }),
    });
  },
  /** Remove uma revisão permanentemente */
  async removeReview(itemId, contentType) {
    const res = await fetchWithAuth(`${API_URL}/review-management/remove-item`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contentId: itemId, 
        contentType: contentType.toLowerCase(),
        reason: 'USER_REQUEST',
        softDelete: false
      }),
    });
    if (!res.ok) throw new Error(`RemoveReview error: ${res.status}`);
    return res.json();
  },
};