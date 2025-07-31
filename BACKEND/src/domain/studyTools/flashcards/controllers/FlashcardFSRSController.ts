import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../domain/auth/middleware/auth.middleware';
import { FlashcardFSRSService } from '../services/FlashcardFSRSService';
import { ReviewQuality } from '../types';
import logger from '../../../../utils/logger';

export class FlashcardFSRSController {
  constructor(private readonly flashcardFSRSService: FlashcardFSRSService) {}

  /**
   * Registra uma revisão de flashcard usando FSRS
   * POST /flashcards/:id/review-fsrs
   */
  reviewFlashcard = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id: flashcardId } = req.params;
      const { reviewQuality, reviewTimeMs } = req.body;
      const userId = req.user.id;

      if (!flashcardId) {
        return res.status(400).json({ error: 'ID do flashcard é obrigatório' });
      }

      if (reviewQuality === undefined || reviewQuality === null) {
        return res.status(400).json({ error: 'Qualidade da revisão é obrigatória' });
      }

      if (!Object.values(ReviewQuality).includes(reviewQuality)) {
        return res.status(400).json({ error: 'Qualidade da revisão inválida' });
      }

      const result = await this.flashcardFSRSService.recordFlashcardReview(
        userId,
        flashcardId,
        reviewQuality as ReviewQuality,
        reviewTimeMs
      );

      logger.info(`Revisão FSRS registrada via API: flashcard ${flashcardId}, usuário ${userId}, qualidade ${reviewQuality}`);

      return res.status(200).json({
        success: true,
        message: 'Revisão registrada com sucesso',
        data: {
          flashcard: result.updatedFlashcard,
          interaction: result.interaction,
          fsrsData: {
            nextReviewAt: result.updatedFlashcard.nextReviewAt,
            interval: result.updatedFlashcard.srsInterval,
            repetitions: result.updatedFlashcard.srsRepetitions,
            lapses: result.updatedFlashcard.srsLapses,
            status: result.updatedFlashcard.status
          }
        }
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Busca flashcards devido para revisão
   * GET /flashcards/due-fsrs
   */
  getDueFlashcards = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const userId = req.user.id;
      const { limit = 50 } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 50, 100);

      const dueFlashcards = await this.flashcardFSRSService.getDueFlashcardsForUser(userId, limitNum);

      logger.info(`Flashcards devido retornados via API: ${dueFlashcards.length} cards para usuário ${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Flashcards devido carregados com sucesso',
        data: {
          flashcards: dueFlashcards,
          count: dueFlashcards.length,
          hasMore: dueFlashcards.length === limitNum
        }
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Inicializa card FSRS para um flashcard existente
   * POST /flashcards/:id/initialize-fsrs
   */
  initializeFSRSCard = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id: flashcardId } = req.params;
      const { deckId } = req.body;
      const userId = req.user.id;

      if (!flashcardId) {
        return res.status(400).json({ error: 'ID do flashcard é obrigatório' });
      }

      if (!deckId) {
        return res.status(400).json({ error: 'ID do deck é obrigatório' });
      }

      await this.flashcardFSRSService.initializeFSRSCard(flashcardId, userId, deckId);

      logger.info(`Card FSRS inicializado via API: flashcard ${flashcardId}, usuário ${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Card FSRS inicializado com sucesso'
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Migra flashcard de SM-2 para FSRS
   * POST /flashcards/:id/migrate-to-fsrs
   */
  migrateToFSRS = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id: flashcardId } = req.params;
      const userId = req.user.id;

      if (!flashcardId) {
        return res.status(400).json({ error: 'ID do flashcard é obrigatório' });
      }

      await this.flashcardFSRSService.migrateFlashcardToFSRS(flashcardId, userId);

      logger.info(`Flashcard migrado para FSRS via API: flashcard ${flashcardId}, usuário ${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Flashcard migrado para FSRS com sucesso'
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Obtém estatísticas FSRS do usuário
   * GET /flashcards/fsrs-stats
   */
  getFSRSStats = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const userId = req.user.id;

      const stats = await this.flashcardFSRSService.getFSRSStats(userId);
      logger.info(`[getFSRSStats Controller] Stats recebidas:`, stats);
      logger.info(`[getFSRSStats Controller] Tipo de stats:`, typeof stats);

      logger.info(`Estatísticas FSRS retornadas via API para usuário ${userId}`);

      const responseData = {
        ...stats,
        algorithm: 'FSRS v4.5',
        description: 'Free Spaced Repetition Scheduler - Algoritmo moderno baseado em machine learning'
      };
      logger.info(`[getFSRSStats Controller] Response data preparada:`, responseData);

      return res.status(200).json({
        success: true,
        message: 'Estatísticas FSRS carregadas com sucesso',
        data: responseData
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Migra todos os flashcards do usuário de SM-2 para FSRS
   * POST /flashcards/migrate-all-to-fsrs
   */
  migrateAllToFSRS = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const userId = req.user.id;

      // Esta operação pode ser demorada, então vamos processar em lotes
      const { batchSize = 50 } = req.query;
      const batchSizeNum = Math.min(parseInt(batchSize as string) || 50, 100);

      // Buscar flashcards do usuário em lotes
      const flashcardsResult = await this.flashcardFSRSService.getFlashcardsByUser(userId, {
        limit: batchSizeNum
      });

      let migratedCount = 0;
      let errorCount = 0;

      for (const flashcard of flashcardsResult.flashcards) {
        try {
          await this.flashcardFSRSService.migrateFlashcardToFSRS(flashcard.id, userId);
          migratedCount++;
        } catch (error) {
          logger.warn(`Erro ao migrar flashcard ${flashcard.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          errorCount++;
        }
      }

      logger.info(`Migração em lote FSRS concluída via API: ${migratedCount} migrados, ${errorCount} erros, usuário ${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Migração em lote concluída',
        data: {
          migratedCount,
          errorCount,
          totalProcessed: flashcardsResult.flashcards.length,
          hasMore: flashcardsResult.hasMore,
          batchSize: batchSizeNum
        }
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}