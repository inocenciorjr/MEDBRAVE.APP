import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CreateMentorshipFeedbackPayload,
  MentorshipFeedback,
  UpdateMentorshipFeedbackPayload,
} from '../../../domain/mentorship/types';
import { IMentorshipFeedbackService } from '../../../domain/mentorship/interfaces/IMentorshipFeedbackService';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseMentorshipFeedbackService
implements IMentorshipFeedbackService {
  private supabase: SupabaseClient;
  private readonly tableName = 'mentorship_feedbacks';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async createFeedback(
    feedbackData: CreateMentorshipFeedbackPayload,
  ): Promise<MentorshipFeedback> {
    const now = new Date();
    const id = uuidv4();

    const feedback: MentorshipFeedback = {
      id,
      ...feedbackData,
      isAnonymous: feedbackData.isAnonymous ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(feedback)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar feedback de mentoria:', error);
      throw new Error(`Erro ao criar feedback de mentoria: ${error.message}`);
    }

    return data;
  }

  async getFeedbackById(id: string): Promise<MentorshipFeedback | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao buscar feedback:', error);
      throw new Error(`Erro ao buscar feedback: ${error.message}`);
    }

    return data;
  }

  async updateFeedback(
    id: string,
    updateData: UpdateMentorshipFeedbackPayload,
  ): Promise<MentorshipFeedback | null> {
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
      console.error('Erro ao atualizar feedback:', error);
      throw new Error(`Erro ao atualizar feedback: ${error.message}`);
    }

    return data;
  }

  async deleteFeedback(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar feedback:', error);
      throw new Error(`Erro ao deletar feedback: ${error.message}`);
    }

    return true;
  }

  async getFeedbacksByMentorship(
    mentorshipId: string,
  ): Promise<MentorshipFeedback[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorshipId', mentorshipId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Erro ao buscar feedbacks por mentoria:', error);
      throw new Error(
        `Erro ao buscar feedbacks por mentoria: ${error.message}`,
      );
    }

    return data || [];
  }

  async getFeedbacksByMeeting(meetingId: string): Promise<MentorshipFeedback[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('meetingId', meetingId)
      .order('createdAt', { ascending: false });
    if (error) throw new Error(`Erro ao buscar feedbacks por reunião: ${error.message}`);
    return data || [];
  }

  async getFeedbacksGivenByUser(userId: string): Promise<MentorshipFeedback[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('fromUserId', userId)
      .order('createdAt', { ascending: false });
    if (error) throw new Error(`Erro ao buscar feedbacks dados: ${error.message}`);
    return data || [];
  }

  async getFeedbacksReceivedByUser(userId: string): Promise<MentorshipFeedback[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('toUserId', userId)
      .order('createdAt', { ascending: false });
    if (error) throw new Error(`Erro ao buscar feedbacks recebidos: ${error.message}`);
    return data || [];
  }

  async getAverageRatingForUser(userId: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('rating')
      .eq('toUserId', userId)
      .not('rating', 'is', null);
    if (error) throw new Error(`Erro ao calcular média: ${error.message}`);
    if (!data || data.length === 0) return null;
    const sum = data.reduce((s, f) => s + (f.rating || 0), 0);
    return Math.round((sum / data.length) * 100) / 100;
  }

  async getFeedbacksByMentor(mentorId: string): Promise<MentorshipFeedback[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorId', mentorId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Erro ao buscar feedbacks por mentor:', error);
      throw new Error(`Erro ao buscar feedbacks por mentor: ${error.message}`);
    }

    return data || [];
  }

  async getFeedbacksByMentee(menteeId: string): Promise<MentorshipFeedback[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('menteeId', menteeId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Erro ao buscar feedbacks por mentee:', error);
      throw new Error(`Erro ao buscar feedbacks por mentee: ${error.message}`);
    }

    return data || [];
  }

  async getAverageRatingByMentor(mentorId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('rating')
      .eq('mentorId', mentorId)
      .not('rating', 'is', null);

    if (error) {
      console.error('Erro ao calcular rating médio do mentor:', error);
      throw new Error(
        `Erro ao calcular rating médio do mentor: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      return 0;
    }

    const totalRating = data.reduce(
      (sum, feedback) => sum + (feedback.rating || 0),
      0,
    );
    return Math.round((totalRating / data.length) * 100) / 100;
  }

  async getRecentFeedbacks(limit: number = 10): Promise<MentorshipFeedback[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar feedbacks recentes:', error);
      throw new Error(`Erro ao buscar feedbacks recentes: ${error.message}`);
    }

    return data || [];
  }

  async getFeedbackStats(mentorId?: string): Promise<{
    totalFeedbacks: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  }> {
    let query = this.supabase
      .from(this.tableName)
      .select('rating')
      .not('rating', 'is', null);

    if (mentorId) {
      query = query.eq('mentorId', mentorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar estatísticas de feedback:', error);
      throw new Error(
        `Erro ao buscar estatísticas de feedback: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      return {
        totalFeedbacks: 0,
        averageRating: 0,
        ratingDistribution: {},
      };
    }

    const totalFeedbacks = data.length;
    const totalRating = data.reduce(
      (sum, feedback) => sum + (feedback.rating || 0),
      0,
    );
    const averageRating =
      Math.round((totalRating / totalFeedbacks) * 100) / 100;

    const ratingDistribution: { [key: number]: number } = {};
    data.forEach((feedback) => {
      const rating = feedback.rating || 0;
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    return {
      totalFeedbacks,
      averageRating,
      ratingDistribution,
    };
  }
}
