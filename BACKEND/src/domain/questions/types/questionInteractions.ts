/**
 * Tipos para interações com questões (likes, estilos, etc.)
 */

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

export interface QuestionReaction {
  id: string;
  question_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface QuestionStyleVote {
  id: string;
  question_id: string;
  user_id: string;
  style_type: QuestionStyleType;
  created_at: string;
}

export interface QuestionReactionStats {
  likes: number;
  dislikes: number;
  userReaction?: ReactionType;
}

export interface QuestionStyleStats {
  breakdown: Record<string, { count: number; percentage: number }>;
  userVotes: QuestionStyleType[];
}
