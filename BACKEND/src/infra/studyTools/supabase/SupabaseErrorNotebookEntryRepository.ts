import { SupabaseClient } from '@supabase/supabase-js';
import { ErrorNotebookEntry } from '../../../domain/studyTools/errorNotebook/types';
import {
  IErrorNotebookEntryRepository,
  ErrorNotebookEntryFilters,
  PaginatedErrorNotebookEntries,
  CreateErrorEntryPayload,
  UpdateErrorEntryPayload,
} from '../../../domain/studyTools/errorNotebook/repositories/IErrorNotebookEntryRepository';
// PaginationOptions moved to shared types
interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
import { ReviewQuality } from '../../../domain/studyTools/flashcards/types';

export class SupabaseErrorNotebookEntryRepository
implements IErrorNotebookEntryRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(data: CreateErrorEntryPayload): Promise<ErrorNotebookEntry> {
    const now = new Date().toISOString();

    // First, get question details to populate the entry
    const { data: questionData, error: questionError } = await this.supabase
      .from('questions')
      .select('statement, correct_answer, subject')
      .eq('id', data.questionId)
      .single();

    if (questionError) {
      throw new Error(
        `Failed to get question details: ${questionError.message}`,
      );
    }

    const entryData = {
      userId: data.userId,
      question_id: data.questionId,
      user_note: data.userNote,
      user_explanation: data.userExplanation,
      key_points: data.keyPoints || [],
      tags: data.tags || [],
      question_statement: questionData.statement,
      correct_answer: questionData.correct_answer,
      user_original_answer: '', // Will be updated when available
      question_subject: questionData.subject,
      is_in_review_system: false,
      fsrs_card_id: null,
      lastReviewedAt: null,
      difficulty: data.difficulty || 'MEDIUM',
      confidence: data.confidence || 3,
      notebook_id: null, // Will be set if needed
      createdAt: now,
      updatedAt: now,
    };

    const { data: result, error } = await this.supabase
      .from('error_notebook_entries')
      .insert(entryData)
      .select()
      .single();

    if (error) {
      throw new Error(
        `Failed to create error notebook entry: ${error.message}`,
      );
    }

    return this.mapToErrorNotebookEntry(result);
  }

  async findById(id: string): Promise<ErrorNotebookEntry | null> {
    const { data, error } = await this.supabase
      .from('error_notebook_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find error notebook entry: ${error.message}`);
    }

    return this.mapToErrorNotebookEntry(data);
  }

  async findByNotebook(
    notebookId: string,
    filters: ErrorNotebookEntryFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedErrorNotebookEntries> {
    let query = this.supabase
      .from('error_notebook_entries')
      .select('*', { count: 'exact' })
      .eq('notebook_id', notebookId);

    if (filters.isResolved !== undefined) {
      query = query.eq('is_in_review_system', filters.isResolved);
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
    if (filters.search) {
      query = query.or(
        `user_note.ilike.%${filters.search}%,user_explanation.ilike.%${filters.search}%,question_statement.ilike.%${filters.search}%`,
      );
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
      throw new Error(
        `Failed to find error notebook entries: ${error.message}`,
      );
    }

    const entries =
      data?.map((item) => this.mapToErrorNotebookEntry(item)) || [];
    const total = count || 0;
    const hasMore = pagination.page * pagination.limit < total;

    return {
      entries,
      total,
      hasMore,
    };
  }

  async update(
    id: string,
    userId: string,
    data: UpdateErrorEntryPayload,
  ): Promise<ErrorNotebookEntry | null> {
    const updateData: any = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if (data.isResolved !== undefined) {
      updateData.is_in_review_system = data.isResolved;
      delete updateData.isResolved;
    }
    if (data.userNote !== undefined) {
      updateData.user_note = data.userNote;
      delete updateData.userNote;
    }
    if (data.errorDescription !== undefined) {
      updateData.user_explanation = data.errorDescription;
      delete updateData.errorDescription;
    }
    if (data.userAnswer !== undefined) {
      updateData.user_original_answer = data.userAnswer;
      delete updateData.userAnswer;
    }
    if (data.correctAnswer !== undefined) {
      updateData.correct_answer = data.correctAnswer;
      delete updateData.correctAnswer;
    }
    if (data.personalNotes !== undefined) {
      updateData.user_note = data.personalNotes;
      delete updateData.personalNotes;
    }

    const { data: result, error } = await this.supabase
      .from('error_notebook_entries')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(
        `Failed to update error notebook entry: ${error.message}`,
      );
    }

    return this.mapToErrorNotebookEntry(result);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('error_notebook_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(
        `Failed to delete error notebook entry: ${error.message}`,
      );
    }

    return true;
  }

  async recordReview(
    id: string,
    userId: string,
    _quality: ReviewQuality,
    notes?: string | null,
  ): Promise<ErrorNotebookEntry | null> {
    const now = new Date().toISOString();

    const updateData: any = {
      lastReviewedAt: now,
      updatedAt: now,
    };

    if (notes) {
      updateData.user_note = notes;
    }

    const { data: result, error } = await this.supabase
      .from('error_notebook_entries')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to record review: ${error.message}`);
    }

    return this.mapToErrorNotebookEntry(result);
  }

  async toggleResolved(
    id: string,
    userId: string,
  ): Promise<ErrorNotebookEntry | null> {
    const entry = await this.findById(id);
    if (!entry || entry.user_id !== userId) {
      return null;
    }

    const newResolvedStatus = !entry.is_in_review_system;

    return this.update(id, userId, { isResolved: newResolvedStatus });
  }

  async getBySource(
    notebookId: string,
    userId: string,
    _sourceType: string,
    sourceId: string,
  ): Promise<ErrorNotebookEntry | null> {
    const { data, error } = await this.supabase
      .from('error_notebook_entries')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('user_id', userId)
      .eq('question_id', sourceId) // Assuming sourceId is questionId for now
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(
        `Failed to find error notebook entry by source: ${error.message}`,
      );
    }

    return this.mapToErrorNotebookEntry(data);
  }

  private mapToErrorNotebookEntry(data: any): ErrorNotebookEntry {
    return {
      id: data.id,
      user_id: data.user_id,
      question_id: data.question_id,
      user_note: data.user_note,
      user_explanation: data.user_explanation,
      key_points: data.key_points || [],
      tags: data.tags || [],
      question_statement: data.question_statement,
      correct_answer: data.correct_answer,
      user_original_answer: data.user_original_answer,
      question_subject: data.question_subject,
      is_in_review_system: data.is_in_review_system,
      last_reviewed_at: data.last_reviewed_at || null,
      difficulty: data.difficulty,
      confidence: data.confidence || 0,
      notebook_id: data.notebook_id || null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}
