import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { FSRSGrade, FSRSCard } from '../../../srs/services/FSRSService';
import { IFSRSService } from '../../../srs/interfaces/IFSRSService';
import { UnifiedContentType } from '../types';
import { DayCompletionService, CompletionType } from './DayCompletionService';
import { ReviewRemovalService, RemovalReason } from './ReviewRemovalService';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';

export interface MarkDayCompleteOptions {
  skipGrade?: boolean; // Se true, não aplica grade, só marca como completo
  applyGrade?: FSRSGrade; // Grade específico a aplicar (padrão: GOOD)
  notes?: string; // Notas do usuário sobre o dia
}

export interface MarkDayCompleteResult {
  success: boolean;
  itemsProcessed: number;
  itemsSkipped: number;
  dayCompletion: any; // DayCompletion type
  appliedGrade?: FSRSGrade;
}

export interface RemoveFromReviewsOptions {
  reason: RemovalReason;
  notes?: string;
  softDelete?: boolean; // Padrão: true (soft delete)
}

export interface RemoveFromReviewsResult {
  success: boolean;
  removedItem: any; // RemovedReviewItem type
  message: string;
}

/**
 * Serviço para gerenciar funcionalidades avançadas de revisões:
 * - Marcar dia como concluído
 * - Remover itens do ciclo de revisões
 */
export class ReviewManagementService {
  private db: Firestore;
  private fsrsService: IFSRSService;
  private dayCompletionService: DayCompletionService;
  private reviewRemovalService: ReviewRemovalService;

  constructor(
    db: Firestore,
    fsrsService: IFSRSService
  ) {
    this.db = db;
    this.fsrsService = fsrsService;
    this.dayCompletionService = new DayCompletionService(db);
    this.reviewRemovalService = new ReviewRemovalService(db);
  }

  /**
   * Marcar dia como concluído
   * Aplica uma nota neutra (GOOD) em todos os itens pendentes do dia
   */
  async markDayComplete(
    userId: string,
    options: MarkDayCompleteOptions = {}
  ): Promise<MarkDayCompleteResult> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Verificar se já foi marcado hoje
      const existingCompletion = await this.dayCompletionService.getTodayCompletion(userId);
      if (existingCompletion) {
        throw new AppError('Dia já foi marcado como completo', 400);
      }

      // 2. Buscar itens pendentes de hoje
      const dueCards = await this.fsrsService.getDueCards(userId, 200); // ✅ MUDANÇA: Reduzido de 1000 para 200
      const todayDueCards = dueCards.filter(card => {
        const cardDue = new Date(card.due);
        const todayDate = new Date();
        return cardDue.toDateString() === todayDate.toDateString();
      });

      let itemsProcessed = 0;
      let itemsSkipped = 0;
      const gradeToApply = options.applyGrade || FSRSGrade.GOOD;

      // 3. Aplicar grade nos itens pendentes (se não for skipGrade)
      if (!options.skipGrade && todayDueCards.length > 0) {
        for (const card of todayDueCards) {
          try {
            const updatedCard = await this.fsrsService.reviewCard(card.id, userId, gradeToApply);
            
            // Salvar no histórico de revisões completadas
            await this.saveReviewHistoryForDayCompletion(userId, card, gradeToApply, updatedCard);
            
            itemsProcessed++;
          } catch (error) {
            logger.warn(`Erro ao processar card ${card.id} na marcação do dia:`, error);
            itemsSkipped++;
          }
        }
      } else {
        itemsSkipped = todayDueCards.length;
      }

      // 4. Calcular estatísticas do dia
      const stats = {
        totalItemsReviewed: itemsProcessed,
        questionsReviewed: this.countByContentType(todayDueCards, 'question'),
        flashcardsReviewed: this.countByContentType(todayDueCards, 'flashcard'),
        errorNotebookReviewed: this.countByContentType(todayDueCards, 'error_notebook'),
        totalTimeMinutes: Math.max(5, itemsProcessed * 2), // Estimativa: 2 min por item
        averageResponseTimeSeconds: 30,
        accuracyPercentage: gradeToApply === FSRSGrade.GOOD ? 75 : 50
      };

      // 5. Marcar dia como completo
      const dayCompletion = await this.dayCompletionService.completeDayStudy(
        userId,
        CompletionType.MANUAL,
        stats,
        options.notes
      );

      logger.info(`Dia marcado como completo para usuário ${userId}`, {
        date: today,
        itemsProcessed,
        itemsSkipped,
        gradeApplied: options.skipGrade ? 'none' : gradeToApply
      });

      return {
        success: true,
        itemsProcessed,
        itemsSkipped,
        dayCompletion,
        appliedGrade: options.skipGrade ? undefined : gradeToApply
      };
    } catch (error) {
      logger.error('Erro ao marcar dia como completo:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao marcar dia como completo', 500);
    }
  }

  /**
   * Remover item do ciclo de revisões
   * Por padrão faz soft delete (mantém histórico)
   */
  async removeFromReviews(
    userId: string,
    contentType: UnifiedContentType,
    contentId: string,
    options: RemoveFromReviewsOptions
  ): Promise<RemoveFromReviewsResult> {
    try {
      // Usar soft delete por padrão
      const useSoftDelete = options.softDelete !== false;

      if (useSoftDelete) {
        // Soft delete: usar ReviewRemovalService
        const removedItem = await this.reviewRemovalService.removeFromReviewSystem(
          userId,
          contentType,
          contentId,
          options.reason,
          options.notes
        );

        return {
          success: true,
          removedItem,
          message: 'Item removido do ciclo de revisões (pode ser restaurado)'
        };
      } else {
        // Hard delete: remover permanentemente
        await this.hardDeleteFromReviews(userId, contentType, contentId);

        return {
          success: true,
          removedItem: null,
          message: 'Item removido permanentemente do ciclo de revisões'
        };
      }
    } catch (error) {
      logger.error('Erro ao remover item das revisões:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao remover item das revisões', 500);
    }
  }

  /**
   * Restaurar item removido para o ciclo de revisões
   */
  async restoreToReviews(
    userId: string,
    removedItemId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.reviewRemovalService.restoreToReviewSystem(userId, removedItemId);
      
      return {
        success: true,
        message: 'Item restaurado ao ciclo de revisões com sucesso'
      };
    } catch (error) {
      logger.error('Erro ao restaurar item:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao restaurar item', 500);
    }
  }

  /**
   * Obter itens removidos do usuário
   */
  async getRemovedItems(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const result = await this.reviewRemovalService.getRemovedItems(userId, { limit });
      return result.items;
    } catch (error) {
      logger.error('Erro ao buscar itens removidos:', error);
      throw new AppError('Erro ao buscar itens removidos', 500);
    }
  }

  /**
   * Obter estatísticas de completação de dias
   */
  async getDayCompletionStats(userId: string) {
    try {
      return await this.dayCompletionService.getDayCompletionStats(userId);
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de completação:', error);
      throw new AppError('Erro ao buscar estatísticas de completação', 500);
    }
  }

  /**
   * Obter histórico de completações
   */
  async getCompletionHistory(userId: string, days: number = 30) {
    try {
      return await this.dayCompletionService.getCompletionHistory(userId, days);
    } catch (error) {
      logger.error('Erro ao buscar histórico de completações:', error);
      throw new AppError('Erro ao buscar histórico de completações', 500);
    }
  }

  /**
   * Hard delete: remover permanentemente do sistema
   */
  private async hardDeleteFromReviews(
    userId: string,
    contentType: UnifiedContentType,
    contentId: string
  ): Promise<void> {
    const batch = this.db.batch();

    try {
      // 1. Buscar e remover FSRSCard
      const fsrsCardQuery = await this.db
        .collection('fsrs_cards')
        .where('userId', '==', userId)
        .where('contentId', '==', contentId)
        .get();

      fsrsCardQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 2. Buscar e remover todos os FSRSReviewLogs relacionados
      const reviewLogsQuery = await this.db
        .collection('fsrs_review_logs')
        .where('userId', '==', userId)
        .where('cardId', '==', contentId)
        .get();

      reviewLogsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 3. Executar remoção em batch
      await batch.commit();

      logger.info(`Hard delete executado para ${contentType}:${contentId}`, {
        userId,
        fsrsCardsRemoved: fsrsCardQuery.docs.length,
        reviewLogsRemoved: reviewLogsQuery.docs.length
      });
    } catch (error) {
      logger.error('Erro no hard delete:', error);
      throw new AppError('Erro ao remover permanentemente', 500);
    }
  }

  /**
   * Salvar histórico de revisão para marcação de dia completo
   */
  private async saveReviewHistoryForDayCompletion(
    userId: string,
    card: FSRSCard,
    grade: FSRSGrade,
    updatedCard: FSRSCard
  ): Promise<void> {
    try {
      // Detectar tipo de conteúdo baseado no deckId
      let contentType = 'FLASHCARD';
      if (card.deckId?.includes('question') || card.deckId?.includes('quiz')) {
        contentType = 'QUESTION';
      } else if (card.deckId?.includes('error') || card.deckId?.includes('notebook')) {
        contentType = 'ERROR_NOTEBOOK';
      }

      const reviewHistory = {
        userId,
        contentType,
        contentId: card.contentId,
        grade,
        reviewTimeMs: 0, // Marcação automática do dia
        reviewedAt: Timestamp.now(),
        
        // Dados do cartão FSRS após a revisão
        stability: updatedCard.stability,
        difficulty: updatedCard.difficulty,
        due: Timestamp.fromDate(new Date(updatedCard.due)),
        reps: updatedCard.reps,
        lapses: updatedCard.lapses,
        state: updatedCard.state
      };

      await this.db.collection('fsrsReviewHistory').add(reviewHistory);
      
      logger.info(`Histórico de revisão salvo para marcação de dia: ${card.contentId}, usuário ${userId}, grade ${grade}`);
    } catch (error) {
      logger.error('Erro ao salvar histórico de revisão para marcação de dia:', error);
      // Não propagar o erro para não interromper o fluxo principal
    }
  }

  /**
   * Contar itens por tipo de conteúdo
   */
  private countByContentType(cards: any[], contentType: string): number {
    return cards.filter(card => {
      // Detectar tipo baseado no deckId ou outros campos
      if (contentType === 'question') {
        return card.deckId?.includes('question') || card.deckId?.includes('quiz');
      }
      if (contentType === 'flashcard') {
        return card.deckId?.includes('flashcard') || card.deckId?.includes('deck');
      }
      if (contentType === 'error_notebook') {
        return card.deckId?.includes('error') || card.deckId?.includes('notebook');
      }
      return false;
    }).length;
  }
}