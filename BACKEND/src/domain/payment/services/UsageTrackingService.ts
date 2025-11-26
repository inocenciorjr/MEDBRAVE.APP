import { supabase } from '../../../config/supabaseAdmin';
import logger from '../../../utils/logger';
import { ErrorCodes, createError, AppError } from '../../../utils/errors';

/**
 * Serviço para rastrear uso de funcionalidades pelos usuários
 */
export class UsageTrackingService {
  /**
   * Conta quantas questões o usuário respondeu hoje
   */
  async getQuestionsAnsweredToday(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count, error } = await supabase
        .from('question_responses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Erro ao contar questões: ${error.message}`,
        );
      }

      return count || 0;
    } catch (error) {
      logger.error(`Erro ao contar questões do usuário ${userId}: ${error}`);
      if (error instanceof AppError) throw error;
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao verificar uso de questões',
      );
    }
  }

  /**
   * Conta quantas listas de questões o usuário criou hoje
   */
  async getQuestionListsCreatedToday(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count, error } = await supabase
        .from('question_lists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Erro ao contar listas: ${error.message}`,
        );
      }

      return count || 0;
    } catch (error) {
      logger.error(`Erro ao contar listas do usuário ${userId}: ${error}`);
      if (error instanceof AppError) throw error;
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao verificar uso de listas',
      );
    }
  }

  /**
   * Conta quantos simulados o usuário fez este mês
   */
  async getSimulatedExamsThisMonth(userId: string): Promise<number> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const { count, error } = await supabase
        .from('simulated_exams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', startOfNextMonth.toISOString());

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Erro ao contar simulados: ${error.message}`,
        );
      }

      return count || 0;
    } catch (error) {
      logger.error(`Erro ao contar simulados do usuário ${userId}: ${error}`);
      if (error instanceof AppError) throw error;
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao verificar uso de simulados',
      );
    }
  }

  /**
   * Conta quantos flashcards o usuário criou (total)
   */
  async getFlashcardsCreated(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Erro ao contar flashcards: ${error.message}`,
        );
      }

      return count || 0;
    } catch (error) {
      logger.error(`Erro ao contar flashcards do usuário ${userId}: ${error}`);
      if (error instanceof AppError) throw error;
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao verificar flashcards criados',
      );
    }
  }

  /**
   * Conta quantos decks de flashcards o usuário tem
   */
  async getFlashcardDecks(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('decks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Erro ao contar decks: ${error.message}`,
        );
      }

      return count || 0;
    } catch (error) {
      logger.error(`Erro ao contar decks do usuário ${userId}: ${error}`);
      if (error instanceof AppError) throw error;
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao verificar decks',
      );
    }
  }

  /**
   * Conta quantas revisões FSRS o usuário fez hoje
   */
  async getReviewsToday(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count, error } = await supabase
        .from('review_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('reviewed_at', today.toISOString())
        .lt('reviewed_at', tomorrow.toISOString());

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Erro ao contar revisões: ${error.message}`,
        );
      }

      return count || 0;
    } catch (error) {
      logger.error(`Erro ao contar revisões do usuário ${userId}: ${error}`);
      if (error instanceof AppError) throw error;
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao verificar revisões',
      );
    }
  }

  /**
   * Conta quantos cards FSRS o usuário tem
   */
  async getFSRSCards(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('fsrs_cards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Erro ao contar cards FSRS: ${error.message}`,
        );
      }

      return count || 0;
    } catch (error) {
      logger.error(`Erro ao contar cards FSRS do usuário ${userId}: ${error}`);
      if (error instanceof AppError) throw error;
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao verificar cards FSRS',
      );
    }
  }

  /**
   * Conta quantas entradas no caderno de erros o usuário tem
   */
  async getErrorNotebookEntries(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('error_notebook_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Erro ao contar entradas do caderno: ${error.message}`,
        );
      }

      return count || 0;
    } catch (error) {
      logger.error(`Erro ao contar entradas do caderno do usuário ${userId}: ${error}`);
      if (error instanceof AppError) throw error;
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao verificar caderno de erros',
      );
    }
  }
}

// Singleton instance
export const usageTrackingService = new UsageTrackingService();
