import { Request, Response } from 'express';
import { ReviewManagementService, MarkDayCompleteOptions, RemoveFromReviewsOptions } from '../services/ReviewManagementService';
import { RemovalReason } from '../services/ReviewRemovalService';
import { FSRSGrade } from '../../../srs/services/FSRSService';
import { UnifiedContentType } from '../types';
import { logger } from '../../../../utils/logger';
import { AppError } from '../../../../shared/errors/AppError';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export class ReviewManagementController {
  private reviewManagementService: ReviewManagementService;

  constructor(reviewManagementService: ReviewManagementService) {
    this.reviewManagementService = reviewManagementService;
  }

  /**
   * POST /api/reviews/mark-day-complete
   * Marcar dia como concluído
   */
  markDayComplete = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { skipGrade, applyGrade, notes } = req.body;
      const userId = req.user.id;

      // Validar grade se fornecido
      if (applyGrade && !Object.values(FSRSGrade).includes(applyGrade)) {
        return res.status(400).json({ 
          error: 'Grade inválido. Use: AGAIN, HARD, GOOD, ou EASY' 
        });
      }

      const options: MarkDayCompleteOptions = {
        skipGrade: skipGrade === true,
        applyGrade: applyGrade || FSRSGrade.GOOD,
        notes
      };

      const result = await this.reviewManagementService.markDayComplete(userId, options);

      return res.status(200).json({
        success: true,
        message: 'Dia marcado como completo com sucesso',
        data: result
      });
    } catch (error) {
      logger.error('Erro ao marcar dia como completo:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  /**
   * DELETE /api/reviews/remove-item
   * Remover item do ciclo de revisões
   */
  removeFromReviews = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { contentType, contentId, reason, notes, softDelete } = req.body;
      const userId = req.user.id;

      // Validações
      if (!contentType || !contentId || !reason) {
        return res.status(400).json({ 
          error: 'contentType, contentId e reason são obrigatórios' 
        });
      }

      // Validar contentType
      const validContentTypes: UnifiedContentType[] = ['flashcard', 'question', 'error_notebook'];
      if (!validContentTypes.includes(contentType)) {
        return res.status(400).json({ 
          error: `contentType deve ser um de: ${validContentTypes.join(', ')}` 
        });
      }

      // Validar reason
      if (!Object.values(RemovalReason).includes(reason)) {
        return res.status(400).json({ 
          error: `reason deve ser um de: ${Object.values(RemovalReason).join(', ')}` 
        });
      }

      const options: RemoveFromReviewsOptions = {
        reason,
        notes,
        softDelete: softDelete !== false // Padrão: true
      };

      const result = await this.reviewManagementService.removeFromReviews(
        userId,
        contentType,
        contentId,
        options
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      logger.error('Erro ao remover item das revisões:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  /**
   * POST /api/reviews/restore-item
   * Restaurar item removido para o ciclo de revisões
   */
  restoreToReviews = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { removedItemId } = req.body;
      const userId = req.user.id;

      if (!removedItemId) {
        return res.status(400).json({ error: 'removedItemId é obrigatório' });
      }

      const result = await this.reviewManagementService.restoreToReviews(userId, removedItemId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      logger.error('Erro ao restaurar item:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  /**
   * GET /api/reviews/removed-items
   * Obter itens removidos do usuário
   */
  getRemovedItems = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { limit } = req.query;
      const userId = req.user.id;
      const itemLimit = limit ? parseInt(limit as string, 10) : 50;

      if (isNaN(itemLimit) || itemLimit < 1 || itemLimit > 200) {
        return res.status(400).json({ 
          error: 'limit deve ser um número entre 1 e 200' 
        });
      }

      const removedItems = await this.reviewManagementService.getRemovedItems(userId, itemLimit);

      return res.status(200).json({
        success: true,
        message: 'Itens removidos obtidos com sucesso',
        data: {
          items: removedItems,
          count: removedItems.length,
          limit: itemLimit
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar itens removidos:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  /**
   * GET /api/reviews/day-completion-stats
   * Obter estatísticas de completação de dias
   */
  getDayCompletionStats = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const userId = req.user.id;
      const stats = await this.reviewManagementService.getDayCompletionStats(userId);

      return res.status(200).json({
        success: true,
        message: 'Estatísticas de completação obtidas com sucesso',
        data: stats
      });
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de completação:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  /**
   * GET /api/reviews/completion-history
   * Obter histórico de completações
   */
  getCompletionHistory = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { days } = req.query;
      const userId = req.user.id;
      const historyDays = days ? parseInt(days as string, 10) : 30;

      if (isNaN(historyDays) || historyDays < 1 || historyDays > 365) {
        return res.status(400).json({ 
          error: 'days deve ser um número entre 1 e 365' 
        });
      }

      const history = await this.reviewManagementService.getCompletionHistory(userId, historyDays);

      return res.status(200).json({
        success: true,
        message: 'Histórico de completações obtido com sucesso',
        data: {
          history,
          days: historyDays,
          count: history.length
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar histórico de completações:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  /**
   * GET /api/reviews/removal-reasons
   * Obter lista de razões de remoção disponíveis
   */
  getRemovalReasons = async (req: Request, res: Response): Promise<Response> => {
    try {
      const reasons = Object.values(RemovalReason).map(reason => ({
        value: reason,
        label: this.getRemovalReasonLabel(reason)
      }));

      return res.status(200).json({
        success: true,
        message: 'Razões de remoção obtidas com sucesso',
        data: reasons
      });
    } catch (error) {
      logger.error('Erro ao buscar razões de remoção:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  /**
   * GET /api/reviews/fsrs-grades
   * Obter lista de grades FSRS disponíveis
   */
  getFSRSGrades = async (req: Request, res: Response): Promise<Response> => {
    try {
      const grades = Object.values(FSRSGrade).map(grade => ({
        value: grade,
        label: this.getFSRSGradeLabel(grade)
      }));

      return res.status(200).json({
        success: true,
        message: 'Grades FSRS obtidos com sucesso',
        data: grades
      });
    } catch (error) {
      logger.error('Erro ao buscar grades FSRS:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  /**
   * Obter label amigável para razão de remoção
   */
  private getRemovalReasonLabel(reason: RemovalReason): string {
    const labels: Record<RemovalReason, string> = {
      [RemovalReason.USER_REQUEST]: 'Solicitação do usuário',
      [RemovalReason.CONTENT_DELETED]: 'Conteúdo deletado',
      [RemovalReason.DUPLICATE]: 'Item duplicado',
      [RemovalReason.MASTERED]: 'Item dominado',
      [RemovalReason.INAPPROPRIATE]: 'Conteúdo inapropriado',
      [RemovalReason.SYSTEM_CLEANUP]: 'Limpeza do sistema'
    };
    return labels[reason] || reason;
  }

  /**
   * Obter label amigável para grade FSRS
   */
  private getFSRSGradeLabel(grade: FSRSGrade): string {
    const labels: Record<FSRSGrade, string> = {
      [FSRSGrade.AGAIN]: 'Novamente (Esqueci)',
      [FSRSGrade.HARD]: 'Difícil',
      [FSRSGrade.GOOD]: 'Bom',
      [FSRSGrade.EASY]: 'Fácil'
    };
    return labels[grade] || grade;
  }
}