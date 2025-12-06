import { SupabaseClient } from '@supabase/supabase-js';

export interface UserGoals {
  id: string;
  user_id: string;
  daily_questions_goal: number;
  daily_accuracy_goal: number;
  created_at: string;
  updated_at: string;
}

export interface UserGoalsInput {
  daily_questions_goal: number;
  daily_accuracy_goal: number;
}

export interface TodayStats {
  questions_answered: number;
  correct_answers: number;
  accuracy: number;
}

export class UserGoalsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Busca as metas do usuário
   */
  async getUserGoals(userId: string): Promise<UserGoals | null> {
    const { data, error } = await this.supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrado - comportamento esperado para usuários sem metas
        return null;
      }
      console.error('❌ [UserGoalsService] Erro ao buscar metas:', error);
      throw error;
    }

    return data;
  }

  /**
   * Cria ou atualiza as metas do usuário
   */
  async upsertUserGoals(userId: string, goals: UserGoalsInput): Promise<UserGoals> {
    const { data, error } = await this.supabase
      .from('user_goals')
      .upsert(
        {
          user_id: userId,
          daily_questions_goal: goals.daily_questions_goal,
          daily_accuracy_goal: goals.daily_accuracy_goal,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Busca estatísticas do dia atual
   */
  async getTodayStats(userId: string, timezone: string = 'America/Sao_Paulo'): Promise<TodayStats> {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: timezone });

    const { data, error } = await this.supabase.rpc('get_today_question_stats', {
      p_user_id: String(userId),
      p_today: todayStr,
    });

    if (error) {
      console.error('Erro ao buscar estatísticas do dia:', error);
      return {
        questions_answered: 0,
        correct_answers: 0,
        accuracy: 0,
      };
    }

    const result = data?.[0] || data;
    return {
      questions_answered: result?.questions_answered || 0,
      correct_answers: result?.correct_answers || 0,
      accuracy: result?.accuracy || 0,
    };
  }
}
