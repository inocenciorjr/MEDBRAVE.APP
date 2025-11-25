import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CreateMentorshipObjectivePayload,
  MentorshipObjective,
  UpdateMentorshipObjectivePayload,
  ObjectiveStatus,
} from '../../../domain/mentorship/types';
import { IMentorshipObjectiveService } from '../../../domain/mentorship/interfaces/IMentorshipObjectiveService';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseMentorshipObjectiveService
implements IMentorshipObjectiveService {
  private supabase: SupabaseClient;
  private readonly tableName = 'mentorship_objectives';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async createObjective(
    objectiveData: CreateMentorshipObjectivePayload,
  ): Promise<MentorshipObjective> {
    const now = new Date();
    const id = uuidv4();

    const objective: MentorshipObjective = {
      id,
      ...objectiveData,
      status: ObjectiveStatus.PENDING,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(objective)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar objetivo de mentoria:', error);
      throw new Error(`Erro ao criar objetivo de mentoria: ${error.message}`);
    }

    return data;
  }

  async getObjectiveById(id: string): Promise<MentorshipObjective | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao buscar objetivo:', error);
      throw new Error(`Erro ao buscar objetivo: ${error.message}`);
    }

    return data;
  }

  async updateObjective(
    id: string,
    updateData: UpdateMentorshipObjectivePayload,
  ): Promise<MentorshipObjective | null> {
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
      console.error('Erro ao atualizar objetivo:', error);
      throw new Error(`Erro ao atualizar objetivo: ${error.message}`);
    }

    return data;
  }

  async deleteObjective(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar objetivo:', error);
      throw new Error(`Erro ao deletar objetivo: ${error.message}`);
    }

    return true;
  }

  async getObjectivesByMentorship(
    mentorshipId: string,
  ): Promise<MentorshipObjective[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorshipId', mentorshipId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar objetivos por mentoria:', error);
      throw new Error(
        `Erro ao buscar objetivos por mentoria: ${error.message}`,
      );
    }

    return data || [];
  }

  async getObjectivesByStatus(
    mentorshipId: string,
    status: ObjectiveStatus,
  ): Promise<MentorshipObjective[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorshipId', mentorshipId)
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar objetivos por status:', error);
      throw new Error(`Erro ao buscar objetivos por status: ${error.message}`);
    }

    return data || [];
  }

  async updateProgress(
    id: string,
    progress: number,
  ): Promise<MentorshipObjective | null> {
    const now = new Date();
    let status = ObjectiveStatus.IN_PROGRESS;

    if (progress >= 100) {
      status = ObjectiveStatus.COMPLETED;
    } else if (progress === 0) {
      status = ObjectiveStatus.PENDING;
    }

    const updateData: any = {
      progress: Math.min(Math.max(progress, 0), 100), // Garantir que está entre 0 e 100
      status,
      updatedAt: now,
    };

    if (status === ObjectiveStatus.COMPLETED) {
      updateData.completedDate = now;
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
      console.error('Erro ao atualizar progresso do objetivo:', error);
      throw new Error(
        `Erro ao atualizar progresso do objetivo: ${error.message}`,
      );
    }

    return data;
  }

  async completeObjective(id: string): Promise<MentorshipObjective | null> {
    const now = new Date();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        status: ObjectiveStatus.COMPLETED,
        progress: 100,
        completedDate: now,
        updatedAt: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao completar objetivo:', error);
      throw new Error(`Erro ao completar objetivo: ${error.message}`);
    }

    return data;
  }

  async startObjective(id: string): Promise<MentorshipObjective | null> {
    const now = new Date();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ status: ObjectiveStatus.IN_PROGRESS, updatedAt: now })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao iniciar objetivo:', error);
      throw new Error(`Erro ao iniciar objetivo: ${error.message}`);
    }

    return data;
  }

  async cancelObjective(id: string): Promise<MentorshipObjective | null> {
    const now = new Date();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ status: ObjectiveStatus.CANCELLED, updatedAt: now })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao cancelar objetivo:', error);
      throw new Error(`Erro ao cancelar objetivo: ${error.message}`);
    }

    return data;
  }

  async getOverdueObjectives(
    mentorshipId?: string,
  ): Promise<MentorshipObjective[]> {
    const now = new Date();
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .lt('targetDate', now.toISOString())
      .neq('status', ObjectiveStatus.COMPLETED)
      .order('targetDate', { ascending: true });

    if (mentorshipId) {
      query = query.eq('mentorshipId', mentorshipId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar objetivos em atraso:', error);
      throw new Error(`Erro ao buscar objetivos em atraso: ${error.message}`);
    }

    return data || [];
  }

  async getUpcomingObjectives(
    mentorshipId?: string,
    daysAhead: number = 7,
  ): Promise<MentorshipObjective[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .gte('targetDate', now.toISOString())
      .lte('targetDate', futureDate.toISOString())
      .neq('status', ObjectiveStatus.COMPLETED)
      .order('targetDate', { ascending: true });

    if (mentorshipId) {
      query = query.eq('mentorshipId', mentorshipId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar objetivos próximos:', error);
      throw new Error(`Erro ao buscar objetivos próximos: ${error.message}`);
    }

    return data || [];
  }

  async getObjectiveStats(mentorshipId: string): Promise<{
    totalObjectives: number;
    completedObjectives: number;
    inProgressObjectives: number;
    pendingObjectives: number;
    overdueObjectives: number;
    averageProgress: number;
  }> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('status, progress, targetDate')
      .eq('mentorshipId', mentorshipId);

    if (error) {
      console.error('Erro ao buscar estatísticas de objetivos:', error);
      throw new Error(
        `Erro ao buscar estatísticas de objetivos: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      return {
        totalObjectives: 0,
        completedObjectives: 0,
        inProgressObjectives: 0,
        pendingObjectives: 0,
        overdueObjectives: 0,
        averageProgress: 0,
      };
    }

    const now = new Date();
    const totalObjectives = data.length;
    const completedObjectives = data.filter(
      (obj) => obj.status === ObjectiveStatus.COMPLETED,
    ).length;
    const inProgressObjectives = data.filter(
      (obj) => obj.status === ObjectiveStatus.IN_PROGRESS,
    ).length;
    const pendingObjectives = data.filter(
      (obj) => obj.status === ObjectiveStatus.PENDING,
    ).length;
    const overdueObjectives = data.filter(
      (obj) =>
        obj.status !== ObjectiveStatus.COMPLETED &&
        new Date(obj.targetDate) < now,
    ).length;

    const totalProgress = data.reduce(
      (sum, obj) => sum + (obj.progress || 0),
      0,
    );
    const averageProgress =
      totalObjectives > 0 ? Math.round(totalProgress / totalObjectives) : 0;

    return {
      totalObjectives,
      completedObjectives,
      inProgressObjectives,
      pendingObjectives,
      overdueObjectives,
      averageProgress,
    };
  }

  async bulkUpdateObjectives(
    mentorshipId: string,
    updates: { id: string; progress?: number; status?: ObjectiveStatus }[],
  ): Promise<MentorshipObjective[]> {
    const now = new Date();
    const results: MentorshipObjective[] = [];

    for (const update of updates) {
      const updateData: any = {
        ...update,
        updatedAt: now,
      };

      // Remove o id do updateData
      delete updateData.id;

      if (updateData.progress >= 100) {
        updateData.status = ObjectiveStatus.COMPLETED;
        updateData.completedDate = now;
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', update.id)
        .eq('mentorshipId', mentorshipId)
        .select()
        .single();

      if (error) {
        console.error(`Erro ao atualizar objetivo ${update.id}:`, error);
        continue;
      }

      if (data) {
        results.push(data);
      }
    }

    return results;
  }
}
