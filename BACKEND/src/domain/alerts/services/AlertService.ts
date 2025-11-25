import { SupabaseClient } from '@supabase/supabase-js';
import { UserAlert } from '../types';
import { logger } from '../../../utils/logger';
import supabase from '../../../config/supabaseAdmin';
import { v4 as uuidv4 } from 'uuid';

export class AlertService {
  private readonly table = 'user_alerts';
  constructor(private client: SupabaseClient = supabase) {}

  async createAlert(
    payload: Omit<UserAlert, 'id' | 'created_at'>,
  ): Promise<UserAlert> {
    const id = uuidv4();
    const alert: UserAlert = {
      ...payload,
      id,
      created_at: new Date(),
    } as UserAlert;

    const { data, error } = await this.client
      .from(this.table)
      .insert([alert])
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar alerta: ${error.message}`);
    }

    logger.info(
      'AlertService',
      'createAlert',
      `Alert ${alert.code} for ${(alert as any).user_id}`,
    );
    return data;
  }

  async getUserAlerts(
    userId: string,
    includeRead = false,
  ): Promise<UserAlert[]> {
    let query = this.client.from(this.table).select('*').eq('user_id', userId);

    if (!includeRead) {
      query = query.is('read_at', null);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      throw new Error(`Erro ao buscar alertas do usuário: ${error.message}`);
    }

    return data || [];
  }

  async markAsRead(alertId: string): Promise<void> {
    const { error } = await this.client
      .from(this.table)
      .update({ read_at: new Date() })
      .eq('id', alertId);

    if (error) {
      throw new Error(`Erro ao marcar alerta como lido: ${error.message}`);
    }
  }

  async generateWeeklyAlerts(
    userId: string,
    specialtyId: string,
    weekStart: string,
    accuracy: number,
    recallRate?: number,
    lapses?: number,
    goalGap?: number,
  ) {
    // condições
    if (accuracy < 60) {
      await this.createAlert({
        user_id: userId,
        specialty_id: specialtyId,
        type: 'warning',
        code: 'LOW_ACCURACY',
        message: `Sua precisão na semana para esta especialidade foi de ${accuracy}%. Que tal revisar o conteúdo?`,
        week_start: weekStart,
      });
    }
    if (recallRate !== undefined && recallRate < 60) {
      await this.createAlert({
        user_id: userId,
        specialty_id: specialtyId,
        type: 'warning',
        code: 'LOW_RECALL',
        message: `Seu recall nas revisões está baixo (${recallRate}%). Tente revisar novamente em breve.`,
        week_start: weekStart,
      });
    }
    if (lapses !== undefined && lapses >= 5) {
      await this.createAlert({
        user_id: userId,
        specialty_id: specialtyId,
        type: 'info',
        code: 'EXCESS_LAPSES',
        message: `Percebemos ${lapses} lapses em suas revisões. Talvez seja hora de focar nos conceitos base.`,
        week_start: weekStart,
      });
    }
    if (goalGap !== undefined && goalGap > 0) {
      await this.createAlert({
        user_id: userId,
        specialty_id: specialtyId,
        type: 'info',
        code: 'GOAL_GAP',
        message: `Você ficou ${goalGap}% abaixo da meta nesta especialidade. Continue praticando!`,
        week_start: weekStart,
      });
    }
  }
}
