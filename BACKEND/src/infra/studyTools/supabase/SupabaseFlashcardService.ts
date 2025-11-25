import { supabase } from '../../../config/supabase';
import AppError from '../../../utils/AppError';
import {
  Flashcard,
  FlashcardStatus,
  FlashcardUserStatistics,
  CreateFlashcardPayload,
  UpdateFlashcardPayload,
  ListFlashcardsOptions,
  PaginatedFlashcardsResult,
} from '../../../domain/studyTools/flashcards/types';
import { logger } from '../../../utils/logger';

// Utility removed - not used

// UnifiedReviewService handles all review logic

// Helper to generate searchable text from flashcard content
const generateSearchableText = (
  frontContent: string,
  backContent: string,
  personalNotes?: string | null,
): string => {
  const texts = [frontContent, backContent];
  if (personalNotes) {
    texts.push(personalNotes);
  }
  return texts.join(' ').toLowerCase();
};

export class SupabaseFlashcardService {
  private async validateDeckExists(deckId: string): Promise<void> {
    try {
      const { data: deck, error } = await supabase
        .from('decks')
        .select('id')
        .eq('id', deckId)
        .single();

      if (error || !deck) {
        throw AppError.notFound(`Deck com ID ${deckId} não encontrado`);
      }
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao validar deck: ${errorMessage}`);
    }
  }



  // Status determination is now handled by UnifiedReviewService based on FSRS data
  

  private mapToFlashcard(data: any): Flashcard {
    return {
      id: data.id,
      deck_id: data.deck_id,
      front_content: data.front_content,
      back_content: data.back_content,
      tags: data.tags || [],
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      searchable_text: data.searchable_text,
    };
  }

  async getFlashcardsByUser(
    userId: string,
    options: ListFlashcardsOptions = {},
  ): Promise<PaginatedFlashcardsResult> {
    try {
      let query = supabase.from('flashcards').select('*').eq('user_id', userId);

      if (options.ready_for_review) {
        query = query
          .neq('status', FlashcardStatus.SUSPENDED)
          .neq('status', FlashcardStatus.ARCHIVED);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      query = query.order('created_at', { ascending: true });

      if (options.limit) {
        query = query.limit(options.limit + 1);
      }

      if (options.last_doc_id) {
        const { data: lastDoc } = await supabase
          .from('flashcards')
          .select('created_at')
          .eq('id', options.last_doc_id)
          .single();

        if (lastDoc?.created_at) {
          query = query.gt('created_at', lastDoc.created_at);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      // Contar total
      let countQuery = supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (options.ready_for_review) {
        countQuery = countQuery
          .neq('status', FlashcardStatus.SUSPENDED)
          .neq('status', FlashcardStatus.ARCHIVED);
      }

      if (options.status) {
        countQuery = countQuery.eq('status', options.status);
      }

      const { count } = await countQuery;

      const hasMore = options.limit ? data.length > options.limit : false;
      const flashcards = (hasMore ? data.slice(0, options.limit) : data).map(
        this.mapToFlashcard,
      );

      return {
        flashcards,
        has_more: hasMore,
        total: count || 0,
      };
    } catch (error) {
      logger.error('Erro ao buscar flashcards:', { error, userId, options });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao buscar flashcards');
    }
  }

  async updateUserFlashcardStatistics(
    userId: string,
    deckId: string,
  ): Promise<void> {
    try {
      const { data: flashcards, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .eq('deck_id', deckId);

      if (error) {
        throw new Error(error.message);
      }

      const stats: Omit<FlashcardUserStatistics, 'id'> = {
        user_id: userId,
        deck_id: deckId,
        total_flashcards: flashcards.length,
        active_flashcards: 0,
        mastered_flashcards: 0,
        learning_flashcards: 0,
        reviewing_flashcards: 0,
        suspended_flashcards: 0,
        archived_flashcards: 0,
        // Review statistics are now managed by UnifiedReviewService
        average_ease_factor: 0, // Legacy field - kept for compatibility
        average_interval_days: 0, // Legacy field - kept for compatibility
        due_for_review_count: 0, // Legacy field - kept for compatibility
        updated_at: new Date().toISOString(),
      };

      flashcards.forEach((flashcard) => {

        switch (flashcard.status) {
          case FlashcardStatus.MASTERED:
            stats.mastered_flashcards++;
            stats.active_flashcards++;
            break;
          case FlashcardStatus.REVIEW:
            stats.reviewing_flashcards++;
            stats.active_flashcards++;
            break;
          case FlashcardStatus.LEARNING:
            stats.learning_flashcards++;
            stats.active_flashcards++;
            break;
          case FlashcardStatus.SUSPENDED:
            stats.suspended_flashcards++;
            break;
          case FlashcardStatus.ARCHIVED:
            stats.archived_flashcards++;
            break;
        }
      });



      // Upsert statistics
      const { error: statsError } = await supabase
        .from('flashcard_statistics')
        .upsert(
          {
            user_id: stats.user_id,
            deck_id: stats.deck_id,
            total_flashcards: stats.total_flashcards,
            active_flashcards: stats.active_flashcards,
            mastered_flashcards: stats.mastered_flashcards,
            learning_flashcards: stats.learning_flashcards,
            reviewing_flashcards: stats.reviewing_flashcards,
            suspended_flashcards: stats.suspended_flashcards,
            archived_flashcards: stats.archived_flashcards,
            average_ease_factor: stats.average_ease_factor,
            average_interval_days: stats.average_interval_days,
            due_for_review_count: stats.due_for_review_count,
            updated_at: stats.updated_at,
          },
          {
            onConflict: 'user_id,deck_id',
          },
        );

      if (statsError) {
        throw new Error(statsError.message);
      }

      // Update user statistics
      const { error: userError } = await supabase
        .from('users')
        .update({
          total_flashcards: stats.total_flashcards,
          active_flashcards: stats.active_flashcards,
          mastered_flashcards: stats.mastered_flashcards,
          updated_at: stats.updated_at,
        })
        .eq('id', userId);

      if (userError) {
        throw new Error(userError.message);
      }
    } catch (error: unknown) {
      logger.error('Erro ao atualizar estatísticas de flashcard:', {
        error,
        userId,
        deckId,
      });
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(
        `Erro ao atualizar estatísticas do usuário: ${errorMessage}`,
      );
    }
  }

  async createFlashcard(data: CreateFlashcardPayload): Promise<Flashcard> {
    try {
      await this.validateDeckExists(data.deck_id);

      const now = new Date();
      const newFlashcard = {
        deck_id: data.deck_id,
        front_content: data.front_content,
        back_content: data.back_content,
        tags: data.tags || [],
        status: FlashcardStatus.LEARNING,
        // Review data managed by UnifiedReviewService
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        searchable_text: generateSearchableText(
          data.front_content,
          data.back_content,
        ),
      };

      const { data: createdFlashcard, error } = await supabase
        .from('flashcards')
        .insert(newFlashcard)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update deck flashcard count
      const { error: deckError } = await supabase.rpc(
        'increment_deck_flashcard_count',
        {
          deck_id: data.deck_id,
        },
      );

      if (deckError) {
        logger.error('Erro ao atualizar contagem do deck:', deckError);
      }

      // Update user statistics
      // Estatísticas do usuário agora atualizadas via serviços unificados

      return this.mapToFlashcard(createdFlashcard);
    } catch (error) {
      logger.error('Erro ao criar flashcard:', { error, data });
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao criar flashcard: ${errorMessage}`);
    }
  }

  async getFlashcardById(
    id: string,
    userId: string,
  ): Promise<Flashcard | null> {
    try {
      const { data: flashcard, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !flashcard) {
        return null;
      }

      if (flashcard.user_id !== userId) {
        throw AppError.forbidden(
          'Usuário não autorizado a acessar este flashcard.',
        );
      }

      return this.mapToFlashcard(flashcard);
    } catch (error) {
      logger.error('Erro ao buscar flashcard:', { error, id, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao buscar flashcard');
    }
  }

  async updateFlashcard(
    flashcardId: string,
    userId: string,
    data: UpdateFlashcardPayload,
  ): Promise<Flashcard> {
    try {
      const { data: existingFlashcard, error: fetchError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', flashcardId)
        .single();

      if (fetchError || !existingFlashcard) {
        throw AppError.notFound('Flashcard não encontrado.');
      }

      if (existingFlashcard.user_id !== userId) {
        throw AppError.forbidden(
          'Usuário não autorizado a atualizar este flashcard.',
        );
      }

      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      // Convert field names to camelCase
      if (data.front_content !== undefined) {
        updateData.front_content = data.front_content;
      }
      if (data.back_content !== undefined) {
        updateData.back_content = data.back_content;
      }

      
      // SRS fields removed - managed by UnifiedReviewService

      if (data.front_content || data.back_content) {
        updateData.searchable_text = generateSearchableText(
          data.front_content !== undefined
            ? data.front_content
            : existingFlashcard.front_content,
          data.back_content !== undefined
            ? data.back_content
            : existingFlashcard.back_content,
        );
      }

      const { data: updatedFlashcard, error } = await supabase
        .from('flashcards')
        .update(updateData)
        .eq('id', flashcardId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await this.updateUserFlashcardStatistics(
        userId,
        existingFlashcard.deck_id,
      );

      return this.mapToFlashcard(updatedFlashcard);
    } catch (error) {
      logger.error('Erro ao atualizar flashcard:', {
        error,
        flashcardId,
        userId,
        data,
      });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao atualizar flashcard');
    }
  }

  async deleteFlashcard(flashcardId: string, userId: string): Promise<void> {
    try {
      const { data: flashcard, error: fetchError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', flashcardId)
        .single();

      if (fetchError || !flashcard) {
        throw AppError.notFound('Flashcard não encontrado.');
      }

      if (flashcard.user_id !== userId) {
        throw AppError.forbidden(
          'Usuário não autorizado a deletar este flashcard.',
        );
      }

      // Delete all interactions for this flashcard
      const { error: interactionsError } = await supabase
        .from('user_flashcard_interactions')
        .delete()
        .eq('flashcard_id', flashcardId);

      if (interactionsError) {
        logger.error('Erro ao deletar interações:', interactionsError);
      }

      // Delete the flashcard
      const { error: deleteError } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', flashcardId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Update deck flashcard count
      const { error: deckError } = await supabase.rpc(
        'decrement_deck_flashcard_count',
        {
          deck_id: flashcard.deck_id,
        },
      );

      if (deckError) {
        logger.error('Erro ao atualizar contagem do deck:', deckError);
      }

      await this.updateUserFlashcardStatistics(userId, flashcard.deck_id);
    } catch (error) {
      logger.error('Erro ao deletar flashcard:', {
        error,
        flashcardId,
        userId,
      });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao deletar flashcard');
    }
  }

  async toggleArchiveFlashcard(
    flashcardId: string,
    userId: string,
  ): Promise<Flashcard> {
    try {
      const { data: flashcard, error: fetchError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', flashcardId)
        .single();

      if (fetchError || !flashcard) {
        throw AppError.notFound('Flashcard não encontrado.');
      }

      if (flashcard.user_id !== userId) {
        throw AppError.forbidden(
          'Usuário não autorizado a arquivar/desarquivar este flashcard.',
        );
      }

      const isCurrentlyArchived =
        flashcard.status === FlashcardStatus.SUSPENDED;
      const updateData = {
        status: isCurrentlyArchived
          ? FlashcardStatus.LEARNING
          : FlashcardStatus.SUSPENDED,
        // Review scheduling managed by UnifiedReviewService
        updated_at: new Date().toISOString(),
      };

      const { data: updatedFlashcard, error } = await supabase
        .from('flashcards')
        .update(updateData)
        .eq('id', flashcardId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await this.updateUserFlashcardStatistics(userId, flashcard.deck_id);

      return this.mapToFlashcard(updatedFlashcard);
    } catch (error) {
      logger.error('Erro ao arquivar/desarquivar flashcard:', {
        error,
        flashcardId,
        userId,
      });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao arquivar/desarquivar flashcard');
    }
  }

  // recordFlashcardReview method removed - review logic is now handled by UnifiedReviewService
  // Use the proper flow: Controller -> UseCase -> Repository -> UnifiedReviewService

  
}

export const flashcardService = new SupabaseFlashcardService();


