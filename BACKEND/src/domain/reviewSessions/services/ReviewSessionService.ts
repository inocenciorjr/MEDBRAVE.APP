import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../../config/supabaseAdmin';

export interface ReviewSession {
  id?: string;
  user_id: string;
  content_type: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK';
  date: string;
  review_ids: string[];
  completed_ids: string[];
  current_index?: number;
  status: 'active' | 'completed' | 'abandoned';
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export class ReviewSessionService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabase;
  }

  async createSession(userId: string, contentType: string, reviewIds: string[], date?: string): Promise<ReviewSession> {
    const { data, error } = await this.supabase
      .from('review_sessions')
      .insert({
        user_id: userId,
        content_type: contentType,
        date: date || new Date().toISOString().split('T')[0],
        review_ids: reviewIds,
        completed_ids: [],
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar sessão: ${error.message}`);
    }

    return data;
  }

  async getActiveSession(userId: string, contentType: string): Promise<ReviewSession | null> {
    const { data, error } = await this.supabase
      .from('review_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar sessão: ${error.message}`);
    }

    return data || null;
  }

  async markItemCompleted(userId: string, sessionId: string, itemId: string): Promise<ReviewSession> {
    const session = await this.getSessionById(userId, sessionId);
    
    if (!session) {
      throw new Error('Sessão não encontrada');
    }

    const completedIds = [...session.completed_ids, itemId];
    const isCompleted = completedIds.length >= session.review_ids.length;

    const { data, error } = await this.supabase
      .from('review_sessions')
      .update({
        completed_ids: completedIds,
        status: isCompleted ? 'completed' : 'active',
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar sessão: ${error.message}`);
    }

    return data;
  }

  async completeSession(userId: string, sessionId: string): Promise<ReviewSession> {
    const { data, error } = await this.supabase
      .from('review_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao finalizar sessão: ${error.message}`);
    }

    return data;
  }

  async getSessionById(userId: string, sessionId: string): Promise<ReviewSession | null> {
    const { data, error } = await this.supabase
      .from('review_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar sessão: ${error.message}`);
    }

    return data || null;
  }

  async listSessions(
    userId: string,
    contentType?: string,
    date?: string,
    status?: string
  ): Promise<ReviewSession[]> {
    let query = this.supabase
      .from('review_sessions')
      .select('*')
      .eq('user_id', userId);

    if (contentType) {
      query = query.eq('content_type', contentType);
    }

    if (date) {
      query = query.eq('date', date);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('started_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar sessões: ${error.message}`);
    }

    return data || [];
  }

  async updateProgress(userId: string, sessionId: string, currentIndex: number): Promise<ReviewSession> {
    const { data, error } = await this.supabase
      .from('review_sessions')
      .update({
        current_index: currentIndex,
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar progresso: ${error.message}`);
    }

    return data;
  }
}
