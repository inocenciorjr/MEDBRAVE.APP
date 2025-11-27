import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

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

/**
 * Busca as metas do usuário
 */
export async function getUserGoals(): Promise<UserGoals | null> {
  try {
    const response = await fetchWithAuth('/user-goals');
    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar metas:', error);
    throw error;
  }
}

/**
 * Cria ou atualiza as metas do usuário
 */
export async function upsertUserGoals(goals: UserGoalsInput): Promise<UserGoals> {
  try {
    const response = await fetchWithAuth('/user-goals', {
      method: 'POST',
      body: JSON.stringify(goals),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erro ao salvar metas');
    }
    
    return data.data;
  } catch (error) {
    console.error('Erro ao salvar metas:', error);
    throw error;
  }
}

/**
 * Busca estatísticas do dia atual para comparar com as metas
 */
export async function getTodayStats(): Promise<{
  questions_answered: number;
  correct_answers: number;
  accuracy: number;
}> {
  try {
    const response = await fetchWithAuth('/user-goals/today-stats');
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    }
    
    return {
      questions_answered: 0,
      correct_answers: 0,
      accuracy: 0,
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dia:', error);
    return {
      questions_answered: 0,
      correct_answers: 0,
      accuracy: 0,
    };
  }
}
