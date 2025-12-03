import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

/**
 * Serviço para gerenciar Programas de Mentoria no Frontend
 */
class MentorProgramService {
  private baseUrl = '/mentorship/programs';

  /**
   * Lista programas do mentor autenticado
   */
  async getMyPrograms(): Promise<MentorProgram[]> {
    const response = await fetchWithAuth(this.baseUrl);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Cria um novo programa
   */
  async createProgram(payload: CreateProgramPayload): Promise<MentorProgram> {
    const response = await fetchWithAuth(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Obtém detalhes de um programa
   */
  async getProgram(programId: string): Promise<MentorProgram> {
    const response = await fetchWithAuth(`${this.baseUrl}/${programId}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Atualiza um programa
   */
  async updateProgram(programId: string, payload: UpdateProgramPayload): Promise<MentorProgram> {
    const response = await fetchWithAuth(`${this.baseUrl}/${programId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Deleta um programa (apenas rascunhos)
   */
  async deleteProgram(programId: string): Promise<void> {
    const response = await fetchWithAuth(`${this.baseUrl}/${programId}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  }

  /**
   * Submete programa para aprovação
   */
  async submitForApproval(programId: string): Promise<MentorProgram> {
    const response = await fetchWithAuth(`${this.baseUrl}/${programId}/submit`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Ativa um programa aprovado
   */
  async activateProgram(programId: string): Promise<MentorProgram> {
    const response = await fetchWithAuth(`${this.baseUrl}/${programId}/activate`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Encerra um programa
   */
  async closeProgram(programId: string): Promise<MentorProgram> {
    const response = await fetchWithAuth(`${this.baseUrl}/${programId}/close`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  /**
   * Lista programas públicos aprovados
   */
  async getPublicPrograms(): Promise<MentorProgram[]> {
    const response = await fetchWithAuth(`${this.baseUrl}/public/list`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }
}

export const mentorProgramService = new MentorProgramService();
export default mentorProgramService;


// ============================================
// TIPOS E INTERFACES
// ============================================

export type ProgramStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'active' | 'closed';

export interface MentorProgram {
  id: string;
  mentorId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  startDate?: string;
  endDate?: string;
  status: ProgramStatus;
  isPublic: boolean;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  maxParticipants?: number;
  price?: number;
  isFree: boolean;
  priceInCash?: number;
  priceInstallment?: number;
  suggestedInstallments?: number;
  acceptedPaymentMethods: string[];
  tags: string[];
  settings: Record<string, any>;
  participantsCount: number;
  activeParticipantsCount: number;
  createdAt: string;
  updatedAt: string;
  mentor?: {
    id: string;
    email: string;
    displayName: string;
  };
}

export interface CreateProgramPayload {
  title: string;
  description?: string;
  coverImageUrl?: string;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  price?: number;
  isFree?: boolean;
  priceInCash?: number;
  priceInstallment?: number;
  suggestedInstallments?: number;
  acceptedPaymentMethods?: string[];
  tags?: string[];
  settings?: Record<string, any>;
}

export interface UpdateProgramPayload {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  price?: number;
  isFree?: boolean;
  priceInCash?: number;
  priceInstallment?: number;
  suggestedInstallments?: number;
  acceptedPaymentMethods?: string[];
  tags?: string[];
  settings?: Record<string, any>;
}
