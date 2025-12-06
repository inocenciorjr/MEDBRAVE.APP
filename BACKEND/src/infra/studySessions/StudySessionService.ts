import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';
import {
  IStudySessionService,
  StudySession,
  StartSessionPayload,
  EndSessionPayload,
} from '../../domain/studySessions/interfaces/IStudySessionService';

export class StudySessionService implements IStudySessionService {
  private startSessionLocks: Map<string, Promise<StudySession>> = new Map();
  
  constructor(private supabase: SupabaseClient) {}

  async startSession(userId: string, payload: StartSessionPayload): Promise<StudySession> {
    // 🔒 Prevenir race conditions com lock por usuário
    const lockKey = `${userId}:${payload.activityType}`;
    
    if (this.startSessionLocks.has(lockKey)) {
      return this.startSessionLocks.get(lockKey)!;
    }

    const sessionPromise = this.createSession(userId, payload);
    this.startSessionLocks.set(lockKey, sessionPromise);

    try {
      const session = await sessionPromise;
      return session;
    } finally {
      // Remover lock após 2 segundos
      setTimeout(() => {
        this.startSessionLocks.delete(lockKey);
      }, 2000);
    }
  }

  private async createSession(userId: string, payload: StartSessionPayload): Promise<StudySession> {
    try {
      // Validar userId
      if (!userId || userId === 'undefined' || userId === 'null') {
        throw new Error('userId inválido');
      }
      
      // Finalizar qualquer sessão ativa anterior
      await this.finalizeActiveSessions(userId);

      const { data, error } = await this.supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          activity_type: payload.activityType,
          started_at: new Date().toISOString(),
          is_active: true,
          duration_seconds: 0,
          items_completed: 0,
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao inserir sessão:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Nenhum dado retornado após insert');
      }

      return this.mapToStudySession(data);
    } catch (error) {
      logger.error('Erro ao iniciar sessão de estudo:', error);
      throw error;
    }
  }

  async endSession(userId: string, sessionId: string, payload: EndSessionPayload): Promise<StudySession> {
    try {
      // Buscar sessão
      const { data: session, error: fetchError } = await this.supabase
        .from('study_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const endedAt = new Date();
      const startedAt = new Date(session.started_at);
      const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

      const { data, error } = await this.supabase
        .from('study_sessions')
        .update({
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSeconds,
          items_completed: payload.itemsCompleted || session.items_completed,
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToStudySession(data);
    } catch (error) {
      logger.error('Erro ao finalizar sessão:', error);
      throw error;
    }
  }

  async heartbeat(userId: string, sessionId: string): Promise<StudySession> {
    try {
      // Validar userId e sessionId
      if (!userId || userId === 'undefined' || userId === 'null') {
        throw new Error('userId inválido');
      }
      if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
        throw new Error('sessionId inválido');
      }

      const { data, error } = await this.supabase
        .from('study_sessions')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .select()
        .maybeSingle();

      if (error) throw error;

      // Se a sessão não existe mais (foi finalizada ou expirou), retornar sessão vazia
      if (!data) {
        const now = new Date().toISOString();
        return {
          id: sessionId,
          userId,
          activityType: 'questions',
          startedAt: now,
          isActive: false,
          durationSeconds: 0,
          itemsCompleted: 0,
          createdAt: now,
          updatedAt: now,
        };
      }

      return this.mapToStudySession(data);
    } catch (error) {
      logger.error('Erro ao atualizar heartbeat:', error);
      throw error;
    }
  }

  async getActiveSession(userId: string): Promise<StudySession | null> {
    try {
      // Validar userId
      if (!userId || userId === 'undefined' || userId === 'null') {
        return null;
      }

      const { data, error } = await this.supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.mapToStudySession(data);
    } catch (error) {
      logger.error('Erro ao buscar sessão ativa:', error);
      return null;
    }
  }

  async getTotalStudyTime(userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('study_sessions')
        .select('duration_seconds')
        .eq('user_id', userId)
        .eq('is_active', false);

      if (error) throw error;

      return (data || []).reduce((sum, session) => sum + (session.duration_seconds || 0), 0);
    } catch (error) {
      logger.error('Erro ao calcular tempo total:', error);
      return 0;
    }
  }

  async getWeeklyStudyTime(userId: string): Promise<{
    totalMinutes: number;
    totalHours: number;
    sessionsCount: number;
    weekStart: string;
    weekEnd: string;
  }> {
    try {
      // Calcular início da semana (segunda-feira às 00:00)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, etc
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Se domingo, volta 6 dias
      
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);

      // Fim da semana (domingo às 23:59:59)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const { data, error } = await this.supabase
        .from('study_sessions')
        .select('duration_seconds')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .gte('started_at', weekStart.toISOString())
        .lte('started_at', weekEnd.toISOString());

      if (error) {
        logger.error('Erro ao buscar sessões da semana:', error);
        throw error;
      }

      const totalSeconds = (data || []).reduce((sum, session) => sum + (session.duration_seconds || 0), 0);
      const totalMinutes = Math.round(totalSeconds / 60);
      const totalHours = parseFloat((totalSeconds / 3600).toFixed(1));

      return {
        totalMinutes,
        totalHours,
        sessionsCount: data?.length || 0,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
      };
    } catch (error) {
      logger.error('Erro ao calcular tempo semanal:', error);
      return {
        totalMinutes: 0,
        totalHours: 0,
        sessionsCount: 0,
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
      };
    }
  }

  private async finalizeActiveSessions(userId: string): Promise<void> {
    try {
      // Validar userId
      if (!userId || userId === 'undefined' || userId === 'null') {
        return;
      }

      const { data: activeSessions } = await this.supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!activeSessions || activeSessions.length === 0) return;

      for (const session of activeSessions) {
        const endedAt = new Date();
        const startedAt = new Date(session.started_at);
        let durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

        // Limitar duração máxima a 2 horas (7200 segundos)
        const MAX_DURATION = 2 * 60 * 60; // 2 horas
        if (durationSeconds > MAX_DURATION) {
          durationSeconds = MAX_DURATION;
        }

        await this.supabase
          .from('study_sessions')
          .update({
            ended_at: endedAt.toISOString(),
            duration_seconds: durationSeconds,
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.id);
      }
    } catch (error) {
      logger.error('Erro ao finalizar sessões ativas:', error);
    }
  }

  /**
   * Limpar sessões órfãs (ativas há mais de 2 horas)
   */
  async cleanupOrphanedSessions(userId?: string): Promise<{ cleaned: number; sessions: string[] }> {
    try {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      let query = this.supabase
        .from('study_sessions')
        .select('*')
        .eq('is_active', true)
        .lt('started_at', twoHoursAgo.toISOString());

      // Se userId fornecido, limpar apenas do usuário
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: orphanedSessions, error } = await query;

      if (error) throw error;

      if (!orphanedSessions || orphanedSessions.length === 0) {
        return { cleaned: 0, sessions: [] };
      }

      const sessionIds: string[] = [];
      const MAX_DURATION = 2 * 60 * 60; // 2 horas

      for (const session of orphanedSessions) {
        const endedAt = new Date();
        const startedAt = new Date(session.started_at);
        let durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

        // Limitar a 2 horas
        if (durationSeconds > MAX_DURATION) {
          durationSeconds = MAX_DURATION;
        }

        await this.supabase
          .from('study_sessions')
          .update({
            ended_at: endedAt.toISOString(),
            duration_seconds: durationSeconds,
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        sessionIds.push(session.id);
      }

      return {
        cleaned: sessionIds.length,
        sessions: sessionIds,
      };
    } catch (error) {
      logger.error('[StudySessionService] Erro ao limpar sessões órfãs:', error);
      throw error;
    }
  }

  async getUserSessions(userId: string, startDate: Date, endDate: Date): Promise<StudySession[]> {
    try {
      const { data, error } = await this.supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString())
        .order('started_at', { ascending: false });

      if (error) {
        logger.error('Erro ao buscar sessões do usuário:', error);
        throw error;
      }

      return (data || []).map(session => this.mapToStudySession(session));
    } catch (error) {
      logger.error('Erro ao buscar sessões do usuário:', error);
      return [];
    }
  }

  private mapToStudySession(data: any): StudySession {
    return {
      id: data.id,
      userId: data.user_id,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      durationSeconds: data.duration_seconds || 0,
      activityType: data.activity_type,
      itemsCompleted: data.items_completed || 0,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
