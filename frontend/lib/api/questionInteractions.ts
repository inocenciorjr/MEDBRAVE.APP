import api from '@/services/api';

export type ReactionType = 'like' | 'dislike';

export type QuestionStyleType = 
  | 'conduta'
  | 'classificacao'
  | 'diagnostico'
  | 'decoreba'
  | 'tratamento'
  | 'prognostico'
  | 'epidemiologia'
  | 'fisiopatologia';

export interface QuestionReactionStats {
  likes: number;
  dislikes: number;
  userReaction?: ReactionType;
}

export type QuestionStyleStats =
  Record<QuestionStyleType, { count: number; percentage: number }> & {
    userVotes: QuestionStyleType[];
  };

/**
 * Toggle like/dislike em uma questão
 */
export async function toggleQuestionReaction(
  questionId: string,
  reactionType: ReactionType
): Promise<QuestionReactionStats> {
  try {
    const response = await api.post(`/questions/${questionId}/reactions`, {
      reactionType,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao alternar reação:', error);
    throw error;
  }
}

/**
 * Obter estatísticas de reações de uma questão
 */
export async function getQuestionReactionStats(
  questionId: string
): Promise<QuestionReactionStats> {
  try {
    const response = await api.get(`/questions/${questionId}/reactions`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter estatísticas de reações:', error);
    throw error;
  }
}

/**
 * Toggle voto de estilo em uma questão
 */
export async function toggleQuestionStyleVote(
  questionId: string,
  styleType: QuestionStyleType
): Promise<QuestionStyleStats> {
  try {
    const response = await api.post(`/questions/${questionId}/styles`, {
      styleType,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao alternar voto de estilo:', error);
    throw error;
  }
}

/**
 * Obter estatísticas de estilos de uma questão
 */
export async function getQuestionStyleStats(
  questionId: string
): Promise<QuestionStyleStats> {
  try {
    const response = await api.get(`/questions/${questionId}/styles`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter estatísticas de estilos:', error);
    throw error;
  }
}
