// Serviço de Revisões Unificadas – frontbrave/src/services/unifiedReviewService.js
// Interage com a API /unified-reviews e encapsula as chamadas necessárias
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

async function request(path, opts = {}) {
  // Usar proxy do Next.js
  const res = await fetchWithAuth(`/unified-reviews${path}`, {
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
    const reviews = response.data?.reviews || response || [];
    return reviews.map(this.mapBackendFields);
  },
  /** Mapeia os campos do backend (snake_case) para o frontend (camelCase) */
  mapBackendFields(review) {
    if (!review) return review;
    
    return {
      ...review,
      contentType: review.content_type || review.contentType,
      frontContent: review.front_content || review.frontContent,
      backContent: review.back_content || review.backContent,
      lastReview: review.last_review || review.lastReview,
      createdAt: review.created_at || review.createdAt,
      updatedAt: review.updated_at || review.updatedAt,
      due: review.due ? new Date(review.due) : review.due
    };
  },

  /** Obtém todas as revisões do usuário (pendentes, completadas e futuras) para a página de revisões */
  async getAllReviews() {
    try {
      console.log('🔍 [UnifiedReviewService] Carregando todas as revisões...');
      
      // Fazer as 3 requisições em paralelo para otimizar performance
      const [pendingResponse, completedResponse, futureResponse] = await Promise.all([
        request('/due?limit=500&dueOnly=false'), // Incluir pendentes e atrasadas
        request('/completed?limit=100&days=30'), // Últimos 30 dias de completadas
        request('/future?limit=500') // Próximas revisões, aumentado o limite
      ]);
      
      const pendingReviews = (pendingResponse.data?.reviews || pendingResponse || []).map(this.mapBackendFields);
      const completedReviews = (completedResponse.data?.reviews || completedResponse || []).map(this.mapBackendFields);
      const futureReviews = (futureResponse.data?.reviews || futureResponse || []).map(this.mapBackendFields);

      // Ajuste para fuso horário: Mover revisões futuras que são devidas hoje no fuso horário local para pendentes
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todaysPending = futureReviews.filter(review => new Date(review.due) <= endOfDay);
      const remainingFuture = futureReviews.filter(review => new Date(review.due) > endOfDay);

      const adjustedPending = [...pendingReviews, ...todaysPending];
      
      console.log('🔍 [UnifiedReviewService] Revisões carregadas:', {
        pending: adjustedPending.length,
        completed: completedReviews.length,
        future: remainingFuture.length
      });
      
      return {
        pending: adjustedPending,
        completed: completedReviews,
        future: remainingFuture,
        total: adjustedPending.length + completedReviews.length + remainingFuture.length
      };
    } catch (error) {
      console.error('❌ [UnifiedReviewService] Erro ao carregar todas as revisões:', error);
      throw error;
    }
  },
  /** Obtém o resumo diário de revisões pendentes */
  async getDailySummary() {
    const response = await request('/summary');
  
  
    return response.data?.summary || response;
  },
  /** Lista todos os itens de revisão devidos para o dia */
  async getDueReviews(limit = 200) {
    // ✅ CORREÇÃO: Incluir dueOnly=false para buscar pendentes e futuras
    const response = await request(`/due?limit=${limit}&dueOnly=false`);
    const reviews = response.data?.reviews || response || [];
    return reviews.map(this.mapBackendFields);
  },
  /** Lista revisões futuras (agendadas para depois de hoje) */
  async getFutureReviews(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await request(`/future${queryParams ? `?${queryParams}` : ''}`);
    const reviews = response.data?.reviews || response || [];
    return reviews.map(this.mapBackendFields);
  },
  /** Lista revisões completadas (histórico) */
  async getCompletedReviews(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await request(`/completed${queryParams ? `?${queryParams}` : ''}`);
    const reviews = response.data?.reviews || response || [];
    return reviews.map(this.mapBackendFields);
  },
  /** Registra o resultado de uma revisão */
  recordReview(itemId, grade, review_time_ms = 0, contentType = 'FLASHCARD') {
    return request('/record', {
      method: 'POST',
      body: JSON.stringify({ 
        content_id: itemId, 
        content_type: contentType,
        grade, 
        review_time_ms 
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
    const res = await fetchWithAuth(`/review-management/remove-item`, {
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

  // ========== AÇÕES EM LOTE (BULK ACTIONS) ==========

  /** Reagendar revisões pendentes para uma nova data ou distribuir ao longo de dias */
  async bulkReschedule({ contentTypes, newDate, daysToDistribute }) {
    return request('/bulk/reschedule', {
      method: 'POST',
      body: JSON.stringify({
        content_types: contentTypes,
        new_date: newDate,
        days_to_distribute: daysToDistribute,
      }),
    });
  },

  /** Deletar revisões pendentes */
  async bulkDelete({ cardIds, contentTypes, deleteAll = false }) {
    return request('/bulk/delete', {
      method: 'DELETE',
      body: JSON.stringify({
        card_ids: cardIds,
        content_types: contentTypes,
        delete_all: deleteAll,
      }),
    });
  },

  /** Resetar progresso de revisões (volta para estado NEW) */
  async bulkResetProgress({ cardIds, contentTypes }) {
    return request('/bulk/reset-progress', {
      method: 'POST',
      body: JSON.stringify({
        card_ids: cardIds,
        content_types: contentTypes,
      }),
    });
  },

  /** Obter estatísticas de revisões atrasadas */
  async getOverdueStats() {
    return request('/bulk/overdue-stats');
  },
};