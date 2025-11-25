import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

const API_BASE = '/admin/flashcards';

/**
 * Serviço para gerenciar coleções oficiais MedBrave (Admin)
 */
export const adminFlashcardService = {
  /**
   * Listar coleções oficiais
   */
  async getOfficialCollections() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/official-collections`);
      
      if (!res.ok) {
        throw new Error('Erro ao buscar coleções oficiais');
      }
      
      return await res.json();
    } catch (error) {
      console.error('Erro ao buscar coleções oficiais:', error);
      throw error;
    }
  },

  /**
   * Marcar coleção como oficial
   */
  async markAsOfficial(collectionName: string) {
    try {
      const res = await fetchWithAuth(`${API_BASE}/mark-official/${encodeURIComponent(collectionName)}`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        throw new Error('Erro ao marcar coleção como oficial');
      }
      
      return await res.json();
    } catch (error) {
      console.error('Erro ao marcar coleção como oficial:', error);
      throw error;
    }
  },

  /**
   * Desmarcar coleção como oficial
   */
  async unmarkAsOfficial(collectionName: string) {
    try {
      const res = await fetchWithAuth(`${API_BASE}/unmark-official/${encodeURIComponent(collectionName)}`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        throw new Error('Erro ao desmarcar coleção como oficial');
      }
      
      return await res.json();
    } catch (error) {
      console.error('Erro ao desmarcar coleção como oficial:', error);
      throw error;
    }
  },

  /**
   * Listar coleções oficiais públicas (para comunidade)
   */
  async getOfficialPublicCollections() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/community/official`);
      
      if (!res.ok) {
        throw new Error('Erro ao buscar coleções oficiais públicas');
      }
      
      return await res.json();
    } catch (error) {
      console.error('Erro ao buscar coleções oficiais públicas:', error);
      throw error;
    }
  },
};
