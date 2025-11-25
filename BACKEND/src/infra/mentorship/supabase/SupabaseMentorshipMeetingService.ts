import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CreateMentorshipMeetingPayload,
  MentorshipMeeting,
  UpdateMentorshipMeetingPayload,
  MeetingStatus,
} from '../../../domain/mentorship/types';
import { IMentorshipMeetingService } from '../../../domain/mentorship/interfaces/IMentorshipMeetingService';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseMentorshipMeetingService
implements IMentorshipMeetingService {
  private supabase: SupabaseClient;
  private readonly tableName = 'mentorship_meetings';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async createMeeting(
    meetingData: CreateMentorshipMeetingPayload,
  ): Promise<MentorshipMeeting> {
    const now = new Date();
    const id = uuidv4();

    const meeting: MentorshipMeeting = {
      id,
      ...meetingData,
      status: MeetingStatus.SCHEDULED,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(meeting)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar reunião de mentoria:', error);
      throw new Error(`Erro ao criar reunião de mentoria: ${error.message}`);
    }

    return data;
  }

  async getMeetingById(id: string): Promise<MentorshipMeeting | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao buscar reunião:', error);
      throw new Error(`Erro ao buscar reunião: ${error.message}`);
    }

    return data;
  }

  async updateMeeting(
    id: string,
    updateData: UpdateMentorshipMeetingPayload,
  ): Promise<MentorshipMeeting | null> {
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
      console.error('Erro ao atualizar reunião:', error);
      throw new Error(`Erro ao atualizar reunião: ${error.message}`);
    }

    return data;
  }

  async deleteMeeting(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar reunião:', error);
      throw new Error(`Erro ao deletar reunião: ${error.message}`);
    }

    return true;
  }

  async getMeetingsByMentorship(
    mentorshipId: string,
  ): Promise<MentorshipMeeting[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorshipId', mentorshipId)
      .order('scheduledDate', { ascending: true });

    if (error) {
      console.error('Erro ao buscar reuniões por mentoria:', error);
      throw new Error(`Erro ao buscar reuniões por mentoria: ${error.message}`);
    }

    return data || [];
  }

  async getMeetingsByMentor(mentorId: string): Promise<MentorshipMeeting[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorId', mentorId)
      .order('scheduledDate', { ascending: true });

    if (error) {
      console.error('Erro ao buscar reuniões por mentor:', error);
      throw new Error(`Erro ao buscar reuniões por mentor: ${error.message}`);
    }

    return data || [];
  }

  async getMeetingsByMentee(menteeId: string): Promise<MentorshipMeeting[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('menteeId', menteeId)
      .order('scheduledDate', { ascending: true });

    if (error) {
      console.error('Erro ao buscar reuniões por mentee:', error);
      throw new Error(`Erro ao buscar reuniões por mentee: ${error.message}`);
    }

    return data || [];
  }

  async getUpcomingMeetings(userId: string): Promise<MentorshipMeeting[]> {
    const now = new Date();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`mentorId.eq.${userId},menteeId.eq.${userId}`)
      .eq('status', MeetingStatus.SCHEDULED)
      .gte('scheduledDate', now.toISOString())
      .order('scheduledDate', { ascending: true });

    if (error) {
      console.error('Erro ao buscar reuniões próximas:', error);
      throw new Error(`Erro ao buscar reuniões próximas: ${error.message}`);
    }

    return data || [];
  }

  async getPastMeetings(userId: string): Promise<MentorshipMeeting[]> {
    const now = new Date();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`mentorId.eq.${userId},menteeId.eq.${userId}`)
      .in('status', [MeetingStatus.COMPLETED, MeetingStatus.CANCELLED])
      .lt('scheduledDate', now.toISOString())
      .order('scheduledDate', { ascending: false });

    if (error) {
      console.error('Erro ao buscar reuniões passadas:', error);
      throw new Error(`Erro ao buscar reuniões passadas: ${error.message}`);
    }

    return data || [];
  }

  async startMeeting(id: string): Promise<MentorshipMeeting | null> {
    const now = new Date();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        actualDate: now,
        updatedAt: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao iniciar reunião:', error);
      throw new Error(`Erro ao iniciar reunião: ${error.message}`);
    }

    return data;
  }

  async listMeetings(
    options: import('../../../domain/mentorship/types').ListMentorshipMeetingsOptions,
  ): Promise<import('../../../domain/mentorship/types').PaginatedMentorshipMeetingsResult> {
    const { mentorshipId, status, limit = 10, page = 1 } = options;
    let query = this.supabase.from(this.tableName).select('*', { count: 'exact' });
    if (mentorshipId) query = query.eq('mentorshipId', mentorshipId);
    if (status) {
      if (Array.isArray(status)) query = query.in('status', status);
      else query = query.eq('status', status);
    }
    const offset = (page - 1) * limit;
    query = query.order('scheduledDate', { ascending: true }).range(offset, offset + limit - 1);
    const { data, error, count } = await query;
    if (error) throw new Error(`Erro ao listar reuniões: ${error.message}`);
    return {
      items: (data || []) as MentorshipMeeting[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async addNotes(id: string, notesToAdd: string): Promise<MentorshipMeeting | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ notes: notesToAdd, updatedAt: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return data;
  }

  async addMentorFeedback(id: string, feedback: string): Promise<MentorshipMeeting | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ mentorFeedback: feedback, updatedAt: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return data;
  }

  async addStudentFeedback(id: string, feedback: string): Promise<MentorshipMeeting | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ studentFeedback: feedback, updatedAt: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return data;
  }

  isUpcoming(meeting: MentorshipMeeting): boolean {
    return meeting.status === MeetingStatus.SCHEDULED && new Date(meeting.scheduledDate) > new Date();
  }

  getMeetingSummary(meeting: MentorshipMeeting): any {
    return {
      id: meeting.id,
      status: meeting.status,
      scheduledDate: meeting.scheduledDate,
      duration: meeting.duration,
      mentorFeedback: meeting.mentorFeedback,
      studentFeedback: meeting.studentFeedback,
    };
  }

  async completeMeeting(
    id: string,
    actualDate: Date,
    actualDuration: number,
    notes?: string | null,
    mentorFeedback?: string | null,
    studentFeedback?: string | null,
  ): Promise<MentorshipMeeting | null> {
    const now = new Date();

    const updateData: any = {
      status: MeetingStatus.COMPLETED,
      actualDate,
      actualDuration,
      updatedAt: now,
    };

    if (notes !== undefined) updateData.notes = notes;
    if (mentorFeedback !== undefined) updateData.mentorFeedback = mentorFeedback;
    if (studentFeedback !== undefined) updateData.studentFeedback = studentFeedback;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao completar reunião:', error);
      throw new Error(`Erro ao completar reunião: ${error.message}`);
    }

    return data;
  }

  async cancelMeeting(
    id: string,
    reason?: string,
  ): Promise<MentorshipMeeting | null> {
    const now = new Date();

    const updateData: any = {
      status: MeetingStatus.CANCELLED,
      updatedAt: now,
    };

    if (reason) {
      updateData.notes = reason;
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao cancelar reunião:', error);
      throw new Error(`Erro ao cancelar reunião: ${error.message}`);
    }

    return data;
  }

  async rescheduleMeeting(
    id: string,
    newDate: Date,
  ): Promise<MentorshipMeeting | null> {
    const now = new Date();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        scheduledDate: newDate,
        status: MeetingStatus.SCHEDULED,
        updatedAt: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao reagendar reunião:', error);
      throw new Error(`Erro ao reagendar reunião: ${error.message}`);
    }

    return data;
  }

  async getMeetingStats(mentorshipId?: string): Promise<{
    totalMeetings: number;
    completedMeetings: number;
    cancelledMeetings: number;
    averageDuration: number;
  }> {
    let query = this.supabase.from(this.tableName).select('status, duration');

    if (mentorshipId) {
      query = query.eq('mentorshipId', mentorshipId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar estatísticas de reuniões:', error);
      throw new Error(
        `Erro ao buscar estatísticas de reuniões: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      return {
        totalMeetings: 0,
        completedMeetings: 0,
        cancelledMeetings: 0,
        averageDuration: 0,
      };
    }

    const totalMeetings = data.length;
    const completedMeetings = data.filter(
      (meeting) => meeting.status === MeetingStatus.COMPLETED,
    ).length;
    const cancelledMeetings = data.filter(
      (meeting) => meeting.status === MeetingStatus.CANCELLED,
    ).length;

    const completedWithDuration = data.filter(
      (meeting) =>
        meeting.status === MeetingStatus.COMPLETED && meeting.duration,
    );
    const averageDuration =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce(
          (sum, meeting) => sum + (meeting.duration || 0),
          0,
        ) / completedWithDuration.length
        : 0;

    return {
      totalMeetings,
      completedMeetings,
      cancelledMeetings,
      averageDuration: Math.round(averageDuration),
    };
  }
}
