import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CreateMentorshipSimulatedExamPayload,
  MentorshipSimulatedExam,
  UpdateMentorshipSimulatedExamPayload,
} from '../../../domain/mentorship/types';
import { IMentorshipSimulatedExamService } from '../../../domain/mentorship/interfaces/IMentorshipSimulatedExamService';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseMentorshipSimulatedExamService
implements IMentorshipSimulatedExamService {
  private supabase: SupabaseClient;
  private readonly tableName = 'mentorship_simulated_exams';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async assignSimulatedExam(
    examData: CreateMentorshipSimulatedExamPayload,
  ): Promise<MentorshipSimulatedExam> {
    const now = new Date();
    const id = uuidv4();

    const exam: MentorshipSimulatedExam = {
      id,
      ...examData,
      assignedDate: now,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(exam)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar simulado de mentoria:', error);
      throw new Error(`Erro ao criar simulado de mentoria: ${error.message}`);
    }

    return data;
  }

  async getSimulatedExamById(
    id: string,
  ): Promise<MentorshipSimulatedExam | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao buscar simulado:', error);
      throw new Error(`Erro ao buscar simulado: ${error.message}`);
    }

    return data;
  }

  async updateSimulatedExam(
    id: string,
    updateData: UpdateMentorshipSimulatedExamPayload,
  ): Promise<MentorshipSimulatedExam | null> {
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
      console.error('Erro ao atualizar simulado:', error);
      throw new Error(`Erro ao atualizar simulado: ${error.message}`);
    }

    return data;
  }

  async removeSimulatedExam(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar simulado:', error);
      throw new Error(`Erro ao deletar simulado: ${error.message}`);
    }

    return true;
  }

  async getSimulatedExamsByMentorship(
    mentorshipId: string,
  ): Promise<MentorshipSimulatedExam[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorshipId', mentorshipId)
      .order('assignedDate', { ascending: false });

    if (error) {
      console.error('Erro ao buscar simulados por mentoria:', error);
      throw new Error(
        `Erro ao buscar simulados por mentoria: ${error.message}`,
      );
    }

    return data || [];
  }

  async getSimulatedExamsByMentee(
    menteeId: string,
  ): Promise<MentorshipSimulatedExam[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('menteeId', menteeId)
      .order('assignedDate', { ascending: false });

    if (error) {
      console.error('Erro ao buscar simulados por mentee:', error);
      throw new Error(`Erro ao buscar simulados por mentee: ${error.message}`);
    }

    return data || [];
  }

  async getSimulatedExamsAssignedByUser(
    userId: string,
  ): Promise<MentorshipSimulatedExam[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('assignedByUserId', userId)
      .order('assignedDate', { ascending: false });

    if (error) {
      console.error('Erro ao buscar simulados por mentor:', error);
      throw new Error(`Erro ao buscar simulados por mentor: ${error.message}`);
    }

    return data || [];
  }

  async getPendingSimulatedExams(
    mentorshipId: string,
  ): Promise<MentorshipSimulatedExam[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorshipId', mentorshipId)
      .is('completedDate', null)
      .order('dueDate', { ascending: true });

    if (error) {
      console.error('Erro ao buscar simulados pendentes:', error);
      throw new Error(`Erro ao buscar simulados pendentes: ${error.message}`);
    }

    return data || [];
  }

  async getCompletedSimulatedExams(
    menteeId: string,
  ): Promise<MentorshipSimulatedExam[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('menteeId', menteeId)
      .eq('isCompleted', true)
      .order('completedDate', { ascending: false });

    if (error) {
      console.error('Erro ao buscar simulados completados:', error);
      throw new Error(`Erro ao buscar simulados completados: ${error.message}`);
    }

    return data || [];
  }

  async getOverdueSimulatedExams(
    menteeId?: string,
  ): Promise<MentorshipSimulatedExam[]> {
    const now = new Date();
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('isCompleted', false)
      .lt('dueDate', now.toISOString())
      .order('dueDate', { ascending: true });

    if (menteeId) {
      query = query.eq('menteeId', menteeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar simulados em atraso:', error);
      throw new Error(`Erro ao buscar simulados em atraso: ${error.message}`);
    }

    return data || [];
  }

  async getUpcomingSimulatedExams(
    menteeId?: string,
    daysAhead: number = 7,
  ): Promise<MentorshipSimulatedExam[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('isCompleted', false)
      .gte('dueDate', now.toISOString())
      .lte('dueDate', futureDate.toISOString())
      .order('dueDate', { ascending: true });

    if (menteeId) {
      query = query.eq('menteeId', menteeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar simulados próximos:', error);
      throw new Error(`Erro ao buscar simulados próximos: ${error.message}`);
    }

    return data || [];
  }

  async completeSimulatedExam(
    id: string,
    score: number,
  ): Promise<MentorshipSimulatedExam | null> {
    const now = new Date();

    const updateData: any = {
      score,
      completedDate: now,
      updatedAt: now,
    };

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
      console.error('Erro ao completar simulado:', error);
      throw new Error(`Erro ao completar simulado: ${error.message}`);
    }

    return data;
  }

  async updateScore(
    id: string,
    score: number,
    feedback?: string,
  ): Promise<MentorshipSimulatedExam | null> {
    const now = new Date();

    const updateData: any = {
      score,
      updatedAt: now,
    };

    if (feedback) {
      updateData.feedback = feedback;
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
      console.error('Erro ao atualizar pontuação do simulado:', error);
      throw new Error(
        `Erro ao atualizar pontuação do simulado: ${error.message}`,
      );
    }

    return data;
  }

  async getSimulatedExamStats(
    mentorshipId?: string,
    menteeId?: string,
  ): Promise<{
    totalExams: number;
    completedExams: number;
    pendingExams: number;
    overdueExams: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    completionRate: number;
  }> {
    let query = this.supabase
      .from(this.tableName)
      .select('isCompleted, score, dueDate');

    if (mentorshipId) {
      query = query.eq('mentorshipId', mentorshipId);
    }

    if (menteeId) {
      query = query.eq('menteeId', menteeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar estatísticas de simulados:', error);
      throw new Error(
        `Erro ao buscar estatísticas de simulados: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      return {
        totalExams: 0,
        completedExams: 0,
        pendingExams: 0,
        overdueExams: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        completionRate: 0,
      };
    }

    const now = new Date();
    const totalExams = data.length;
    const completedExams = data.filter((exam) => exam.isCompleted).length;
    const pendingExams = data.filter((exam) => !exam.isCompleted).length;
    const overdueExams = data.filter(
      (exam) => !exam.isCompleted && new Date(exam.dueDate) < now,
    ).length;

    const completedScores = data
      .filter((exam) => exam.isCompleted && exam.score !== null)
      .map((exam) => exam.score);

    let averageScore = 0;
    let highestScore = 0;
    let lowestScore = 0;

    if (completedScores.length > 0) {
      averageScore = Math.round(
        completedScores.reduce((sum, score) => sum + score, 0) /
          completedScores.length,
      );
      highestScore = Math.max(...completedScores);
      lowestScore = Math.min(...completedScores);
    }

    const completionRate =
      totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0;

    return {
      totalExams,
      completedExams,
      pendingExams,
      overdueExams,
      averageScore,
      highestScore,
      lowestScore,
      completionRate,
    };
  }

  async getPerformanceTrend(
    menteeId: string,
    limit: number = 10,
  ): Promise<{ date: Date; score: number }[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('completedDate, score')
      .eq('menteeId', menteeId)
      .eq('isCompleted', true)
      .not('score', 'is', null)
      .order('completedDate', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar tendência de performance:', error);
      throw new Error(
        `Erro ao buscar tendência de performance: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((exam) => ({
      date: new Date(exam.completedDate),
      score: exam.score,
    }));
  }

  async bulkAssignExams(
    mentorshipId: string,
    menteeId: string,
    assignedBy: string,
    exams: Omit<
      CreateMentorshipSimulatedExamPayload,
      'mentorshipId' | 'menteeId' | 'assignedBy'
    >[],
  ): Promise<MentorshipSimulatedExam[]> {
    const now = new Date();
    const examsWithIds = exams.map((exam) => ({
      id: uuidv4(),
      ...exam,
      mentorshipId,
      menteeId,
      assignedBy,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    }));

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(examsWithIds)
      .select();

    if (error) {
      console.error('Erro ao atribuir simulados em lote:', error);
      throw new Error(`Erro ao atribuir simulados em lote: ${error.message}`);
    }

    return data || [];
  }
}
