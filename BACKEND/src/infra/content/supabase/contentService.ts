// Serviço de Conteúdo (Artigos)
// Implementação inicial - esqueleto

import {
  Content,
  CreateContentDTO,
  UpdateContentDTO,
  ContentQueryOptions,
  PaginatedContentResult,
} from '../../../domain/content/types';
import { IContentService } from '../../../domain/content/interfaces/IContentService';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../../config/supabaseAdmin';

const TABLE = 'articles';

export class ContentService implements IContentService {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  async createContent(data: CreateContentDTO): Promise<Content> {
    const now = new Date();
    const id = uuidv4();

    // Configurar valores padrão
    const article: Content = {
      id,
      title: data.title || '',
      content: data.content || '',
      authorId: data.author_id,
      tags: data.tags || [],
      categoryId: data.category_id || undefined,
      status: data.status || 'DRAFT',
      summary: data.summary || undefined,
      isPublic: data.is_public !== undefined ? data.is_public : false,
      imageUrl: data.image_url || undefined,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: data.status === 'PUBLISHED' ? now : undefined,
      readTimeMinutes: this.calculateReadTime(data.content || ''),
    };

    const { data: insertedData, error } = await this.client
      .from(TABLE)
      .insert([article])
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar conteúdo: ${error.message}`);
    }

    return insertedData;
  }

  async getContentById(id: string): Promise<Content | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar conteúdo: ${error.message}`);
    }

    return data;
  }

  async updateContent(
    id: string,
    data: UpdateContentDTO,
  ): Promise<Content | null> {
    const existing = await this.getContentById(id);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const updates: Partial<Content> = {
      ...data,
      updatedAt: now,
    };

    if (
      data &&
      data.status === 'PUBLISHED' &&
      existing.status !== 'PUBLISHED'
    ) {
      updates.publishedAt = now;
    }

    // Recalcular o tempo de leitura se o conteúdo foi alterado
    if (data.content) {
      updates.readTimeMinutes = this.calculateReadTime(data.content);
    }

    const { data: updatedData, error } = await this.client
      .from(TABLE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar conteúdo: ${error.message}`);
    }

    return updatedData;
  }

  async deleteContent(id: string): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar conteúdo: ${error.message}`);
    }
  }

  async listContent(
    options?: ContentQueryOptions,
  ): Promise<PaginatedContentResult> {
    let query = this.client.from(TABLE).select('*');

    // Aplicar filtros
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.category_id) {
      query = query.eq('categoryId', options.category_id);
    }

    if (options?.author_id) {
      query = query.eq('authorId', options.author_id);
    }

    if (options?.tags && options.tags.length > 0) {
      query = query.overlaps('tags', options.tags);
    }

    if (options?.search_term) {
      query = query.ilike('title', `%${options.search_term}%`);
    }

    // Ordenação
    const sortBy = options?.sort_by || 'createdAt';
    const sortOrder = options?.sort_order || 'desc';
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Paginação
    const limit = options?.limit || 10;
    const page = options?.page || 1;
    const offset = (page - 1) * limit;

    // Contar total de registros
    const { count, error: countError } = await this.client
      .from(TABLE)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Erro ao contar conteúdos: ${countError.message}`);
    }

    const total = count || 0;

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    // Executar consulta
    const { data: items, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar conteúdos: ${error.message}`);
    }

    return {
      items: items || [],
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  async incrementViewCount(id: string): Promise<Content | null> {
    const existing = await this.getContentById(id);
    if (!existing) {
      return null;
    }

    const { data, error } = await this.client
      .from(TABLE)
      .update({
        viewCount: existing.viewCount + 1,
        updatedAt: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao incrementar visualizações: ${error.message}`);
    }

    return data;
  }

  async publishContent(id: string): Promise<Content | null> {
    const existing = await this.getContentById(id);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const { data, error } = await this.client
      .from(TABLE)
      .update({
        status: 'PUBLISHED',
        publishedAt: now,
        updatedAt: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao publicar conteúdo: ${error.message}`);
    }

    return data;
  }

  async archiveContent(id: string): Promise<Content | null> {
    const existing = await this.getContentById(id);
    if (!existing) {
      return null;
    }

    const { data, error } = await this.client
      .from(TABLE)
      .update({
        status: 'ARCHIVED',
        updatedAt: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao arquivar conteúdo: ${error.message}`);
    }

    return data;
  }

  async searchContent(
    term: string,
    options?: ContentQueryOptions,
  ): Promise<PaginatedContentResult> {
    let query = this.client
      .from(TABLE)
      .select('*')
      .or(`title.ilike.%${term}%,content.ilike.%${term}%`);

    // Aplicar filtros adicionais
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.category_id) {
      query = query.eq('categoryId', options.category_id);
    }

    if (options?.author_id) {
      query = query.eq('authorId', options.author_id);
    }

    if (options?.tags && options.tags.length > 0) {
      query = query.overlaps('tags', options.tags);
    }

    // Ordenação
    const sortBy = options?.sort_by || 'createdAt';
    const sortOrder = options?.sort_order || 'desc';
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Paginação
    const limit = options?.limit || 10;
    const page = options?.page || 1;
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data: items, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar conteúdos: ${error.message}`);
    }

    const total = (items || []).length;

    return {
      items: items || [],
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  // Utilitários

  private calculateReadTime(content: string): number {
    // Média de palavras por minuto para leitura
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / wordsPerMinute);
    return Math.max(1, readTime); // Mínimo de 1 minuto
  }
}
