import { SupabaseClient } from '@supabase/supabase-js';
import {
  ErrorNotebook,
  CreateErrorNotebookPayload,
  UpdateErrorNotebookPayload,
  ErrorNotebookStats,
} from '../../../domain/studyTools/errorNotebook/types';
import {
  IErrorNotebookRepository,
  ErrorNotebookFilters,
  PaginatedErrorNotebooks,
} from '../../../domain/studyTools/errorNotebook/repositories/IErrorNotebookRepository';
// PaginationOptions moved to shared types
interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class SupabaseErrorNotebookRepository
implements IErrorNotebookRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(data: CreateErrorNotebookPayload): Promise<ErrorNotebook> {
    const now = new Date().toISOString();
    const notebookData = {
      user_id: data.user_id,
      title: data.title,
      description: data.description || '',
      is_public: data.is_public || false,
      entry_count: 0,
      last_entry_at: null,
      tags: data.tags || [],
      created_at: now,
      updated_at: now,
    };

    const { data: result, error } = await this.supabase
      .from('error_notebooks')
      .insert(notebookData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create error notebook: ${error.message}`);
    }

    return this.mapToErrorNotebook(result);
  }

  async findById(id: string): Promise<ErrorNotebook | null> {
    const { data, error } = await this.supabase
      .from('error_notebooks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find error notebook: ${error.message}`);
    }

    return this.mapToErrorNotebook(data);
  }

  async findByUser(
    userId: string,
    filters: ErrorNotebookFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedErrorNotebooks> {
    let query = this.supabase
      .from('error_notebooks')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
      );
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    const offset = (pagination.page - 1) * pagination.limit;
    query = query.range(offset, offset + pagination.limit - 1);

    if (pagination.sortBy) {
      const order =
        pagination.sortOrder === 'desc'
          ? { ascending: false }
          : { ascending: true };
      query = query.order(pagination.sortBy, order);
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to find error notebooks: ${error.message}`);
    }

    const notebooks = data?.map((item) => this.mapToErrorNotebook(item)) || [];
    const total = count || 0;
    const hasMore = pagination.page * pagination.limit < total;

    return {
      items: notebooks,
      total,
      hasMore,
    };
  }

  async update(
    id: string,
    userId: string,
    data: UpdateErrorNotebookPayload,
  ): Promise<ErrorNotebook | null> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.is_public !== undefined) {
      updateData.is_public = data.is_public;
    }

    const { data: result, error } = await this.supabase
      .from('error_notebooks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to update error notebook: ${error.message}`);
    }

    return this.mapToErrorNotebook(result);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('error_notebooks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete error notebook: ${error.message}`);
    }

    return true;
  }

  async getStats(
    id: string,
    userId: string,
  ): Promise<ErrorNotebookStats | null> {
    // Get the notebook first to ensure it exists and belongs to the user
    const notebook = await this.findById(id);
    if (!notebook || notebook.user_id !== userId) {
      return null;
    }

    // Get entries count and statistics
    const { data: entriesData, error: entriesError } = await this.supabase
      .from('error_notebook_entries')
      .select('id, is_in_review_system, createdAt')
      .eq('notebook_id', id);

    if (entriesError) {
      throw new Error(
        `Failed to get error notebook stats: ${entriesError.message}`,
      );
    }

    const totalEntries = entriesData?.length || 0;
    const resolvedEntries =
      entriesData?.filter((entry) => entry.is_in_review_system).length || 0;
    const unresolvedEntries = totalEntries - resolvedEntries;

    // Calculate average resolution time (placeholder implementation)
    const averageResolutionTime = 0; // TODO: Implement proper calculation

    // Get entries by category (placeholder implementation)
    const entriesByCategory: Record<string, number> = {}; // TODO: Implement proper categorization

    return {
      total_entries: totalEntries,
      resolved_entries: resolvedEntries,
      unresolved_entries: unresolvedEntries,
      entries_by_category: entriesByCategory,
      last_updated_at: notebook.updated_at,
      average_resolution_time: averageResolutionTime,
    };
  }

  async incrementEntryCount(id: string): Promise<void> {
    const now = new Date().toISOString();

    // Primeiro buscar o valor atual
    const { data: currentData, error: fetchError } = await this.supabase
      .from('error_notebooks')
      .select('entry_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch current entry count: ${fetchError.message}`);
    }

    const newCount = (currentData?.entry_count || 0) + 1;

    const { error } = await this.supabase
      .from('error_notebooks')
      .update({
        entry_count: newCount,
        last_entry_at: now,
        updated_at: now,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to increment entry count: ${error.message}`);
    }
  }

  async decrementEntryCount(id: string): Promise<void> {
    const now = new Date().toISOString();

    // Primeiro buscar o valor atual
    const { data: currentData, error: fetchError } = await this.supabase
      .from('error_notebooks')
      .select('entry_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch current entry count: ${fetchError.message}`);
    }

    const newCount = Math.max((currentData?.entry_count || 0) - 1, 0);

    const { error } = await this.supabase
      .from('error_notebooks')
      .update({
        entry_count: newCount,
        updated_at: now,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to decrement entry count: ${error.message}`);
    }
  }

  private mapToErrorNotebook(data: any): ErrorNotebook {
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      description: data.description,
      is_public: data.is_public,
      entry_count: data.entry_count,
      last_entry_at: data.last_entry_at,
      tags: data.tags || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}


