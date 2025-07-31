import { Request, Response, NextFunction } from 'express';
import { DailyLimitsService } from '../services/DailyLimitsService';
import { DayCompletionService, CompletionType } from '../services/DayCompletionService';
import { ReviewRemovalService, RemovalReason } from '../services/ReviewRemovalService';
import { UnifiedContentType } from '../types';
import AppError from '../../../../utils/AppError';

/**
 * Controller para funcionalidades avançadas do sistema de revisões unificado
 */
export class AdvancedFeaturesController {
  private dailyLimitsService: DailyLimitsService;
  private dayCompletionService: DayCompletionService;
  private reviewRemovalService: ReviewRemovalService;

  constructor(
    dailyLimitsService: DailyLimitsService,
    dayCompletionService: DayCompletionService,
    reviewRemovalService: ReviewRemovalService
  ) {
    this.dailyLimitsService = dailyLimitsService;
    this.dayCompletionService = dayCompletionService;
    this.reviewRemovalService = reviewRemovalService;
  }

  /**
   * Obter ID do usuário autenticado
   */
  private getAuthenticatedUserId(req: Request): string {
    if (!req.user || !req.user.id) {
      throw new AppError(401, 'Usuário não autenticado');
    }
    return req.user.id;
  }

  // ===== DAILY LIMITS ENDPOINTS =====

  /**
   * GET /advanced/daily-limits
   * Obter limites diários do usuário
   */
  getDailyLimits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      
      const limits = await this.dailyLimitsService.getUserDailyLimits(userId);
      
      res.status(200).json({
        data: limits,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /advanced/daily-limits
   * Definir/atualizar limites diários
   */
  setDailyLimits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { maxQuestions, maxFlashcards, maxErrorNotebook, maxTotalItems, resetHour, timezone } = req.body;

      // Validar dados
      if (!maxQuestions || !maxFlashcards || !maxErrorNotebook || !maxTotalItems) {
        throw new AppError('Todos os limites são obrigatórios', 400);
      }

      if (maxQuestions < 1 || maxFlashcards < 1 || maxErrorNotebook < 1 || maxTotalItems < 1) {
        throw new AppError('Limites devem ser maiores que zero', 400);
      }

      const limits = await this.dailyLimitsService.setUserDailyLimits(userId, {
        maxQuestions,
        maxFlashcards,
        maxErrorNotebook,
        maxTotalItems,
        resetHour,
        timezone,
      });

      res.status(200).json({
        message: 'Limites diários atualizados com sucesso',
        data: limits,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /advanced/daily-limits/status
   * Obter status atual dos limites diários
   */
  getDailyLimitStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      
      const status = await this.dailyLimitsService.checkDailyLimitStatus(userId);
      
      res.status(200).json({
        data: status,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /advanced/daily-limits/progress
   * Obter progresso diário atual
   */
  getTodayProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      
      const progress = await this.dailyLimitsService.getTodayProgress(userId);
      
      res.status(200).json({
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  };

  // ===== DAY COMPLETION ENDPOINTS =====

  /**
   * POST /advanced/day-completion/complete
   * Marcar dia como completo
   */
  completeDayStudy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { 
        completionType, 
        totalItemsReviewed, 
        questionsReviewed, 
        flashcardsReviewed, 
        errorNotebookReviewed,
        totalTimeMinutes,
        averageResponseTimeSeconds,
        accuracyPercentage,
        manualNotes
      } = req.body;

      // Validar dados obrigatórios
      if (!completionType || totalItemsReviewed === undefined || totalTimeMinutes === undefined) {
        throw new AppError('Dados de completação incompletos', 400);
      }

      // Validar tipo de completação
      if (!Object.values(CompletionType).includes(completionType)) {
        throw new AppError('Tipo de completação inválido', 400);
      }

      const completion = await this.dayCompletionService.completeDayStudy(
        userId,
        completionType,
        {
          totalItemsReviewed,
          questionsReviewed: questionsReviewed || 0,
          flashcardsReviewed: flashcardsReviewed || 0,
          errorNotebookReviewed: errorNotebookReviewed || 0,
          totalTimeMinutes,
          averageResponseTimeSeconds,
          accuracyPercentage,
        },
        manualNotes
      );

      res.status(201).json({
        message: 'Dia marcado como completo com sucesso',
        data: completion,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /advanced/day-completion/today
   * Obter completação de hoje (se existir)
   */
  getTodayCompletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      
      const completion = await this.dayCompletionService.getTodayCompletion(userId);
      
      res.status(200).json({
        data: completion,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /advanced/day-completion/stats
   * Obter estatísticas de completação
   */
  getCompletionStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      
      const stats = await this.dayCompletionService.getDayCompletionStats(userId);
      
      res.status(200).json({
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /advanced/day-completion/suggest
   * Sugerir se o dia deve ser marcado como completo
   */
  suggestDayCompletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { itemsReviewed, timeSpent, accuracy } = req.body;

      if (itemsReviewed === undefined || timeSpent === undefined || accuracy === undefined) {
        throw new AppError('Dados de estatísticas incompletos', 400);
      }

      const suggestion = await this.dayCompletionService.suggestDayCompletion(userId, {
        itemsReviewed,
        timeSpent,
        accuracy,
      });

      res.status(200).json({
        data: suggestion,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /advanced/day-completion/history
   * Obter histórico de completações
   */
  getCompletionHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { days } = req.query;

      const daysNumber = days ? parseInt(days as string) : 30;
      if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
        throw new AppError('Número de dias deve estar entre 1 e 365', 400);
      }

      const history = await this.dayCompletionService.getCompletionHistory(userId, daysNumber);

      res.status(200).json({
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };

  // ===== REVIEW REMOVAL ENDPOINTS =====

  /**
   * DELETE /advanced/review-removal/:contentType/:contentId
   * Remover item do sistema de revisões
   */
  removeFromReviewSystem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { contentType, contentId } = req.params;
      const { reason, notes } = req.body;

      // Validar contentType
      if (!Object.values(UnifiedContentType).includes(contentType as UnifiedContentType)) {
        throw new AppError('Tipo de conteúdo inválido', 400);
      }

      // Validar reason
      if (!reason || !Object.values(RemovalReason).includes(reason)) {
        throw new AppError('Razão de remoção inválida', 400);
      }

      const removedItem = await this.reviewRemovalService.removeFromReviewSystem(
        userId,
        contentType as UnifiedContentType,
        contentId,
        reason as RemovalReason,
        notes
      );

      res.status(200).json({
        message: 'Item removido do sistema de revisões com sucesso',
        data: removedItem,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /advanced/review-removal/bulk
   * Remover múltiplos itens em lote
   */
  bulkRemoveFromReviewSystem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('Lista de itens é obrigatória', 400);
      }

      // Validar cada item
      for (const item of items) {
        if (!item.contentType || !item.contentId || !item.reason) {
          throw new AppError('Dados incompletos para remoção em lote', 400);
        }
        
        if (!Object.values(UnifiedContentType).includes(item.contentType)) {
          throw new AppError(`Tipo de conteúdo inválido: ${item.contentType}`, 400);
        }
        
        if (!Object.values(RemovalReason).includes(item.reason)) {
          throw new AppError(`Razão de remoção inválida: ${item.reason}`, 400);
        }
      }

      const result = await this.reviewRemovalService.bulkRemoveFromReviewSystem(userId, items);

      res.status(200).json({
        message: `Remoção em lote concluída: ${result.successfullyRemoved}/${result.totalRequested} itens removidos`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /advanced/review-removal/restore/:removedItemId
   * Restaurar item removido
   */
  restoreToReviewSystem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { removedItemId } = req.params;

      await this.reviewRemovalService.restoreToReviewSystem(userId, removedItemId);

      res.status(200).json({
        message: 'Item restaurado para o sistema de revisões com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /advanced/review-removal/removed
   * Obter itens removidos
   */
  getRemovedItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { contentType, reason, canRestoreOnly, limit, page } = req.query;

      const options: any = {};
      
      if (contentType && Object.values(UnifiedContentType).includes(contentType as UnifiedContentType)) {
        options.contentType = contentType as UnifiedContentType;
      }
      
      if (reason && Object.values(RemovalReason).includes(reason as RemovalReason)) {
        options.reason = reason as RemovalReason;
      }
      
      if (canRestoreOnly === 'true') {
        options.canRestoreOnly = true;
      }
      
      if (limit) {
        const limitNum = parseInt(limit as string);
        if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
          options.limit = limitNum;
        }
      }
      
      if (page) {
        const pageNum = parseInt(page as string);
        if (!isNaN(pageNum) && pageNum > 0) {
          options.page = pageNum;
        }
      }

      const result = await this.reviewRemovalService.getRemovedItems(userId, options);

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /advanced/review-removal/stats
   * Obter estatísticas de remoção
   */
  getRemovalStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      
      const stats = await this.reviewRemovalService.getRemovalStats(userId);
      
      res.status(200).json({
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  // ===== ADMIN ENDPOINTS =====

  /**
   * POST /advanced/admin/cleanup
   * Limpeza automática de itens antigos (apenas para admins)
   */
  cleanupOldRemovedItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO: Adicionar verificação de permissão de admin
      const { daysOld } = req.body;
      
      const daysNumber = daysOld || 90;
      if (daysNumber < 30) {
        throw new AppError('Não é possível limpar itens com menos de 30 dias', 400);
      }

      const deletedCount = await this.reviewRemovalService.cleanupOldRemovedItems(daysNumber);

      res.status(200).json({
        message: `Limpeza concluída: ${deletedCount} itens removidos permanentemente`,
        data: { deletedCount },
      });
    } catch (error) {
      next(error);
    }
  };
}