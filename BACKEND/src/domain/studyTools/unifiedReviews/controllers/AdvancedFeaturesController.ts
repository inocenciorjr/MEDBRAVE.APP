import { Request, Response, NextFunction } from 'express';
import { DailyLimitsService } from '../services';
import { DayCompletionService, CompletionType } from '../services';
 
import AppError from '../../../../utils/AppError';

/**
 * Controller para funcionalidades avançadas do sistema de revisões unificado
 */
export class AdvancedFeaturesController {
  private dailyLimitsService: DailyLimitsService;
  private dayCompletionService: DayCompletionService;

  constructor(
    dailyLimitsService: DailyLimitsService,
    dayCompletionService: DayCompletionService,
  ) {
    this.dailyLimitsService = dailyLimitsService;
    this.dayCompletionService = dayCompletionService;
  }

  /**
   * Obter ID do usuário autenticado
   */
  private getAuthenticatedUserId(req: Request): string {
    if (!req.user || !req.user.id) {
      throw new AppError('Usuário não autenticado', 401);
    }
    return req.user.id;
  }

  // ===== DAILY LIMITS ENDPOINTS =====

  /**
   * GET /advanced/daily-limits
   * Obter limites diários do usuário
   */
  getDailyLimits = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);

      const limits = await this.dailyLimitsService.getDailyLimits(userId);

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
  setDailyLimits = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const {
        maxDailyReviews,
        maxDailyNewItems,
        maxDailyTimeMinutes,
        enableAutoStop,
        enableSmartLimits,
      } = req.body;

      if (
        maxDailyReviews === undefined ||
        maxDailyNewItems === undefined ||
        maxDailyTimeMinutes === undefined
      ) {
        throw new AppError('Limites diários são obrigatórios', 400);
      }

      if (
        maxDailyReviews < 1 ||
        maxDailyNewItems < 0 ||
        maxDailyTimeMinutes < 1
      ) {
        throw new AppError('Valores inválidos para limites diários', 400);
      }

      const limits = await this.dailyLimitsService.setDailyLimits(userId, {
        maxDailyReviews,
        maxDailyNewItems,
        maxDailyTimeMinutes,
        enableAutoStop: !!enableAutoStop,
        enableSmartLimits: !!enableSmartLimits,
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
  getDailyLimitStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);

      const status =
        await this.dailyLimitsService.checkDailyLimitStatus(userId);

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
  getTodayProgress = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);

      const progress = await this.dailyLimitsService.getDailyProgress(userId);

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
  completeDayStudy = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
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
        manualNotes,
      } = req.body;

      // Validar dados obrigatórios
      if (
        !completionType ||
        totalItemsReviewed === undefined ||
        totalTimeMinutes === undefined
      ) {
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
        manualNotes,
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
  getTodayCompletion = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);

      const completion =
        await this.dayCompletionService.getTodayCompletion(userId);

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
  getCompletionStats = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);

      const stats =
        await this.dayCompletionService.getDayCompletionStats(userId);

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
  suggestDayCompletion = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { itemsReviewed, timeSpent, accuracy } = req.body;

      if (
        itemsReviewed === undefined ||
        timeSpent === undefined ||
        accuracy === undefined
      ) {
        throw new AppError('Dados de estatísticas incompletos', 400);
      }

      const suggestion = await this.dayCompletionService.suggestDayCompletion(
        userId,
        {
          itemsReviewed,
          timeSpent,
          accuracy,
        },
      );

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
  getCompletionHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const { days } = req.query;

      const daysNumber = days ? parseInt(days as string) : 30;
      if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
        throw new AppError('Número de dias deve estar entre 1 e 365', 400);
      }

      const history = await this.dayCompletionService.getCompletionHistory(
        userId,
        daysNumber,
      );

      res.status(200).json({
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };











  // ===== ADMIN ENDPOINTS =====


}
