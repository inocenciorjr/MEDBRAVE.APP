import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../../config/supabaseAdmin';

export interface PlannerEvent {
  id?: string;
  user_id?: string;
  event_type: 'system_review' | 'user_task';
  content_type?: string;
  title: string;
  description?: string;
  date: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  color: string;
  icon: string;
  status?: 'pending' | 'in_progress' | 'completed';
  completed_count?: number;
  total_count?: number;
  completed_at?: string;
  session_id?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
  is_recurring?: boolean;
  recurrence_pattern?: {
    days: number[]; // 0=Domingo, 1=Segunda, ..., 6=Sábado
  };
  parent_event_id?: string;
  recurrence_end_date?: string;
}

export class PlannerService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabase;
  }

  async getEvents(userId: string, startDate?: string, endDate?: string): Promise<PlannerEvent[]> {
    // Se tiver intervalo de datas, usar a função que expande eventos recorrentes
    if (startDate && endDate) {
      const { data, error } = await this.supabase
        .rpc('expand_recurring_events', {
          p_user_id: userId,
          p_start_date: startDate,
          p_end_date: endDate,
        });

      if (error) {
        throw new Error(`Erro ao buscar eventos: ${error.message}`);
      }

      return data || [];
    }

    // Caso contrário, buscar normalmente
    let query = this.supabase
      .from('planner_events')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('start_hour', { ascending: true });

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar eventos: ${error.message}`);
    }

    return data || [];
  }

  async createEvent(userId: string, eventData: Omit<PlannerEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PlannerEvent> {
    // Validar que tarefas de usuário têm event_type correto
    if (eventData.content_type === 'USER_TASK' && eventData.event_type !== 'user_task') {
      console.warn('[PlannerService] Corrigindo event_type para user_task (content_type é USER_TASK)');
      eventData.event_type = 'user_task';
    }
    
    // Validar que revisões do sistema têm event_type correto
    const systemContentTypes = ['FLASHCARD', 'QUESTION', 'ERROR_NOTEBOOK'];
    if (systemContentTypes.includes(eventData.content_type || '') && eventData.event_type !== 'system_review') {
      console.warn('[PlannerService] Corrigindo event_type para system_review (content_type é de revisão)');
      eventData.event_type = 'system_review';
    }
    
    const { data, error } = await this.supabase
      .from('planner_events')
      .insert({
        ...eventData,
        user_id: userId,
      })
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao criar evento: ${error.message}`);
    }

    if (!data) {
      throw new Error('Erro ao criar evento: nenhum dado retornado');
    }

    return data;
  }

  async updateEvent(userId: string, eventId: string, eventData: Partial<PlannerEvent>): Promise<PlannerEvent> {
    // Remover campos que não devem ser atualizados
    const { id, user_id, created_at, updated_at, ...updateData } = eventData;

    // Primeiro verificar se o evento existe
    const { data: existingEvent } = await this.supabase
      .from('planner_events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingEvent) {
      throw new Error('Evento não encontrado ou sem permissão');
    }

    const { data, error } = await this.supabase
      .from('planner_events')
      .update(updateData)
      .eq('id', eventId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao atualizar evento: ${error.message}`);
    }

    return data || existingEvent;
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const { error } = await this.supabase
      .from('planner_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao deletar evento: ${error.message}`);
    }
  }

  async updateProgress(userId: string, eventId: string, completedCount: number, totalCount: number): Promise<PlannerEvent> {
    const status = completedCount >= totalCount ? 'completed' : completedCount > 0 ? 'in_progress' : 'pending';
    const completed_at = status === 'completed' ? new Date().toISOString() : null;

    const { data, error } = await this.supabase
      .from('planner_events')
      .update({
        completed_count: completedCount,
        total_count: totalCount,
        status,
        completed_at,
      })
      .eq('id', eventId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao atualizar progresso: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Evento não encontrado ao atualizar progresso');
    }

    if (!data) {
      throw new Error('Evento não encontrado ou sem permissão');
    }

    return data;
  }

  async getEventByDateAndType(userId: string, date: string, contentType: string): Promise<PlannerEvent | null> {
    const { data, error } = await this.supabase
      .from('planner_events')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('content_type', contentType)
      .eq('event_type', 'system_review')
      .maybeSingle(); // Usar maybeSingle() em vez de single() para não gerar erro quando não encontra

    if (error) {
      throw new Error(`Erro ao buscar evento: ${error.message}`);
    }

    return data || null;
  }
}
