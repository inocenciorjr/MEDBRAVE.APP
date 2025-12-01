import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../../config/supabaseAdmin';
import { logger } from '../../../utils/logger';

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

  /**
   * Cria uma nova sessão de revisão
   * IMPORTANTE: Verifica se já existe sessão ativa para a mesma data/tipo antes de criar
   */
  async createSession(userId: string, contentType: string, reviewIds: string[], date?: string): Promise<ReviewSession> {
    const sessionDate = date || new Date().toISOString().split('T')[0];
    
    // Verificar se já existe sessão ativa para esta data/tipo
    const existingSession = await this.getSessionByDate(userId, contentType, sessionDate);
    
    if (existingSession && existingSession.status === 'active') {
      logger.info(`[ReviewSessionService] Sessão ativa já existe para ${contentType} em ${sessionDate}, retornando existente`);
      return existingSession;
    }
    
    const { data, error } = await this.supabase
      .from('review_sessions')
      .insert({
        user_id: userId,
        content_type: contentType,
        date: sessionDate,
        review_ids: reviewIds,
        completed_ids: [],
        current_index: 0,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar sessão: ${error.message}`);
    }

    logger.info(`[ReviewSessionService] Nova sessão criada: ${data.id} para ${contentType} em ${sessionDate}`);
    return data;
  }

  /**
   * Busca sessão por data específica (para uso no planner)
   * Retorna sessão ativa OU abandonada (para permitir retomar)
   */
  async getSessionByDate(userId: string, contentType: string, date: string): Promise<ReviewSession | null> {
    const { data, error } = await this.supabase
      .from('review_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .eq('date', date)
      .in('status', ['active', 'abandoned']) // Permite retomar sessões abandonadas
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error(`Erro ao buscar sessão por data: ${error.message}`);
      return null;
    }

    return data || null;
  }

  /**
   * Busca sessão ativa mais recente (sem filtro de data)
   * @deprecated Use getSessionByDate para lógica correta
   */
  async getActiveSession(userId: string, contentType: string): Promise<ReviewSession | null> {
    const { data, error } = await this.supabase
      .from('review_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error(`Erro ao buscar sessão ativa: ${error.message}`);
      return null;
    }

    return data || null;
  }

  /**
   * Busca ou cria sessão para uma data específica
   * Usado pelo planner para retomar sessões antigas
   */
  async getOrCreateSessionForDate(
    userId: string, 
    contentType: string, 
    date: string, 
    reviewIds: string[]
  ): Promise<ReviewSession> {
    // Primeiro, tentar buscar sessão existente
    const existingSession = await this.getSessionByDate(userId, contentType, date);
    
    if (existingSession) {
      // Se estava abandonada, reativar
      if (existingSession.status === 'abandoned') {
        logger.info(`[ReviewSessionService] Reativando sessão abandonada ${existingSession.id}`);
        await this.supabase
          .from('review_sessions')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', existingSession.id);
        existingSession.status = 'active';
      }
      return existingSession;
    }
    
    // Se não existe, criar nova
    return this.createSession(userId, contentType, reviewIds, date);
  }

  async markItemCompleted(userId: string, sessionId: string, itemId: string): Promise<ReviewSession> {
    const session = await this.getSessionById(userId, sessionId);
    
    if (!session) {
      throw new Error('Sessão não encontrada');
    }

    // Evitar duplicatas no completed_ids
    if (session.completed_ids.includes(itemId)) {
      logger.info(`[ReviewSessionService] Item ${itemId} já está marcado como completado`);
      return session;
    }

    const completedIds = [...session.completed_ids, itemId];
    const isCompleted = completedIds.length >= session.review_ids.length;
    
    // Atualizar current_index para o próximo item
    const newCurrentIndex = Math.min(completedIds.length, session.review_ids.length - 1);

    const { data, error } = await this.supabase
      .from('review_sessions')
      .update({
        completed_ids: completedIds,
        current_index: newCurrentIndex,
        status: isCompleted ? 'completed' : 'active',
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar sessão: ${error.message}`);
    }

    logger.info(`[ReviewSessionService] Item ${itemId} marcado como completado. Progresso: ${completedIds.length}/${session.review_ids.length}`);
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
