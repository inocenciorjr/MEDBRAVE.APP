import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

// ============================================
// TYPES
// ============================================

export interface MentorshipWithUser {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  suspensionReason?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  questionsAnswered?: number;
  accuracy?: number;
  user: {
    id: string;
    email: string;
    display_name: string;
    photo_url?: string;
    role: string;
    created_at: string;
  };
  financialInfo?: {
    id: string;
    paymentType: string;
    paymentModality: string;
    totalAmount: number;
    installments: number;
    billingFrequency: string;
    status: string;
  };
}

export interface BatchAddMenteesRequest {
  programId: string;
  menteeIds: string[];
  endDate?: string;
  durationDays?: number;
}

export interface BatchUpdateMenteesRequest {
  mentorshipIds: string[];
  action: 'suspend' | 'reactivate' | 'extend' | 'update_end_date';
  endDate?: string;
  durationDays?: number;
  suspensionReason?: string;
}

export interface BatchRemoveMenteesRequest {
  mentorshipIds: string[];
  reason?: string;
}

export interface BatchFinancialUpdateRequest {
  mentorshipIds: string[];
  paymentType?: string;
  paymentModality?: string;
  totalAmount?: number;
  installments?: number;
  billingFrequency?: string;
  customFrequencyDays?: number;
}

export interface ProgramMenteesResponse {
  success: boolean;
  data: MentorshipWithUser[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  program: {
    id: string;
    title: string;
  };
}

// ============================================
// SERVICE
// ============================================

class MentorshipBatchService {
  /**
   * Adicionar múltiplos mentorados a um programa
   */
  async addMentees(request: BatchAddMenteesRequest) {
    const response = await fetchWithAuth('/mentorship/mentor/mentees/batch', {
      method: 'POST',
      body: JSON.stringify({
        menteeIds: request.menteeIds,
        programId: request.programId,
        ...(request.endDate ? { endDate: request.endDate } : { durationDays: request.durationDays || 30 })
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erro ao adicionar mentorados');
    }

    return data;
  }

  /**
   * Atualizar múltiplos mentorados (suspender, reativar, estender, etc.)
   */
  async updateMentees(request: BatchUpdateMenteesRequest) {
    const response = await fetchWithAuth('/mentorship/mentor/batch/update', {
      method: 'PUT',
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erro ao atualizar mentorados');
    }

    return data;
  }

  /**
   * Remover múltiplos mentorados
   */
  async removeMentees(request: BatchRemoveMenteesRequest) {
    const response = await fetchWithAuth('/mentorship/mentor/batch/remove', {
      method: 'DELETE',
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erro ao remover mentorados');
    }

    return data;
  }

  /**
   * Atualizar informações financeiras em massa
   */
  async updateFinancialInfo(request: BatchFinancialUpdateRequest) {
    const response = await fetchWithAuth('/mentorship/mentor/batch/financial', {
      method: 'PUT',
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erro ao atualizar informações financeiras');
    }

    return data;
  }

  /**
   * Listar mentorados de um programa com filtros
   */
  async getProgramMentees(
    programId: string,
    options: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<ProgramMenteesResponse> {
    const params = new URLSearchParams();
    
    if (options.search) params.append('search', options.search);
    if (options.status && options.status !== 'all') params.append('status', options.status);
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const url = `/mentorship/mentor/program/${programId}/mentees${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetchWithAuth(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erro ao carregar mentorados');
    }

    return data;
  }

  // ============================================
  // AÇÕES INDIVIDUAIS (helpers)
  // ============================================

  async suspendMentees(mentorshipIds: string[], reason?: string) {
    return this.updateMentees({
      mentorshipIds,
      action: 'suspend',
      suspensionReason: reason,
    });
  }

  async reactivateMentees(mentorshipIds: string[]) {
    return this.updateMentees({
      mentorshipIds,
      action: 'reactivate',
    });
  }

  async extendMentees(mentorshipIds: string[], durationDays: number) {
    return this.updateMentees({
      mentorshipIds,
      action: 'extend',
      durationDays,
    });
  }

  async updateEndDate(mentorshipIds: string[], endDate: string) {
    return this.updateMentees({
      mentorshipIds,
      action: 'update_end_date',
      endDate,
    });
  }
}

export const mentorshipBatchService = new MentorshipBatchService();
export default mentorshipBatchService;
