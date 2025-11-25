import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../../../utils/logger';

export class ExplanationRatingService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Criar ou atualizar avaliação de explicação
   */
  async rateExplanation(
    userId: string,
    questionId: string,
    rating: number
  ): Promise<{ success: boolean; rating: any }> {
    try {
      const now = new Date().toISOString();

      // Upsert: inserir ou atualizar se já existir
      const { data, error } = await this.supabase
        .from('explanation_ratings')
        .upsert(
          {
            user_id: userId,
            question_id: questionId,
            rating,
            updated_at: now,
          },
          {
            onConflict: 'user_id,question_id',
          }
        )
        .select()
        .single();

      if (error) throw error;

      return { success: true, rating: data };
    } catch (error) {
      logger.error('[ExplanationRatingService] Erro ao avaliar explicação:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de avaliações de uma questão
   */
  async getQuestionRatings(
    questionId: string,
    userId?: string
  ): Promise<{
    averageRating: number;
    totalRatings: number;
    userRating: number | null;
  }> {
    try {
      // Buscar todas as avaliações da questão
      const { data: ratings, error } = await this.supabase
        .from('explanation_ratings')
        .select('rating, user_id')
        .eq('question_id', questionId);

      if (error) throw error;

      const totalRatings = ratings?.length || 0;
      const averageRating =
        totalRatings > 0
          ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalRatings
          : 0;

      // Buscar avaliação do usuário atual
      let userRating = null;
      if (userId && ratings) {
        const userRatingData = ratings.find((r) => r.user_id === userId);
        userRating = userRatingData?.rating || null;
      }

      return {
        averageRating,
        totalRatings,
        userRating,
      };
    } catch (error) {
      logger.error('[ExplanationRatingService] Erro ao buscar avaliações:', error);
      throw error;
    }
  }
}
