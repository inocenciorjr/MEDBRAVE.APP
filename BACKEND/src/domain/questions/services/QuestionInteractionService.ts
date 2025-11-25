import { SupabaseClient } from '@supabase/supabase-js';
import {
  ReactionType,
  QuestionStyleType,
  QuestionReactionStats,
  QuestionStyleStats,
} from '../types/questionInteractions';

export class QuestionInteractionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Adicionar ou atualizar reação (like/dislike)
   */
  async toggleReaction(
    questionId: string,
    userId: string,
    reactionType: ReactionType
  ): Promise<QuestionReactionStats> {
    try {
      // Verificar se já existe uma reação
      const { data: existing } = await this.supabase
        .from('question_reactions')
        .select('*')
        .eq('question_id', questionId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Se clicar na mesma reação, remove
          await this.supabase
            .from('question_reactions')
            .delete()
            .eq('question_id', questionId)
            .eq('user_id', userId);
        } else {
          // Se clicar em reação diferente, atualiza
          await this.supabase
            .from('question_reactions')
            .update({ reaction_type: reactionType })
            .eq('question_id', questionId)
            .eq('user_id', userId);
        }
      } else {
        // Criar nova reação
        await this.supabase.from('question_reactions').insert({
          question_id: questionId,
          user_id: userId,
          reaction_type: reactionType,
        });
      }

      return this.getReactionStats(questionId, userId);
    } catch (error) {
      console.error('Erro ao alternar reação:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de reações
   */
  async getReactionStats(
    questionId: string,
    userId?: string
  ): Promise<QuestionReactionStats> {
    try {
      const { data: reactions } = await this.supabase
        .from('question_reactions')
        .select('reaction_type, user_id')
        .eq('question_id', questionId);

      const likes = reactions?.filter((r) => r.reaction_type === 'like').length || 0;
      const dislikes = reactions?.filter((r) => r.reaction_type === 'dislike').length || 0;

      let userReaction: ReactionType | undefined;
      if (userId) {
        const userReactionData = reactions?.find((r) => r.user_id === userId);
        userReaction = userReactionData?.reaction_type as ReactionType | undefined;
      }

      return { likes, dislikes, userReaction };
    } catch (error) {
      console.error('Erro ao obter estatísticas de reações:', error);
      throw error;
    }
  }

  /**
   * Adicionar ou remover voto de estilo
   */
  async toggleStyleVote(
    questionId: string,
    userId: string,
    styleType: QuestionStyleType
  ): Promise<QuestionStyleStats> {
    try {
      // Verificar se já existe esse voto
      const { data: existing } = await this.supabase
        .from('question_style_votes')
        .select('*')
        .eq('question_id', questionId)
        .eq('user_id', userId)
        .eq('style_type', styleType)
        .single();

      if (existing) {
        // Se já votou, remove o voto
        await this.supabase
          .from('question_style_votes')
          .delete()
          .eq('question_id', questionId)
          .eq('user_id', userId)
          .eq('style_type', styleType);
      } else {
        // Adiciona novo voto
        await this.supabase.from('question_style_votes').insert({
          question_id: questionId,
          user_id: userId,
          style_type: styleType,
        });
      }

      return this.getStyleStats(questionId, userId);
    } catch (error) {
      console.error('Erro ao alternar voto de estilo:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de estilos
   */
  async getStyleStats(
    questionId: string,
    userId?: string
  ): Promise<QuestionStyleStats> {
    try {
      const { data: votes } = await this.supabase
        .from('question_style_votes')
        .select('style_type, user_id')
        .eq('question_id', questionId);

      const totalVotes = votes?.length || 0;
      const stats: QuestionStyleStats = { breakdown: {}, userVotes: [] } as any;

      // Contar votos por estilo
      const styleCounts: Record<string, number> = {};
      votes?.forEach((vote) => {
        styleCounts[vote.style_type] = (styleCounts[vote.style_type] || 0) + 1;
      });

      // Calcular percentagens
      Object.entries(styleCounts).forEach(([style, count]) => {
        (stats as any).breakdown[style] = {
          count,
          percentage: totalVotes > 0 ? (count / totalVotes) * 100 : 0,
        };
      });

      // Votos do usuário
      if (userId) {
        stats.userVotes = votes
          ?.filter((v) => v.user_id === userId)
          .map((v) => v.style_type as QuestionStyleType) || [];
      }

      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas de estilos:', error);
      throw error;
    }
  }
}
