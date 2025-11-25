/**
 * Draft Service
 * Manages CRUD operations for question drafts
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export interface DraftMetadata {
  url: string;
  examName?: string; // Nome da prova (para scraper alternativo)
  totalQuestions: number;
  categorizedQuestions: number;
  extractionDuration?: number;
  categorizationDuration?: number;
  status: 'completed' | 'partial' | 'failed';
  // ✅ Estatísticas de comentários da IA
  commentsGenerated?: number;
  commentsFailed?: number;
  missingCommentQuestions?: string[];
  // ✅ Estatísticas de questões anuladas
  annulledQuestions?: number;
  annulledQuestionNumbers?: string[];
}

export interface Draft {
  id: string;
  job_id?: string;
  url: string;
  title: string;
  questions: any[];
  categorization_results?: any[];
  metadata: DraftMetadata;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

export interface CreateDraftInput {
  jobId?: string;
  url: string;
  title: string;
  questions: any[];
  categorizationResults?: any[];
  metadata: DraftMetadata;
}

export class DraftService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.SUPABASE_URL || '',
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  /**
   * Create a new draft
   */
  async create(input: CreateDraftInput): Promise<Draft> {
    try {
      const draftId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const draftData = {
        id: draftId,
        job_id: input.jobId,
        url: input.url,
        title: input.title,
        questions: input.questions,
        categorization_results: input.categorizationResults || [],
        metadata: input.metadata,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      const { data, error } = await this.supabase
        .from('question_drafts')
        .insert(draftData)
        .select()
        .single();

      if (error) {
        logger.error('[DraftService] Error creating draft:', error);
        throw new Error(`Failed to create draft: ${error.message}`);
      }

      logger.info(`[DraftService] Draft created: ${draftId}`);
      return data as Draft;
    } catch (error) {
      logger.error('[DraftService] Error in create:', error);
      throw error;
    }
  }

  /**
   * Get draft by ID
   */
  async getById(id: string): Promise<Draft | null> {
    try {
      const { data, error } = await this.supabase
        .from('question_drafts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        logger.error('[DraftService] Error getting draft:', error);
        throw new Error(`Failed to get draft: ${error.message}`);
      }

      // Check if expired
      if (data && new Date(data.expires_at) < new Date()) {
        logger.warn(`[DraftService] Draft ${id} has expired`);
        return null;
      }

      return data as Draft;
    } catch (error) {
      logger.error('[DraftService] Error in getById:', error);
      throw error;
    }
  }

  /**
   * Delete draft by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('question_drafts')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('[DraftService] Error deleting draft:', error);
        throw new Error(`Failed to delete draft: ${error.message}`);
      }

      logger.info(`[DraftService] Draft deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error('[DraftService] Error in delete:', error);
      throw error;
    }
  }

  /**
   * List all drafts (optionally filter by jobId)
   */
  async list(jobId?: string): Promise<Draft[]> {
    try {
      // ✅ Buscar TODOS os drafts usando paginação (Supabase limita a 1000 por query)
      const allDrafts: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = this.supabase
          .from('question_drafts')
          .select('id, job_id, url, title, metadata, created_at, updated_at, expires_at')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        if (jobId) {
          query = query.eq('job_id', jobId);
        }

        const { data, error } = await query;

        if (error) {
          logger.error('[DraftService] Error listing drafts:', error);
          throw new Error(`Failed to list drafts: ${error.message}`);
        }

        if (data && data.length > 0) {
          allDrafts.push(...data);
          from += pageSize;
          hasMore = data.length === pageSize; // Se retornou menos que pageSize, acabou
        } else {
          hasMore = false;
        }
      }

      // Retornar drafts sem o campo questions (para performance)
      return allDrafts.map(draft => ({
        ...draft,
        questions: [], // ✅ Não carregar questões na listagem (só ao abrir o draft)
        categorization_results: [],
      })) as Draft[];
    } catch (error) {
      logger.error('[DraftService] Error in list:', error);
      throw error;
    }
  }

  /**
   * Delete expired drafts
   */
  async deleteExpired(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('question_drafts')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) {
        logger.error('[DraftService] Error deleting expired drafts:', error);
        throw new Error(`Failed to delete expired drafts: ${error.message}`);
      }

      const count = data?.length || 0;
      logger.info(`[DraftService] Deleted ${count} expired drafts`);
      return count;
    } catch (error) {
      logger.error('[DraftService] Error in deleteExpired:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const draftService = new DraftService();
