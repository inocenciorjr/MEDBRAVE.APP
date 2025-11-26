import { SupabaseClient } from '@supabase/supabase-js';
import {
  IUserPlanHistoryService,
  UserPlanStatusHistory,
} from '../../../domain/payment/interfaces/IUserPlanHistoryService';
import logger from '../../../utils/logger';
import { ErrorCodes, createError, AppError } from '../../../utils/errors';

/**
 * Implementação do serviço de histórico de planos de usuário usando Supabase
 */
export class SupabaseUserPlanHistoryService implements IUserPlanHistoryService {
  constructor(private supabase: SupabaseClient) {}

  async recordStatusChange(
    userPlanId: string,
    previousStatus: string,
    newStatus: string,
    reason?: string,
    changedBy?: string,
    metadata?: Record<string, any>,
  ): Promise<UserPlanStatusHistory> {
    try {
      const { data, error } = await this.supabase
        .from('user_plan_status_history')
        .insert({
          user_plan_id: userPlanId,
          previous_status: previousStatus,
          new_status: newStatus,
          reason,
          changed_by: changedBy,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao registrar histórico: ${error.message}`,
        );
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(`Erro ao registrar histórico de status: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao registrar histórico',
      );
    }
  }

  async getHistory(userPlanId: string): Promise<UserPlanStatusHistory[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_plan_status_history')
        .select('*')
        .eq('user_plan_id', userPlanId)
        .order('changed_at', { ascending: false });

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao buscar histórico: ${error.message}`,
        );
      }

      return data.map((item) => this.mapToEntity(item));
    } catch (error) {
      logger.error(`Erro ao buscar histórico do plano ${userPlanId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao buscar histórico',
      );
    }
  }

  async getUserHistory(userId: string): Promise<UserPlanStatusHistory[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_plan_status_history')
        .select(
          `
          *,
          user_plans!inner(user_id)
        `,
        )
        .eq('user_plans.user_id', userId)
        .order('changed_at', { ascending: false });

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao buscar histórico do usuário: ${error.message}`,
        );
      }

      return data.map((item) => this.mapToEntity(item));
    } catch (error) {
      logger.error(`Erro ao buscar histórico do usuário ${userId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao buscar histórico do usuário',
      );
    }
  }

  private mapToEntity(data: any): UserPlanStatusHistory {
    return {
      id: data.id,
      userPlanId: data.user_plan_id,
      previousStatus: data.previous_status,
      newStatus: data.new_status,
      reason: data.reason,
      changedBy: data.changed_by,
      changedAt: new Date(data.changed_at),
      metadata: data.metadata || {},
    };
  }
}
