import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Serviço para gerenciar Programas de Mentoria
 * Um programa é uma mentoria específica criada pelo mentor (ex: Intensivão Revalida 2026.1)
 */
export class MentorProgramService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Cria um novo programa de mentoria
   */
  async createProgram(mentorId: string, data: CreateProgramPayload): Promise<MentorProgram> {
    const { data: program, error } = await this.supabase
      .from('mentor_programs')
      .insert({
        mentor_id: mentorId,
        title: data.title,
        description: data.description,
        cover_image_url: data.coverImageUrl,
        start_date: data.startDate,
        end_date: data.endDate,
        status: 'draft',
        is_public: false,
        max_participants: data.maxParticipants,
        price: data.price,
        is_free: data.isFree ?? false,
        price_in_cash: data.priceInCash,
        price_installment: data.priceInstallment,
        suggested_installments: data.suggestedInstallments,
        accepted_payment_methods: data.acceptedPaymentMethods || ['pix'],
        tags: data.tags || [],
        settings: data.settings || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar programa:', error);
      throw new Error(`Erro ao criar programa: ${error.message}`);
    }

    return this.mapToProgram(program);
  }

  /**
   * Lista programas do mentor
   */
  async getMentorPrograms(mentorId: string): Promise<MentorProgram[]> {
    const { data, error } = await this.supabase
      .from('mentor_programs')
      .select('*')
      .eq('mentor_id', mentorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar programas:', error);
      throw new Error(`Erro ao listar programas: ${error.message}`);
    }

    // Para cada programa, buscar contagem de participantes
    const programsWithCounts = await Promise.all(
      (data || []).map(async (program) => {
        // Contar total de mentorados no programa
        const { count: totalCount } = await this.supabase
          .from('mentorships')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', program.id);

        // Contar mentorados ativos no programa
        const { count: activeCount } = await this.supabase
          .from('mentorships')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', program.id)
          .eq('status', 'ACTIVE');

        return {
          ...program,
          participants_count: totalCount || 0,
          active_participants_count: activeCount || 0,
        };
      })
    );

    return programsWithCounts.map(this.mapToProgram);
  }

  /**
   * Obtém um programa por ID
   */
  async getProgramById(programId: string): Promise<MentorProgram | null> {
    const { data, error } = await this.supabase
      .from('mentor_programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erro ao buscar programa: ${error.message}`);
    }

    return this.mapToProgram(data);
  }

  /**
   * Atualiza um programa
   */
  async updateProgram(
    programId: string,
    mentorId: string,
    data: UpdateProgramPayload
  ): Promise<MentorProgram> {
    // Verificar se o programa pertence ao mentor
    const existing = await this.getProgramById(programId);
    if (!existing || existing.mentorId !== mentorId) {
      throw new Error('Programa não encontrado ou sem permissão');
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.coverImageUrl !== undefined) updateData.cover_image_url = data.coverImageUrl;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.maxParticipants !== undefined) updateData.max_participants = data.maxParticipants;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.isFree !== undefined) updateData.is_free = data.isFree;
    if (data.priceInCash !== undefined) updateData.price_in_cash = data.priceInCash;
    if (data.priceInstallment !== undefined) updateData.price_installment = data.priceInstallment;
    if (data.suggestedInstallments !== undefined) updateData.suggested_installments = data.suggestedInstallments;
    if (data.acceptedPaymentMethods !== undefined) updateData.accepted_payment_methods = data.acceptedPaymentMethods;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.settings !== undefined) updateData.settings = data.settings;

    const { data: updated, error } = await this.supabase
      .from('mentor_programs')
      .update(updateData)
      .eq('id', programId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar programa: ${error.message}`);
    }

    return this.mapToProgram(updated);
  }


  /**
   * Submete programa para aprovação do admin
   */
  async submitForApproval(programId: string, mentorId: string): Promise<MentorProgram> {
    const existing = await this.getProgramById(programId);
    if (!existing || existing.mentorId !== mentorId) {
      throw new Error('Programa não encontrado ou sem permissão');
    }

    if (existing.status !== 'draft' && existing.status !== 'rejected') {
      throw new Error('Apenas programas em rascunho ou rejeitados podem ser submetidos');
    }

    const { data, error } = await this.supabase
      .from('mentor_programs')
      .update({
        status: 'pending_approval',
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao submeter programa: ${error.message}`);
    }

    return this.mapToProgram(data);
  }

  /**
   * Aprova um programa (admin)
   */
  async approveProgram(programId: string, adminId: string): Promise<MentorProgram> {
    const { data, error } = await this.supabase
      .from('mentor_programs')
      .update({
        status: 'approved',
        is_public: true,
        approved_at: new Date().toISOString(),
        approved_by: adminId,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao aprovar programa: ${error.message}`);
    }

    return this.mapToProgram(data);
  }

  /**
   * Rejeita um programa (admin)
   */
  async rejectProgram(programId: string, adminId: string, reason: string): Promise<MentorProgram> {
    const { data, error } = await this.supabase
      .from('mentor_programs')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao rejeitar programa: ${error.message}`);
    }

    return this.mapToProgram(data);
  }


  /**
   * Ativa um programa aprovado
   */
  async activateProgram(programId: string, mentorId: string): Promise<MentorProgram> {
    const existing = await this.getProgramById(programId);
    if (!existing || existing.mentorId !== mentorId) {
      throw new Error('Programa não encontrado ou sem permissão');
    }

    if (existing.status !== 'approved') {
      throw new Error('Apenas programas aprovados podem ser ativados');
    }

    const { data, error } = await this.supabase
      .from('mentor_programs')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao ativar programa: ${error.message}`);
    }

    return this.mapToProgram(data);
  }

  /**
   * Encerra um programa
   */
  async closeProgram(programId: string, mentorId: string): Promise<MentorProgram> {
    const existing = await this.getProgramById(programId);
    if (!existing || existing.mentorId !== mentorId) {
      throw new Error('Programa não encontrado ou sem permissão');
    }

    const { data, error } = await this.supabase
      .from('mentor_programs')
      .update({
        status: 'closed',
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao encerrar programa: ${error.message}`);
    }

    return this.mapToProgram(data);
  }

  /**
   * Lista programas públicos aprovados (para home/listagem pública)
   */
  async getPublicPrograms(): Promise<MentorProgram[]> {
    const { data, error } = await this.supabase
      .from('mentor_programs')
      .select(`
        *,
        mentor:mentor_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('is_public', true)
      .in('status', ['approved', 'active'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar programas públicos: ${error.message}`);
    }

    return (data || []).map(this.mapToProgram);
  }


  /**
   * Lista programas pendentes de aprovação (admin)
   */
  async getPendingPrograms(): Promise<MentorProgram[]> {
    const { data, error } = await this.supabase
      .from('mentor_programs')
      .select(`
        *,
        mentor:mentor_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar programas pendentes: ${error.message}`);
    }

    return (data || []).map(this.mapToProgram);
  }

  /**
   * Adiciona participante ao programa
   */
  async addParticipant(programId: string, menteeId: string, mentorId: string): Promise<void> {
    // Verificar se o programa existe e pertence ao mentor
    const program = await this.getProgramById(programId);
    if (!program || program.mentorId !== mentorId) {
      throw new Error('Programa não encontrado ou sem permissão');
    }

    // Verificar limite de participantes
    if (program.maxParticipants && program.participantsCount >= program.maxParticipants) {
      throw new Error('Programa atingiu o limite de participantes');
    }

    // Atualizar contador
    await this.supabase
      .from('mentor_programs')
      .update({
        participants_count: program.participantsCount + 1,
        active_participants_count: program.activeParticipantsCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId);
  }

  /**
   * Remove participante do programa
   */
  async removeParticipant(programId: string): Promise<void> {
    const program = await this.getProgramById(programId);
    if (!program) return;

    await this.supabase
      .from('mentor_programs')
      .update({
        active_participants_count: Math.max(0, program.activeParticipantsCount - 1),
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId);
  }

  /**
   * Deleta um programa (apenas rascunhos)
   */
  async deleteProgram(programId: string, mentorId: string): Promise<void> {
    const existing = await this.getProgramById(programId);
    if (!existing || existing.mentorId !== mentorId) {
      throw new Error('Programa não encontrado ou sem permissão');
    }

    if (existing.status !== 'draft') {
      throw new Error('Apenas programas em rascunho podem ser deletados');
    }

    const { error } = await this.supabase
      .from('mentor_programs')
      .delete()
      .eq('id', programId);

    if (error) {
      throw new Error(`Erro ao deletar programa: ${error.message}`);
    }
  }

  // Helper para mapear dados do banco para o tipo
  private mapToProgram(data: any): MentorProgram {
    return {
      id: data.id,
      mentorId: data.mentor_id,
      title: data.title,
      description: data.description,
      coverImageUrl: data.cover_image_url,
      startDate: data.start_date,
      endDate: data.end_date,
      status: data.status,
      isPublic: data.is_public,
      approvedAt: data.approved_at,
      approvedBy: data.approved_by,
      rejectionReason: data.rejection_reason,
      maxParticipants: data.max_participants,
      price: data.price,
      isFree: data.is_free,
      priceInCash: data.price_in_cash,
      priceInstallment: data.price_installment,
      suggestedInstallments: data.suggested_installments,
      acceptedPaymentMethods: data.accepted_payment_methods || ['pix'],
      tags: data.tags || [],
      settings: data.settings || {},
      participantsCount: data.participants_count || 0,
      activeParticipantsCount: data.active_participants_count || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      mentor: data.mentor ? {
        id: data.mentor.id,
        email: data.mentor.email,
        displayName: data.mentor.raw_user_meta_data?.display_name || data.mentor.email,
      } : undefined,
    };
  }
}


// ============================================
// TIPOS E INTERFACES
// ============================================

export interface MentorProgram {
  id: string;
  mentorId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  startDate?: string;
  endDate?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'active' | 'closed';
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
