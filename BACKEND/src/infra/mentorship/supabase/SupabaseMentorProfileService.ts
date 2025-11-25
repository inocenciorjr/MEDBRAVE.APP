import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CreateMentorProfilePayload,
  MentorProfile,
  UpdateMentorProfilePayload,
} from '../../../domain/mentorship/types';
import { IMentorProfileService } from '../../../domain/mentorship/interfaces/IMentorProfileService';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseMentorProfileService implements IMentorProfileService {
  private supabase: SupabaseClient;
  private readonly tableName = 'mentor_profiles';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async createMentorProfile(
    profileData: CreateMentorProfilePayload,
  ): Promise<MentorProfile> {
    const now = new Date();
    const id = uuidv4();

    const profile: MentorProfile = {
      id,
      ...profileData,
      rating: 0,
      totalSessions: 0,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(profile)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar perfil de mentor:', error);
      throw new Error(`Erro ao criar perfil de mentor: ${error.message}`);
    }

    return data;
  }

  async getMentorProfileById(id: string): Promise<MentorProfile | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao buscar perfil de mentor:', error);
      throw new Error(`Erro ao buscar perfil de mentor: ${error.message}`);
    }

    return data;
  }

  async getMentorProfileByUserId(
    userId: string,
  ): Promise<MentorProfile | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('userId', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao buscar perfil de mentor por userId:', error);
      throw new Error(
        `Erro ao buscar perfil de mentor por userId: ${error.message}`,
      );
    }

    return data;
  }

  async updateMentorProfile(
    id: string,
    updateData: UpdateMentorProfilePayload,
  ): Promise<MentorProfile | null> {
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
      console.error('Erro ao atualizar perfil de mentor:', error);
      throw new Error(`Erro ao atualizar perfil de mentor: ${error.message}`);
    }

    return data;
  }

  async deleteMentorProfile(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar perfil de mentor:', error);
      throw new Error(`Erro ao deletar perfil de mentor: ${error.message}`);
    }

    return true;
  }

  async listMentorProfiles(limit: number = 10, page: number = 1): Promise<{
    profiles: MentorProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    const { data, error, count } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao listar perfis de mentores:', error);
      throw new Error(`Erro ao listar perfis de mentores: ${error.message}`);
    }

    return {
      profiles: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async findProfilesBySpecialty(
    specialty: string,
    limit: number = 10,
    page: number = 1,
  ): Promise<{
    profiles: MentorProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    const { data, error, count } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .overlaps('specialties', [specialty])
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar perfis por especialidade:', error);
      throw new Error(`Erro ao buscar perfis por especialidade: ${error.message}`);
    }

    return {
      profiles: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async updateMentorRating(userId: string, rating: number): Promise<MentorProfile | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ rating, updatedAt: new Date() })
      .eq('userId', userId)
      .select()
      .single();
    if (error) return null;
    return data;
  }

  async isMentor(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('userId')
      .eq('userId', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return !!data;
  }

  async updateRating(
    id: string,
    newRating: number,
  ): Promise<MentorProfile | null> {
    const profile = await this.getMentorProfileById(id);
    if (!profile) {
      return null;
    }

    // Calcular nova média de rating
    const totalSessions = profile.totalSessions;
    const currentRating = profile.rating;
    const updatedRating =
      totalSessions > 0
        ? (currentRating * totalSessions + newRating) / (totalSessions + 1)
        : newRating;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        rating: Math.round(updatedRating * 100) / 100,
        totalSessions: totalSessions + 1,
        updatedAt: new Date(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return data;
  }

  async incrementSessionCount(id: string): Promise<MentorProfile | null> {
    const profile = await this.getMentorProfileById(id);
    if (!profile) {
      return null;
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ totalSessions: profile.totalSessions + 1, updatedAt: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return data;
  }

  async searchMentorsBySpecialty(specialty: string): Promise<MentorProfile[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .contains('specialties', [specialty])
      .order('rating', { ascending: false });

    if (error) {
      console.error('Erro ao buscar mentores por especialidade:', error);
      throw new Error(
        `Erro ao buscar mentores por especialidade: ${error.message}`,
      );
    }

    return data || [];
  }
}
