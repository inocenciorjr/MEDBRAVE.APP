import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CreateMentorshipResourcePayload,
  MentorshipResource,
  UpdateMentorshipResourcePayload,
  ResourceType,
} from '../../../domain/mentorship/types';
import { IMentorshipResourceService } from '../../../domain/mentorship/interfaces/IMentorshipResourceService';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseMentorshipResourceService
implements IMentorshipResourceService {
  private supabase: SupabaseClient;
  private readonly tableName = 'mentorship_resources';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async createResource(
    resourceData: CreateMentorshipResourcePayload,
  ): Promise<MentorshipResource> {
    const now = new Date();
    const id = uuidv4();

    const resource: MentorshipResource = {
      id,
      ...resourceData,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(resource)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar recurso de mentoria:', error);
      throw new Error(`Erro ao criar recurso de mentoria: ${error.message}`);
    }

    return data;
  }

  async getResourceById(id: string): Promise<MentorshipResource | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao buscar recurso:', error);
      throw new Error(`Erro ao buscar recurso: ${error.message}`);
    }

    return data;
  }

  async updateResource(
    id: string,
    updateData: UpdateMentorshipResourcePayload,
  ): Promise<MentorshipResource | null> {
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
      console.error('Erro ao atualizar recurso:', error);
      throw new Error(`Erro ao atualizar recurso: ${error.message}`);
    }

    return data;
  }

  async deleteResource(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar recurso:', error);
      throw new Error(`Erro ao deletar recurso: ${error.message}`);
    }

    return true;
  }

  async getResourcesByMentorship(
    mentorshipId: string,
  ): Promise<MentorshipResource[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorshipId', mentorshipId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Erro ao buscar recursos por mentoria:', error);
      throw new Error(`Erro ao buscar recursos por mentoria: ${error.message}`);
    }

    return data || [];
  }

  async getResourcesByType(
    mentorshipId: string,
    type: ResourceType,
  ): Promise<MentorshipResource[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorshipId', mentorshipId)
      .eq('type', type)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Erro ao buscar recursos por tipo:', error);
      throw new Error(`Erro ao buscar recursos por tipo: ${error.message}`);
    }

    return data || [];
  }

  async getResourcesByMentor(mentorId: string): Promise<MentorshipResource[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('createdBy', mentorId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Erro ao buscar recursos por mentor:', error);
      throw new Error(`Erro ao buscar recursos por mentor: ${error.message}`);
    }

    return data || [];
  }

  async searchResources(
    mentorshipId: string,
    searchTerm: string,
  ): Promise<MentorshipResource[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorshipId', mentorshipId)
      .or(
        `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{"${searchTerm}"}`,
      )
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Erro ao buscar recursos:', error);
      throw new Error(`Erro ao buscar recursos: ${error.message}`);
    }

    return data || [];
  }

  async getResourcesByTags(
    mentorshipId: string,
    tags: string[],
  ): Promise<MentorshipResource[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorshipId', mentorshipId)
      .overlaps('tags', tags)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Erro ao buscar recursos por tags:', error);
      throw new Error(`Erro ao buscar recursos por tags: ${error.message}`);
    }

    return data || [];
  }

  async getPopularResources(
    mentorshipId?: string,
    limit: number = 10,
  ): Promise<MentorshipResource[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .order('accessCount', { ascending: false })
      .limit(limit);

    if (mentorshipId) {
      query = query.eq('mentorshipId', mentorshipId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar recursos populares:', error);
      throw new Error(`Erro ao buscar recursos populares: ${error.message}`);
    }

    return data || [];
  }

  async getRecentResources(
    mentorshipId?: string,
    limit: number = 10,
  ): Promise<MentorshipResource[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (mentorshipId) {
      query = query.eq('mentorshipId', mentorshipId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar recursos recentes:', error);
      throw new Error(`Erro ao buscar recursos recentes: ${error.message}`);
    }

    return data || [];
  }

  async incrementAccessCount(id: string): Promise<MentorshipResource | null> {
    const now = new Date();
    const { data: current, error: readErr } = await this.supabase
      .from(this.tableName)
      .select('accessCount')
      .eq('id', id)
      .single();

    if (readErr) {
      console.error('Erro ao ler contador de acesso:', readErr);
      throw new Error(`Erro ao ler contador de acesso: ${readErr.message}`);
    }

    const newAccessCount = ((current as any)?.accessCount || 0) + 1;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ accessCount: newAccessCount, lastAccessedAt: now, updatedAt: now })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao incrementar contador de acesso:', error);
      throw new Error(
        `Erro ao incrementar contador de acesso: ${error.message}`,
      );
    }

    return data;
  }

  async getResourceStats(mentorshipId: string): Promise<{
    totalResources: number;
    resourcesByType: { [key in ResourceType]: number };
    totalAccesses: number;
    mostAccessedResource: MentorshipResource | null;
  }> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('type, accessCount')
      .eq('mentorshipId', mentorshipId);

    if (error) {
      console.error('Erro ao buscar estatísticas de recursos:', error);
      throw new Error(
        `Erro ao buscar estatísticas de recursos: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      return {
        totalResources: 0,
        resourcesByType: {
          [ResourceType.LINK]: 0,
          [ResourceType.FILE]: 0,
          [ResourceType.VIDEO]: 0,
          [ResourceType.ARTICLE]: 0,
          [ResourceType.OTHER]: 0,
        },
        totalAccesses: 0,
        mostAccessedResource: null,
      };
    }

    const totalResources = data.length;
    const resourcesByType = (data as any[]).reduce((acc, resource) => {
      const type = resource.type as ResourceType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {
      [ResourceType.LINK]: 0,
      [ResourceType.FILE]: 0,
      [ResourceType.VIDEO]: 0,
      [ResourceType.ARTICLE]: 0,
      [ResourceType.OTHER]: 0,
    } as { [key in ResourceType]: number });

    // Garantir que todos os tipos estão presentes
    Object.values(ResourceType).forEach((type) => {
      if (!resourcesByType[type]) {
        resourcesByType[type] = 0;
      }
    });

    const totalAccesses = (data as any[]).reduce(
      (sum, resource) => sum + ((resource as any).accessCount || 0),
      0,
    );

    // Buscar o recurso mais acessado
    const { data: mostAccessed, error: mostAccessedError } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('mentorshipId', mentorshipId)
      .order('accessCount', { ascending: false })
      .limit(1)
      .single();

    let mostAccessedResource = null;
    if (!mostAccessedError && mostAccessed) {
      mostAccessedResource = mostAccessed;
    }

    return {
      totalResources,
      resourcesByType,
      totalAccesses,
      mostAccessedResource,
    };
  }

  async getResourcesAddedByUser(userId: string): Promise<MentorshipResource[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('addedByUserId', userId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Erro ao buscar recursos adicionados por usuário:', error);
      throw new Error(`Erro ao buscar recursos adicionados por usuário: ${error.message}`);
    }

    return data || [];
  }

  async bulkCreateResources(
    mentorshipId: string,
    resources: CreateMentorshipResourcePayload[],
  ): Promise<MentorshipResource[]> {
    const now = new Date();
    const resourcesWithIds = resources.map((resource) => ({
      id: uuidv4(),
      ...resource,
      mentorshipId,
      createdAt: now,
      updatedAt: now,
    }));

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(resourcesWithIds)
      .select();

    if (error) {
      console.error('Erro ao criar recursos em lote:', error);
      throw new Error(`Erro ao criar recursos em lote: ${error.message}`);
    }

    return data || [];
  }

  async getAllTags(mentorshipId?: string): Promise<string[]> {
    let query = this.supabase.from(this.tableName).select('tags');

    if (mentorshipId) {
      query = query.eq('mentorshipId', mentorshipId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar tags:', error);
      throw new Error(`Erro ao buscar tags: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Extrair todas as tags únicas
    const allTags = new Set<string>();
    data.forEach((resource) => {
      if (resource.tags && Array.isArray(resource.tags)) {
        resource.tags.forEach((tag: string) => allTags.add(tag));
      }
    });

    return Array.from(allTags).sort();
  }
}
