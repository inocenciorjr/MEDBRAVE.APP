import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';
import { UnifiedContentType } from '../types';

export interface RemovedReviewItem {
  id: string;
  user_id: string;
  content_id: string;
  content_type: UnifiedContentType;
  removal_reason?: string;
  removal_notes?: string;
  original_card_data: any;
  removed_at: Date;
}

export class ReviewItemManagementService {
  constructor(private supabase: SupabaseClient) {}

  async removeFromReviews(
    userId: string,
    contentId: string,
    contentType: UnifiedContentType,
    reason?: string,
    notes?: string
  ): Promise<void> {
    try {
      // Buscar card FSRS
      const { data: card, error: cardError } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      if (cardError || !card) {
        throw new AppError('Item não encontrado nas revisões', 404);
      }

      // Salvar em removed_review_items
      const { error: insertError } = await this.supabase
        .from('removed_review_items')
        .insert({
          user_id: userId,
          content_id: contentId,
          content_type: contentType,
          removal_reason: reason,
          removal_notes: notes,
          original_card_data: card,
          removed_at: new Date().toISOString(),
        });

      if (insertError) {
        logger.error('Erro ao salvar item removido:', insertError);
        throw new AppError('Erro ao salvar item removido', 500);
      }

      // Deletar card FSRS
      const { error: deleteError } = await this.supabase
        .from('fsrs_cards')
        .delete()
        .eq('id', card.id);

      if (deleteError) {
        logger.error('Erro ao deletar card FSRS:', deleteError);
        throw new AppError('Erro ao remover item', 500);
      }

      logger.info(`Item ${contentId} (${contentType}) removido das revisões do usuário ${userId}`);
    } catch (error) {
      logger.error('Erro ao remover item das revisões:', error);
      throw error;
    }
  }

  async restoreToReviews(
    userId: string,
    contentId: string,
    contentType: UnifiedContentType
  ): Promise<void> {
    try {
      // Buscar item removido
      const { data: removed, error: removedError } = await this.supabase
        .from('removed_review_items')
        .select('*')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      if (removedError || !removed) {
        throw new AppError('Item removido não encontrado', 404);
      }

      // Verificar se já existe um card (evitar duplicatas)
      const { data: existingCard } = await this.supabase
        .from('fsrs_cards')
        .select('id')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      if (existingCard) {
        throw new AppError('Item já está nas revisões', 400);
      }

      // Restaurar card FSRS
      const cardData = removed.original_card_data;
      const { error: insertError } = await this.supabase
        .from('fsrs_cards')
        .insert({
          ...cardData,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        logger.error('Erro ao restaurar card FSRS:', insertError);
        throw new AppError('Erro ao restaurar item', 500);
      }

      // Deletar de removed_review_items
      const { error: deleteError } = await this.supabase
        .from('removed_review_items')
        .delete()
        .eq('id', removed.id);

      if (deleteError) {
        logger.error('Erro ao deletar item removido:', deleteError);
        // Não falhar aqui, o importante é que o card foi restaurado
      }

      logger.info(`Item ${contentId} (${contentType}) restaurado às revisões do usuário ${userId}`);
    } catch (error) {
      logger.error('Erro ao restaurar item às revisões:', error);
      throw error;
    }
  }

  async getRemovedItems(userId: string, contentType?: UnifiedContentType): Promise<RemovedReviewItem[]> {
    try {
      let query = this.supabase
        .from('removed_review_items')
        .select('*')
        .eq('user_id', userId)
        .order('removed_at', { ascending: false });

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao buscar items removidos:', error);
        throw new AppError('Erro ao buscar items removidos', 500);
      }

      return (data || []) as RemovedReviewItem[];
    } catch (error) {
      logger.error('Erro ao buscar items removidos:', error);
      throw error;
    }
  }

  async deleteRemovedItemPermanently(
    userId: string,
    removedItemId: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('removed_review_items')
        .delete()
        .eq('id', removedItemId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Erro ao deletar item removido permanentemente:', error);
        throw new AppError('Erro ao deletar item', 500);
      }

      logger.info(`Item removido ${removedItemId} deletado permanentemente`);
    } catch (error) {
      logger.error('Erro ao deletar item removido:', error);
      throw error;
    }
  }
}
