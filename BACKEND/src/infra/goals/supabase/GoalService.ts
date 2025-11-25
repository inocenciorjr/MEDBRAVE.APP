import { supabase } from '../../../config/supabase';
import { UserGoal, CutoffScoreConfig } from '../../../domain/goals/types';
import { logger } from '../../../utils/logger';
import { AppError } from '../../../shared/errors/AppError';

export class GoalService {
  constructor() {}

  // ---------------- Goals -----------------
  async createGoal(
    payload: Omit<UserGoal, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<UserGoal> {
    try {
      const now = new Date().toISOString();
      const goalData = { ...payload, created_at: now, updated_at: now };

      const { data, error } = await supabase
        .from('goals')
        .insert(goalData)
        .select()
        .single();

      if (error) {
        logger.error('GoalService', 'createGoal', error);
        throw AppError.internal('Erro ao criar meta');
      }

      return {
        ...data,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      } as UserGoal;
    } catch (e) {
      logger.error('GoalService', 'createGoal', e);
      throw AppError.internal('Erro ao criar meta');
    }
  }

  async getGoals(userId: string): Promise<UserGoal[]> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('userId', userId);

      if (error) {
        logger.error('GoalService', 'getGoals', error);
        throw AppError.internal('Erro ao buscar metas');
      }

      return data.map((goal) => ({
        ...goal,
        createdAt: new Date(goal.created_at),
        updatedAt: new Date(goal.updated_at),
      })) as UserGoal[];
    } catch (e) {
      logger.error('GoalService', 'getGoals', e);
      throw AppError.internal('Erro ao buscar metas');
    }
  }

  async updateGoal(id: string, data: Partial<UserGoal>): Promise<void> {
    try {
      const updateData = { ...data, updated_at: new Date().toISOString() };

      const { error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', id);

      if (error) {
        logger.error('GoalService', 'updateGoal', error);
        throw AppError.internal('Erro ao atualizar meta');
      }
    } catch (e) {
      logger.error('GoalService', 'updateGoal', e);
      throw AppError.internal('Erro ao atualizar meta');
    }
  }

  async deleteGoal(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id);

      if (error) {
        logger.error('GoalService', 'deleteGoal', error);
        throw AppError.internal('Erro ao deletar meta');
      }
    } catch (e) {
      logger.error('GoalService', 'deleteGoal', e);
      throw AppError.internal('Erro ao deletar meta');
    }
  }

  /**
   * Calcula progresso das metas ativas de um usuário.
   * Por enquanto suporta apenas WEEKLY_QUESTIONS.
   */
  async getGoalsProgress(
    userId: string,
  ): Promise<Array<{ goal: UserGoal; progress: number; gap: number }>> {
    const goals = await this.getGoals(userId);
    const results: Array<{ goal: UserGoal; progress: number; gap: number }> =
      [];

    for (const goal of goals) {
      let progress = goal.currentValue;

      // Calcular dinamicamente apenas alguns tipos
      if (goal.goalType === 'WEEKLY_QUESTIONS') {
        const { weekStart, weekEnd } = this.getWeekRange();
        const { data: responses, error } = await supabase
          .from('enhancedQuestionResponses')
          .select('id')
          .eq('userId', userId)
          .gte('answeredAt', weekStart.toISOString())
          .lte('answeredAt', weekEnd.toISOString());

        if (error) {
          logger.error(
            'Error fetching question responses for goal progress:',
            error,
          );
          progress = 0;
        } else {
          progress = responses?.length || 0;
        }

        // atualizar currentValue em background
        await supabase
          .from('goals')
          .update({
            currentValue: progress,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', goal.id);
      }

      const gap = Math.max(0, goal.targetValue - progress);
      results.push({ goal, progress, gap });
    }
    return results;
  }

  private getWeekRange(refDate: Date = new Date()) {
    const date = new Date(refDate);
    const day = date.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { weekStart: monday, weekEnd: sunday };
  }

  // ---------------- Cutoff configs -----------------
  async createCutoff(
    payload: Omit<CutoffScoreConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CutoffScoreConfig> {
    try {
      const now = new Date().toISOString();
      const cutoffData = { ...payload, created_at: now, updated_at: now };

      const { data, error } = await supabase
        .from('cutoff_scores')
        .insert(cutoffData)
        .select()
        .single();

      if (error) {
        logger.error('GoalService', 'createCutoff', error);
        throw AppError.internal('Erro ao criar configuração de nota de corte');
      }

      return {
        ...data,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      } as CutoffScoreConfig;
    } catch (e) {
      logger.error('GoalService', 'createCutoff', e);
      throw AppError.internal('Erro ao criar configuração de nota de corte');
    }
  }

  async getActiveCutoff(userId: string): Promise<CutoffScoreConfig | null> {
    try {
      const { data, error } = await supabase
        .from('cutoff_scores')
        .select('*')
        .eq('userId', userId)
        .eq('isActive', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        logger.error('GoalService', 'getActiveCutoff', error);
        throw AppError.internal('Erro ao buscar configuração de nota de corte');
      }

      if (!data) {
        return null;
      }

      return {
        ...data,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      } as CutoffScoreConfig;
    } catch (e) {
      logger.error('GoalService', 'getActiveCutoff', e);
      throw AppError.internal('Erro ao buscar configuração de nota de corte');
    }
  }
}
