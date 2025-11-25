import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CreateMentorshipPayload,
  ListMentorshipsOptions,
  Mentorship,
  MentorshipStatus,
  PaginatedMentorshipsResult,
  UpdateMentorshipPayload,
} from '../../../domain/mentorship/types';
import { IMentorshipService } from '../../../domain/mentorship/interfaces/IMentorshipService';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseMentorshipService implements IMentorshipService {
  private supabase: SupabaseClient;
  private readonly tableName = 'mentorships';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async createMentorship(
    mentorshipData: CreateMentorshipPayload,
  ): Promise<Mentorship> {
    const now = new Date();
    const id = uuidv4();

    const mentorship: Mentorship = {
      id,
      ...mentorshipData,
      status: MentorshipStatus.PENDING,
      startDate: now,
      meetingCount: 0,
      completedMeetings: 0,
      rating: null,
      feedback: null,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(mentorship)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar mentoria:', error);
      throw new Error(`Erro ao criar mentoria: ${error.message}`);
    }

    return data;
  }

  async getMentorshipById(id: string): Promise<Mentorship | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao buscar mentoria:', error);
      throw new Error(`Erro ao buscar mentoria: ${error.message}`);
    }

    return data;
  }

  async updateMentorship(
    id: string,
    updateData: UpdateMentorshipPayload,
  ): Promise<Mentorship | null> {
    const now = new Date();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ ...updateData, updatedAt: now })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao atualizar mentoria:', error);
      throw new Error(`Erro ao atualizar mentoria: ${error.message}`);
    }

    return data;
  }

  async deleteMentorship(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar mentoria:', error);
      throw new Error(`Erro ao deletar mentoria: ${error.message}`);
    }

    return true;
  }

  async listMentorships(
    options?: ListMentorshipsOptions,
  ): Promise<PaginatedMentorshipsResult> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact' });

    if (options?.mentorId) {
      query = query.eq('mentorId', options.mentorId);
    }

    if (options?.menteeId) {
      query = query.eq('menteeId', options.menteeId);
    }

    if (options?.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status);
      } else {
        query = query.eq('status', options.status);
      }
    }

    const limit = options?.limit || 10;
    const page = options?.page || 1;
    const offset = (page - 1) * limit;

    query = query
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao listar mentorias:', error);
      throw new Error(`Erro ao listar mentorias: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      items: data || [],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getMentorshipsByMentor(
    mentorId: string,
    status?: MentorshipStatus | MentorshipStatus[],
  ): Promise<Mentorship[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorId', mentorId);

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    query = query.order('createdAt', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar mentorias do mentor:', error);
      throw new Error(`Erro ao buscar mentorias do mentor: ${error.message}`);
    }

    return data || [];
  }

  async getMentorshipsByMentee(
    menteeId: string,
    status?: MentorshipStatus | MentorshipStatus[],
  ): Promise<Mentorship[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('menteeId', menteeId);

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    query = query.order('createdAt', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar mentorias do mentee:', error);
      throw new Error(`Erro ao buscar mentorias do mentee: ${error.message}`);
    }

    return data || [];
  }

  async acceptMentorship(id: string): Promise<Mentorship | null> {
    return this.updateMentorship(id, { status: MentorshipStatus.ACTIVE });
  }

  async cancelMentorship(
    id: string,
    reason?: string,
  ): Promise<Mentorship | null> {
    const updateData: UpdateMentorshipPayload = {
      status: MentorshipStatus.CANCELLED,
    };

    if (reason) {
      updateData.notes = reason;
    }

    return this.updateMentorship(id, updateData);
  }

  async completeMentorship(
    id: string,
    rating?: number | null,
    feedback?: string | null,
  ): Promise<Mentorship | null> {
    const updateData: UpdateMentorshipPayload = {
      status: MentorshipStatus.COMPLETED,
      endDate: new Date(),
    };

    if (rating !== undefined) {
      updateData.rating = rating;
    }

    if (feedback !== undefined) {
      updateData.feedback = feedback;
    }

    return this.updateMentorship(id, updateData);
  }

  async recordMeetingCompletion(id: string): Promise<Mentorship | null> {
    const mentorship = await this.getMentorshipById(id);
    if (!mentorship) {
      return null;
    }

    const updateData: UpdateMentorshipPayload = {
      completedMeetings: (mentorship.completedMeetings || 0) + 1,
      lastMeetingDate: new Date(),
    };

    return this.updateMentorship(id, updateData);
  }

  async updateObjectives(
    id: string,
    objectives: string[],
  ): Promise<Mentorship | null> {
    return this.updateMentorship(id, { objectives });
  }

  async updateMeetingFrequency(
    id: string,
    frequency: string,
    customDays?: number | null,
  ): Promise<Mentorship | null> {
    const updateData: UpdateMentorshipPayload = {
      meetingFrequency: frequency as any,
    };

    if (customDays !== undefined) {
      updateData.customFrequencyDays = customDays ?? undefined;
    }

    return this.updateMentorship(id, updateData);
  }

  getProgress(mentorship: Mentorship): number | null {
    if (!mentorship.totalMeetings || mentorship.totalMeetings === 0) {
      return null;
    }

    const completed = mentorship.completedMeetings || 0;
    return Math.round((completed / mentorship.totalMeetings) * 100);
  }

  getMentorshipSummary(mentorship: Mentorship): any {
    return {
      id: mentorship.id,
      title: mentorship.title,
      status: mentorship.status,
      progress: this.getProgress(mentorship),
      totalMeetings: mentorship.totalMeetings,
      completedMeetings: mentorship.completedMeetings,
      startDate: mentorship.startDate,
      endDate: mentorship.endDate,
      rating: mentorship.rating,
    };
  }

  async existsActiveMentorshipBetweenUsers(
    mentorId: string,
    menteeId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('mentorId', mentorId)
      .eq('menteeId', menteeId)
      .eq('status', MentorshipStatus.ACTIVE)
      .limit(1);

    if (error) {
      console.error('Erro ao verificar mentoria ativa:', error);
      throw new Error(`Erro ao verificar mentoria ativa: ${error.message}`);
    }

    return (data?.length || 0) > 0;
  }
}
