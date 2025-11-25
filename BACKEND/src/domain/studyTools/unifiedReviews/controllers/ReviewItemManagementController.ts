import { Request, Response, NextFunction } from 'express';
import { ReviewItemManagementService } from '../services/ReviewItemManagementService';
import { UnifiedContentType } from '../types';
import AppError from '../../../../utils/AppError';

export class ReviewItemManagementController {
  constructor(
    private managementService: ReviewItemManagementService,
    private unifiedReviewService: any // Será injetado
  ) {}

  // DELETE /api/unified-reviews/items/:contentId
  removeItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { contentId } = req.params;
      const { content_type, reason, notes } = req.body;

      if (!content_type) {
        throw AppError.badRequest("content_type é obrigatório");
      }

      await this.managementService.removeFromReviews(
        userId,
        contentId,
        content_type as UnifiedContentType,
        reason,
        notes
      );
      
      res.status(200).json({ 
        success: true, 
        message: 'Item removido das revisões com sucesso' 
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/unified-reviews/items/:contentId/restore
  restoreItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { contentId } = req.params;
      const { content_type } = req.body;

      if (!content_type) {
        throw AppError.badRequest("content_type é obrigatório");
      }

      await this.managementService.restoreToReviews(
        userId,
        contentId,
        content_type as UnifiedContentType
      );
      
      res.status(200).json({ 
        success: true, 
        message: 'Item restaurado às revisões com sucesso' 
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/unified-reviews/removed-items
  getRemovedItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { content_type } = req.query;

      const items = await this.managementService.getRemovedItems(
        userId,
        content_type as UnifiedContentType | undefined
      );
      
      res.status(200).json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/unified-reviews/removed-items/:removedItemId
  deleteRemovedItemPermanently = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { removedItemId } = req.params;

      await this.managementService.deleteRemovedItemPermanently(userId, removedItemId);
      
      res.status(200).json({ 
        success: true, 
        message: 'Item deletado permanentemente' 
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/unified-reviews/items/add-manual
  addManually = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { content_id, content_type } = req.body;

      if (!content_id || !content_type) {
        throw AppError.badRequest("content_id e content_type são obrigatórios");
      }

      // Adicionar forçadamente (ignorar auto-add)
      switch (content_type) {
        case UnifiedContentType.QUESTION:
          await this.unifiedReviewService.addQuestionToReviews(content_id, userId, true);
          break;
        case UnifiedContentType.FLASHCARD:
          // Implementar quando tiver o método
          throw AppError.badRequest("Adicionar flashcard manualmente ainda não implementado");
        case UnifiedContentType.ERROR_NOTEBOOK:
          await this.unifiedReviewService.addErrorNoteToReview(content_id, userId);
          break;
        default:
          throw AppError.badRequest("Tipo de conteúdo inválido");
      }
      
      res.status(201).json({ 
        success: true, 
        message: 'Item adicionado às revisões com sucesso' 
      });
    } catch (error) {
      next(error);
    }
  };
}
