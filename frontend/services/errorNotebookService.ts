import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

// Tipo para highlight de texto (marca-texto)
export type HighlightColor = 'yellow' | 'pink' | 'green' | 'blue' | 'orange';

export interface TextHighlight {
  id: string;
  startOffset: number;
  endOffset: number;
  text: string;
  type: 'highlight';
  color: HighlightColor;
}

export interface ErrorNotebookEntry {
  id: string;
  user_id: string;
  question_id: string;
  user_note: string;
  user_explanation: string;
  key_points: string[];
  tags: string[];
  question_statement: string;
  correct_answer: string;
  user_original_answer: string;
  question_subject: string;
  is_in_review_system: boolean;
  last_reviewed_at?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
  confidence: number;
  folder_id?: string;
  created_at: string;
  updated_at: string;
  // Dados extras da questão para exibição
  question_data?: {
    institution: string;
    year: number;
    topic: string;
    alternatives: Array<{
      id: string;
      letter: string;
      text: string;
    }>;
    professorComment?: string;
  };
  // Comentários nas alternativas
  alternative_comments?: Record<string, string>;
  // Marcações de texto (highlights/marca-texto)
  highlights?: TextHighlight[];
}

export interface CreateErrorNotebookPayload {
  question_id: string;
  user_note: string;
  user_explanation: string;
  key_points?: string[];
  tags?: string[];
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
  confidence?: number;
  alternative_comments?: Record<string, string>;
  folder_id?: string;
  highlights?: TextHighlight[];
}

export interface UpdateErrorNotebookPayload {
  user_note?: string;
  user_explanation?: string;
  key_points?: string[];
  tags?: string[];
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
  confidence?: number;
  alternative_comments?: Record<string, string>;
  folder_id?: string | null;
  highlights?: TextHighlight[];
}

export interface ErrorNotebookStats {
  total_entries: number;
  entries_in_review_system: number;
  entries_by_difficulty: Record<string, number>;
  entries_by_subject: Record<string, number>;
  average_confidence: number;
  last_entry_at?: string;
}

export const errorNotebookService = {
  /**
   * Criar nova entrada no caderno de erros
   */
  async createEntry(payload: CreateErrorNotebookPayload): Promise<ErrorNotebookEntry> {
    const response = await fetchWithAuth('/error-notebook/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao criar entrada no caderno de erros');
    }

    const data = await response.json();
    return data.data.entry;
  },

  /**
   * Listar todas as entradas do usuário
   */
  async getUserEntries(options?: {
    limit?: number;
    page?: number;
    tags?: string[];
    difficulty?: string;
    is_in_review_system?: boolean;
  }): Promise<{
    entries: ErrorNotebookEntry[];
    total: number;
    has_more: boolean;
  }> {
    const params = new URLSearchParams();
    
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.page) params.append('page', options.page.toString());
    if (options?.tags) params.append('tags', options.tags.join(','));
    if (options?.difficulty) params.append('difficulty', options.difficulty);
    if (options?.is_in_review_system !== undefined) {
      params.append('is_in_review_system', options.is_in_review_system.toString());
    }

    const response = await fetchWithAuth(`/error-notebook/user?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao buscar entradas do caderno de erros');
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Buscar entrada específica para revisão
   */
  async getEntryForReview(entryId: string): Promise<{
    entry_id: string;
    question_context: {
      statement: string;
      correct_answer: string;
      subject: string;
    };
    user_content: {
      note: string;
      explanation: string;
      key_points: string[];
    };
    review_prompt: string;
  }> {
    const response = await fetchWithAuth(`/error-notebook/${entryId}/review`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao buscar entrada para revisão');
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Registrar revisão de uma entrada
   */
  async recordReview(
    entryId: string,
    selfAssessment: number,
    reviewTimeMs?: number
  ): Promise<void> {
    const response = await fetchWithAuth(`/error-notebook/${entryId}/record-review`, {
      method: 'POST',
      body: JSON.stringify({ selfAssessment, reviewTimeMs }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao registrar revisão');
    }
  },

  /**
   * Atualizar entrada existente
   */
  async updateEntry(
    entryId: string,
    payload: UpdateErrorNotebookPayload
  ): Promise<ErrorNotebookEntry> {
    const response = await fetchWithAuth(`/error-notebook/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao atualizar entrada');
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Obter estatísticas do caderno de erros
   */
  async getStats(): Promise<ErrorNotebookStats> {
    const response = await fetchWithAuth('/error-notebook/stats');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao buscar estatísticas');
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Deletar entrada do caderno de erros
   */
  async deleteEntry(entryId: string): Promise<void> {
    const response = await fetchWithAuth(`/error-notebook/${entryId}`, {
      method: 'DELETE',
    });

    // 204 No Content é sucesso
    if (response.status === 204) {
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao deletar entrada');
    }
  },
};
