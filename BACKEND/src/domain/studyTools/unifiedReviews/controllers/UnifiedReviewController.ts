import { Request, Response } from 'express';
import { UnifiedReviewService } from '../services/UnifiedReviewService';
import { FSRSGrade } from '../../../srs/services/FSRSService';
import { UnifiedContentType, UnifiedReviewFilters } from '../types';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
    emailVerified: boolean;
  };
}

export class UnifiedReviewController {
  constructor(private readonly unifiedReviewService: UnifiedReviewService) {}

  /**
   * GET /api/unified-reviews/due
   * Obter todas as revisões pendentes do usuário
   */
  getDueReviews = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      // Extrair filtros da query
      const filters: UnifiedReviewFilters = {};
      
      if (req.query.contentType) {
        const contentType = req.query.contentType as string;
        if (Object.values(UnifiedContentType).includes(contentType as UnifiedContentType)) {
          filters.contentType = contentType as UnifiedContentType;
        }
      }

      if (req.query.deckId) {
        filters.deckId = req.query.deckId as string;
      }

      if (req.query.dueOnly === 'true') {
        filters.dueOnly = true;
      }

      if (req.query.limit) {
        const limit = parseInt(req.query.limit as string);
        if (!isNaN(limit) && limit > 0 && limit <= 200) {
          filters.limit = limit;
        }
      }

      const dueReviews = await this.unifiedReviewService.getDueReviews(userId, filters);

      // ✅ CORREÇÃO: Log removido para evitar duplicação (já existe no Service)

      return res.status(200).json({
        success: true,
        message: 'Revisões devidas carregadas com sucesso',
        data: {
          reviews: dueReviews,
          total: dueReviews.length,
          filters: filters
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar revisões devidas via API:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };

  /**
   * POST /api/unified-reviews/record
   * Registrar uma revisão unificada
   */
  recordReview = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const { contentType, contentId, grade, reviewTimeMs } = req.body;

      // Validações
      if (!contentType || !contentId || grade === undefined) {
        return res.status(400).json({
          success: false,
          message: 'contentType, contentId e grade são obrigatórios'
        });
      }

      if (!Object.values(UnifiedContentType).includes(contentType)) {
        return res.status(400).json({
          success: false,
          message: 'contentType inválido'
        });
      }

      if (!Object.values(FSRSGrade).includes(grade)) {
        return res.status(400).json({
          success: false,
          message: 'grade inválido. Use 1 (AGAIN), 2 (HARD), 3 (GOOD), ou 4 (EASY)'
        });
      }

      const updatedItem = await this.unifiedReviewService.recordUnifiedReview(
        contentType,
        contentId,
        userId,
        grade,
        reviewTimeMs
      );

      logger.info(`Revisão registrada via API: ${contentType} ${contentId}, usuário ${userId}, grade ${grade}`);

      return res.status(200).json({
        success: true,
        message: 'Revisão registrada com sucesso',
        data: {
          reviewItem: updatedItem,
          nextDue: updatedItem.due,
          fsrsData: {
            stability: updatedItem.stability,
            difficulty: updatedItem.difficulty,
            state: updatedItem.state,
            reps: updatedItem.reps,
            lapses: updatedItem.lapses
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao registrar revisão via API:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };

  /**
   * GET /api/unified-reviews/today
   * Obter apenas revisões de hoje (otimizado para dashboard)
   */
  getTodayReviews = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const todayReviews = await this.unifiedReviewService.getTodayReviews(userId, limit);

      return res.status(200).json({
        success: true,
        message: 'Revisões de hoje carregadas com sucesso',
        data: {
          reviews: todayReviews,
          total: todayReviews.length,
          date: new Date().toISOString().split('T')[0]
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar revisões de hoje via API:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };

  /**
   * GET /api/unified-reviews/summary
   * Obter resumo diário de revisões
   */
  getDailySummary = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const summary = await this.unifiedReviewService.getDailyReviewSummary(userId);

      logger.info(`Resumo diário retornado via API para usuário ${userId}: ${summary.totalItems} itens`);

      return res.status(200).json({
        success: true,
        message: 'Resumo diário carregado com sucesso',
        data: {
          summary,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Erro ao gerar resumo diário via API:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };

  /**
   * GET /api/unified-reviews/future
   * Obter revisões futuras (agendadas para depois de hoje)
   */
  getFutureReviews = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      // Extrair filtros da query
      const filters: UnifiedReviewFilters = {};
      
      if (req.query.contentType) {
        const contentType = req.query.contentType as string;
        if (Object.values(UnifiedContentType).includes(contentType as UnifiedContentType)) {
          filters.contentType = contentType as UnifiedContentType;
        }
      }

      if (req.query.limit) {
        const limit = parseInt(req.query.limit as string);
        if (!isNaN(limit) && limit > 0 && limit <= 200) {
          filters.limit = limit;
        }
      }

      const futureReviews = await this.unifiedReviewService.getFutureReviews(userId, filters);

      // ✅ CORREÇÃO: Log removido para evitar duplicação (já existe no Service)

      return res.status(200).json({
        success: true,
        message: 'Revisões futuras carregadas com sucesso',
        data: {
          reviews: futureReviews,
          total: futureReviews.length,
          filters: filters
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar revisões futuras via API:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };

  /**
   * GET /api/unified-reviews/completed
   * Obter histórico de revisões completadas
   */
  getCompletedReviews = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      // Extrair filtros da query
      const filters: any = {};
      
      if (req.query.contentType) {
        const contentType = req.query.contentType as string;
        if (Object.values(UnifiedContentType).includes(contentType as UnifiedContentType)) {
          filters.contentType = contentType as UnifiedContentType;
        }
      }

      if (req.query.limit) {
        const limit = parseInt(req.query.limit as string);
        if (!isNaN(limit) && limit > 0 && limit <= 200) {
          filters.limit = limit;
        }
      }

      if (req.query.days) {
        const days = parseInt(req.query.days as string);
        if (!isNaN(days) && days > 0 && days <= 30) {
          filters.days = days;
        }
      }

      const completedReviews = await this.unifiedReviewService.getCompletedReviews(userId, filters);

      // ✅ CORREÇÃO: Log removido para evitar duplicação (já existe no Service)

      return res.status(200).json({
        success: true,
        message: 'Revisões completadas carregadas com sucesso',
        data: {
          reviews: completedReviews,
          total: completedReviews.length,
          filters: filters
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar revisões completadas via API:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };

  /**
   * POST /api/unified-reviews/create
   * Criar um novo item de revisão
   */
  createReviewItem = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const { contentType, contentId, metadata } = req.body;

      // Validações
      if (!contentType || !contentId) {
        return res.status(400).json({
          success: false,
          message: 'contentType e contentId são obrigatórios'
        });
      }

      if (!Object.values(UnifiedContentType).includes(contentType)) {
        return res.status(400).json({
          success: false,
          message: 'contentType inválido'
        });
      }

      const reviewItem = await this.unifiedReviewService.createReviewItem({
        userId,
        contentType,
        contentId,
        metadata
      });

      logger.info(`Item de revisão criado via API: ${contentType} ${contentId}, usuário ${userId}`);

      return res.status(201).json({
        success: true,
        message: 'Item de revisão criado com sucesso',
        data: {
          reviewItem
        }
      });
    } catch (error) {
      logger.error('Erro ao criar item de revisão via API:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
}