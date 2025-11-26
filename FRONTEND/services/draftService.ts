/**
 * Draft Service
 * Handles draft-related API calls
 */

import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

export interface Draft {
  id: string;
  job_id?: string;
  url: string;
  title: string;
  questions: any[];
  categorization_results?: any[];
  metadata: {
    url: string;
    totalQuestions: number;
    categorizedQuestions: number;
    extractionDuration?: number;
    categorizationDuration?: number;
    status: 'completed' | 'partial' | 'failed';
    // ✅ Estatísticas de comentários da IA
    commentsGenerated?: number;
    commentsFailed?: number;
    missingCommentQuestions?: string[];
    // ✅ Estatísticas de questões anuladas
    annulledQuestions?: number;
    annulledQuestionNumbers?: string[];
  };
  created_at: string;
  updated_at: string;
  expires_at: string;
}

class DraftService {
  private baseUrl = '/api/admin/scraper';

  /**
   * Get draft by ID
   */
  async getDraft(id: string): Promise<Draft> {
    const response = await fetchWithAuth(`${this.baseUrl}/drafts/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Draft não encontrado ou expirado');
      }
      throw new Error('Erro ao carregar draft');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete draft by ID
   */
  async deleteDraft(id: string): Promise<void> {
    const response = await fetchWithAuth(`${this.baseUrl}/drafts/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      throw new Error('Erro ao deletar draft');
    }
  }

  /**
   * List all drafts
   */
  async listDrafts(jobId?: string): Promise<Draft[]> {
    const url = jobId 
      ? `${this.baseUrl}/drafts?jobId=${jobId}`
      : `${this.baseUrl}/drafts`;

    const response = await fetchWithAuth(url);

    if (!response.ok) {
      throw new Error('Erro ao listar drafts');
    }

    const data = await response.json();
    return data.data;
  }
}

export const draftService = new DraftService();
