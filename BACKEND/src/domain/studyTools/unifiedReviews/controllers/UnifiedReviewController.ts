import { Request, Response } from 'express';
import { UnifiedReviewService } from '../services';
// FSRS Types and Enums - moved from SupabaseFSRSService
enum FSRSGrade {
  AGAIN = 0,
  HARD = 1,
  GOOD = 2,
  EASY = 3,
}
import { UnifiedContentType, UnifiedReviewFilters } from '../types';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    user_role: string;
    email: string;
    emailVerified: boolean;
  };
}

export class UnifiedReviewController {
  constructor(
    private readonly unifiedReviewService: UnifiedReviewService,
    private readonly timezoneService?: any,
    private readonly supabase?: any
  ) { }

  /**
   * GET /api/unified-reviews/due
   * Obter todas as revisões pendentes do usuário
   */
  getDueReviews = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      // Extrair filtros da query
      const filters: UnifiedReviewFilters = {};

      if (req.query.contentType) {
        const content_type = req.query.contentType as string;
        if (
          Object.values(UnifiedContentType).includes(
            content_type as UnifiedContentType,
          )
        ) {
          filters.content_type = content_type as UnifiedContentType;
        }
      }

      if (req.query.deckId) {
        filters.deck_id = req.query.deckId as string;
      }

      if (req.query.dueOnly !== undefined) {
        filters.due_only = req.query.dueOnly === 'true';
      }

      if (req.query.limit) {
        const limit = parseInt(req.query.limit as string);
        if (!isNaN(limit) && limit > 0 && limit <= 200) {
          filters.limit = limit;
        }
      }

      const dueReviews = await this.unifiedReviewService.getDueReviews(
        user_id,
        filters.limit,
        filters.content_type ? [filters.content_type] : undefined,
      );

      // ✅ CORREÇÃO: Log removido para evitar duplicação (já existe no Service)

      return res.status(200).json({
        success: true,
        message: 'Revisões devidas carregadas com sucesso',
        data: {
          reviews: dueReviews,
          total: dueReviews.length,
          filters: filters,
        },
      });
    } catch (error) {
      logger.error('Erro ao buscar revisões devidas via API:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * POST /api/unified-reviews/record
   * Registrar uma revisão unificada
   */
  recordReview = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const { content_type, content_id, grade, review_time_ms } = req.body;

      // Validações
      if (!content_type || !content_id || grade === undefined) {
        return res.status(400).json({
          success: false,
          message: 'content_type, content_id e grade são obrigatórios',
        });
      }

      if (!Object.values(UnifiedContentType).includes(content_type)) {
        return res.status(400).json({
          success: false,
          message: 'content_type inválido',
        });
      }

      if (!Object.values(FSRSGrade).includes(grade)) {
        return res.status(400).json({
          success: false,
          message:
            'grade inválido. Use 0 (AGAIN), 1 (HARD), 2 (GOOD), ou 3 (EASY)',
        });
      }

      // Registrar a revisão
      // isActiveReview = true porque é na página de revisões (revisão ativa)
      await this.unifiedReviewService.recordReview(
        user_id,
        content_id,
        grade,
        review_time_ms,
        true // isActiveReview = true (página de revisões)
      );

      // Buscar o card atualizado para retornar os dados FSRS
      const dueReviews = await this.unifiedReviewService.getDueReviews(user_id, 1000);
      const updatedCard = dueReviews.find(item => item.content_id === content_id);

      if (!updatedCard) {
        // Se não encontrou nos due reviews, buscar nos today reviews
        const todayReviews = await this.unifiedReviewService.getTodayReviews(user_id, 1000);
        const todayCard = todayReviews.find(item => item.content_id === content_id);

        if (todayCard) {
          logger.info(
            `Revisão registrada via API: ${content_type} ${content_id}, usuário ${user_id}, grade ${grade}`
          );

          return res.status(200).json({
            success: true,
            message: 'Revisão registrada com sucesso',
            data: {
              reviewItem: todayCard,
              nextDue: todayCard.due,
              fsrsData: {
                stability: todayCard.stability,
                difficulty: todayCard.difficulty,
                state: todayCard.state,
                reps: todayCard.reps,
                lapses: todayCard.lapses,
              },
            },
          });
        }
      }

      logger.info(
        `Revisão registrada via API: ${content_type} ${content_id}, usuário ${user_id}, grade ${grade}`
      );

      return res.status(200).json({
        success: true,
        message: 'Revisão registrada com sucesso',
        data: {
          reviewItem: updatedCard || null,
          nextDue: updatedCard?.due || null,
          fsrsData: updatedCard ? {
            stability: updatedCard.stability,
            difficulty: updatedCard.difficulty,
            state: updatedCard.state,
            reps: updatedCard.reps,
            lapses: updatedCard.lapses,
          } : null,
        },
      });
    } catch (error) {
      logger.error('Erro ao registrar revisão via API:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/unified-reviews/today
   * Obter apenas revisões de hoje (otimizado para dashboard)
   */
  getTodayReviews = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const todayReviews = await this.unifiedReviewService.getTodayReviews(
        user_id,
        limit,
      );

      return res.status(200).json({
        success: true,
        message: 'Revisões de hoje carregadas com sucesso',
        data: {
          reviews: todayReviews,
          total: todayReviews.length,
          date: new Date().toISOString().split('T')[0],
        },
      });
    } catch (error) {
      logger.error('Erro ao buscar revisões de hoje via API:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/unified-reviews/summary
   * Obter resumo diário de revisões
   */
  getDailySummary = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const summary =
        await this.unifiedReviewService.getDailySummary(user_id);

      logger.info(
        `Resumo diário retornado via API para usuário ${user_id}: ${summary.total_items} itens`,
      );

      return res.status(200).json({
        success: true,
        message: 'Resumo diário carregado com sucesso',
        data: {
          summary,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Erro ao gerar resumo diário via API:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/unified-reviews/future
   * Obter revisões futuras (agendadas para depois de hoje)
   */
  getFutureReviews = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      // Extrair filtros da query
      const filters: UnifiedReviewFilters = {};

      if (req.query.contentType) {
        const content_type = req.query.contentType as string;
        if (
          Object.values(UnifiedContentType).includes(
            content_type as UnifiedContentType,
          )
        ) {
          filters.content_type = content_type as UnifiedContentType;
        }
      }

      if (req.query.limit) {
        const limit = parseInt(req.query.limit as string);
        if (!isNaN(limit) && limit > 0 && limit <= 200) {
          filters.limit = limit;
        }
      }

      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const futureReviews = await this.unifiedReviewService.getFutureReviews(
        user_id,
        filters.limit,
        startDate,
        endDate,
      );

      return res.status(200).json({
        success: true,
        message: 'Revisões futuras carregadas com sucesso',
        data: {
          reviews: futureReviews,
          total: futureReviews.length,
          filters: filters,
        },
      });
    } catch (error) {
      logger.error('Erro ao buscar revisões futuras via API:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/unified-reviews/completed
   * Obter histórico de revisões completadas
   */
  getCompletedReviews = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      // Extrair filtros da query
      const filters: any = {};

      if (req.query.contentType) {
        const content_type = req.query.contentType as string;
        if (
          Object.values(UnifiedContentType).includes(
            content_type as UnifiedContentType,
          )
        ) {
          filters.content_types = [content_type as UnifiedContentType];
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

      const completedReviews =
        await this.unifiedReviewService.getCompletedReviews(user_id, filters);

      // ✅ CORREÇÃO: Log removido para evitar duplicação (já existe no Service)

      return res.status(200).json({
        success: true,
        message: 'Revisões completadas carregadas com sucesso',
        data: {
          reviews: completedReviews,
          total: completedReviews.length,
          filters: filters,
        },
      });
    } catch (error) {
      logger.error('Erro ao buscar revisões completadas via API:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/unified-reviews/history/:contentId
   * Obter histórico de revisões de um item específico
   */
  getReviewHistory = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const { contentId } = req.params;
      if (!contentId) {
        return res.status(400).json({
          success: false,
          message: 'Content ID é obrigatório',
        });
      }

      const history = await this.unifiedReviewService.getReviewHistory(
        user_id,
        contentId,
      );

      return res.status(200).json({
        success: true,
        message: 'Histórico de revisões carregado com sucesso',
        data: {
          history,
          total: history.length,
        },
      });
    } catch (error) {
      logger.error('Erro ao buscar histórico de revisões via API:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * POST /api/unified-reviews/create
   * Criar um novo item de revisão
   */
  createReviewItem = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const { contentType, contentId, title } = req.body;

      if (!contentType || !contentId || !title) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios ausentes',
          details: {
            required: ['contentType', 'contentId', 'title'],
            received: { contentType, contentId, title },
          },
        });
      }

      const reviewItem = await this.unifiedReviewService.createReviewItem(
        user_id,
        contentType,
        contentId,
        title,
      );

      logger.info(
        `Item de revisão criado via API: ${contentType} ${contentId}, usuário ${user_id}`,
      );

      return res.status(201).json({
        success: true,
        message: 'Item de revisão criado com sucesso',
        data: {
          reviewItem,
        },
      });
    } catch (error) {
      logger.error('Erro ao criar item de revisão via API:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/unified-reviews/due-prioritized
   * Obter revisões com priorização inteligente
   */
  getDueReviewsPrioritized = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const reviews = await (this.unifiedReviewService as any).getDueReviewsPrioritized(user_id, limit);

      return res.status(200).json({
        success: true,
        message: 'Revisões priorizadas carregadas com sucesso',
        data: {
          reviews,
          total: reviews.length,
        },
      });
    } catch (error) {
      logger.error('Erro ao buscar revisões priorizadas:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/unified-reviews/due-balanced
   * Obter revisões com balanceamento de tipos
   */
  getDueReviewsBalanced = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const reviews = await (this.unifiedReviewService as any).getDueReviewsBalanced(user_id, limit);

      return res.status(200).json({
        success: true,
        message: 'Revisões balanceadas carregadas com sucesso',
        data: {
          reviews,
          total: reviews.length,
        },
      });
    } catch (error) {
      logger.error('Erro ao buscar revisões balanceadas:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/unified-reviews/check-sequence/:contentType/:contentId
   * Verificar se há sequência de 3x GOOD ou EASY seguidas
   */
  checkConsecutiveGoodResponses = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const { contentType, contentId } = req.params;

      if (!contentType || !contentId) {
        return res.status(400).json({
          success: false,
          message: 'contentType e contentId são obrigatórios',
        });
      }

      // Buscar últimas 10 revisões para verificar sequência consecutiva
      const allReviews = await this.unifiedReviewService.getRecentReviews(
        user_id,
        contentId,
        contentType.toUpperCase() as UnifiedContentType,
        10
      );

      // Encontrar as últimas 3 revisões CONSECUTIVAS que são GOOD (2) ou EASY (3)
      let consecutiveCount = 0;
      let consecutiveReviews: any[] = [];

      for (const review of allReviews) {
        if (review.grade === 2 || review.grade === 3) {
          consecutiveCount++;
          consecutiveReviews.push(review);

          if (consecutiveCount === 3) {
            break; // Encontramos 3 consecutivas
          }
        } else {
          // Se encontrou AGAIN (0) ou HARD (1), quebra a sequência
          break;
        }
      }

      const hasThreeConsecutive = consecutiveCount === 3;
      const consecutiveEasy = hasThreeConsecutive &&
        consecutiveReviews.every(r => r.grade === 3);

      // Validar que as revisões respeitaram o threshold (70% para GOOD/EASY)
      let validSequence = hasThreeConsecutive;
      if (hasThreeConsecutive) {
        for (const review of consecutiveReviews) {
          const threshold = 0.7; // 70% para GOOD/EASY
          const minElapsed = Math.floor((review.scheduled_days || 0) * threshold);

          // Se elapsed_days < minElapsed, não respeitou o threshold
          if ((review.elapsed_days || 0) < minElapsed) {
            validSequence = false;
            logger.info(`[checkSequence] Revisão não respeitou threshold: elapsed=${review.elapsed_days}, min=${minElapsed}`);
            break;
          }
        }
      }

      // Buscar o scheduled_days do review mais recente (que é o atual)
      let scheduledDays = 0;
      if (validSequence && consecutiveReviews.length > 0) {
        scheduledDays = consecutiveReviews[0].scheduled_days || 0;
      }

      logger.info(`[checkSequence] ${contentId}: consecutiveCount=${consecutiveCount}, validSequence=${validSequence}, scheduledDays=${scheduledDays}`);

      return res.status(200).json({
        success: true,
        data: {
          shouldSuggestDelete: validSequence,
          consecutiveCount: validSequence ? consecutiveCount : 0,
          grade: consecutiveEasy ? 'easy' : 'good',
          scheduledDays: scheduledDays,
        },
      });
    } catch (error) {
      logger.error('Erro ao verificar sequência de respostas:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * DELETE /api/unified-reviews/:contentType/:contentId
   * Excluir card FSRS (remover item das revisões)
   */
  deleteReview = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const { contentType, contentId } = req.params;

      if (!contentType || !contentId) {
        return res.status(400).json({
          success: false,
          message: 'contentType e contentId são obrigatórios',
        });
      }

      await this.unifiedReviewService.deleteReviewItem(
        user_id,
        contentId,
        contentType.toUpperCase() as UnifiedContentType
      );

      logger.info(`[deleteReview] Card excluído: ${contentType}/${contentId} do usuário ${user_id}`);

      return res.status(200).json({
        success: true,
        message: 'Item removido do sistema de revisão',
      });
    } catch (error) {
      logger.error('Erro ao excluir revisão:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/unified-reviews/planner
   * Endpoint específico para o planner - retorna revisões agrupadas por data
   * Inclui tanto revisões pendentes quanto informações sobre revisões completadas
   */
  getPlannerReviews = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;

      // Buscar revisões pendentes
      const pendingReviews = await this.unifiedReviewService.getFutureReviews(
        user_id,
        limit,
        startDate,
        endDate,
      );

      // Buscar revisões respondidas no período (para mostrar progresso)
      // IMPORTANTE: Contar apenas revisões que foram respondidas em SESSÃO DE REVISÃO
      // Usar question_responses com study_mode = 'unified_review' para filtrar corretamente
      const userTimezone = await this.timezoneService.getUserTimezone(user_id);

      // Criar Date objects para início e fim do período no timezone do usuário
      const startDateObj = new Date(`${startDate || new Date().toISOString().split('T')[0]}T00:00:00`);
      const endDateObj = new Date(`${endDate || new Date().toISOString().split('T')[0]}T23:59:59`);

      // Buscar TODOS os cards FSRS que foram revisados no período
      // Usar last_review para identificar revisões completadas (funciona para todos os tipos)
      let reviewedItems: any[] = [];
      
      try {
        // Buscar cards que foram revisados no período (last_review dentro do intervalo)
        const { data: cards, error: cardsError } = await this.supabase
          .from('fsrs_cards')
          .select('id, content_id, content_type, due, last_review')
          .eq('user_id', user_id)
          .not('last_review', 'is', null)
          .gte('last_review', startDateObj.toISOString())
          .lte('last_review', endDateObj.toISOString());

        if (cardsError) {
          logger.error('Erro ao buscar cards revisados:', cardsError);
        } else {
          reviewedItems = (cards || []).map((card: any) => ({
            content_id: card.content_id,
            content_type: card.content_type,
            due: card.due,
            last_review: card.last_review,
          }));
          
          logger.info(`[Planner] Encontrados ${reviewedItems.length} cards revisados no período`);
        }
      } catch (error) {
        logger.error('Exceção ao buscar cards revisados:', error);
      }

      // Buscar eventos do planner para obter total_count e completed_count corretos
      const { data: plannerEvents, error: eventsError } = await this.supabase
        .from('planner_events')
        .select('date, content_type, total_count, completed_count')
        .eq('user_id', user_id)
        .gte('date', startDate || new Date().toISOString().split('T')[0])
        .lte('date', endDate || new Date().toISOString().split('T')[0]);

      if (eventsError) {
        logger.error('Erro ao buscar eventos do planner:', eventsError);
      }

      // Criar mapa de eventos por data e tipo
      const eventsMap: Record<string, Record<string, any>> = {};
      (plannerEvents || []).forEach((event: any) => {
        const dateKey = event.date;
        if (!eventsMap[dateKey]) {
          eventsMap[dateKey] = {};
        }
        eventsMap[dateKey][event.content_type] = {
          total_count: event.total_count,
          completed_count: event.completed_count,
        };
      });

      // Agrupar por data e tipo
      const grouped: Record<string, Record<string, any>> = {};

      // PRIMEIRO: Inicializar com eventos do planner (para garantir que apareçam mesmo sem pendentes)
      Object.entries(eventsMap).forEach(([dateKey, types]) => {
        if (!grouped[dateKey]) {
          grouped[dateKey] = {};
        }
        Object.entries(types).forEach(([contentType, eventData]: [string, any]) => {
          if (!grouped[dateKey][contentType]) {
            grouped[dateKey][contentType] = {
              content_type: contentType,
              count: eventData.total_count || 0,
              completed_count: eventData.completed_count || 0,
              reviews: [],
              completed_reviews: [],
            };
          }
        });
      });

      // Adicionar revisões pendentes
      pendingReviews.forEach((review: any) => {
        // Converter due para Date
        const dueDate = typeof review.due === 'string' ? new Date(review.due) : review.due;

        // Converter para o timezone do usuário e extrair apenas a data (YYYY-MM-DD)
        const dateInUserTimezone = dueDate.toLocaleString('en-US', {
          timeZone: userTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });

        // Converter de MM/DD/YYYY para YYYY-MM-DD
        const [month, day, year] = dateInUserTimezone.split('/');
        const dateKey = `${year}-${month}-${day}`;

        const typeKey = review.content_type;

        if (!grouped[dateKey]) {
          grouped[dateKey] = {};
        }
        if (!grouped[dateKey][typeKey]) {
          // Usar total_count e completed_count do evento, se existir
          const eventData = eventsMap[dateKey]?.[typeKey];
          grouped[dateKey][typeKey] = {
            content_type: typeKey,
            count: eventData?.total_count || 0,
            completed_count: eventData?.completed_count || 0,
            reviews: [],
          };
        }

        grouped[dateKey][typeKey].reviews.push(review);
      });



      // Adicionar revisões respondidas (apenas para lista de completed_reviews, NÃO para contagem)
      // O completed_count já vem correto do evento do planner
      if (reviewedItems && reviewedItems.length > 0) {
        reviewedItems.forEach((item: any) => {
          const dueDate = new Date(item.due);

          // Converter due para o timezone do usuário
          const dueDateInUserTimezone = dueDate.toLocaleString('en-US', {
            timeZone: userTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });

          const [dueMonth, dueDay, dueYear] = dueDateInUserTimezone.split('/');
          const dueDateKey = `${dueYear}-${dueMonth}-${dueDay}`;

          const typeKey = item.content_type;

          // IMPORTANTE: Contar a revisão completada na data em que ela estava programada (due),
          // não na data em que foi respondida (last_review)
          // Isso garante que revisões atrasadas sejam contadas na data correta
          const dateKey = dueDateKey;

          if (!grouped[dateKey]) {
            grouped[dateKey] = {};
          }
          if (!grouped[dateKey][typeKey]) {
            grouped[dateKey][typeKey] = {
              content_type: typeKey,
              count: 0,
              reviews: [],
              completed_count: 0,
              completed_reviews: [],
            };
          }

          // NÃO incrementar completed_count aqui - ele já vem correto do evento do planner
          // Apenas adicionar à lista de revisões completadas para referência
          if (!grouped[dateKey][typeKey].completed_reviews) {
            grouped[dateKey][typeKey].completed_reviews = [];
          }
          grouped[dateKey][typeKey].completed_reviews.push({
            id: item.content_id,
            content_type: item.content_type,
            last_review: item.last_review,
            due: item.due,
          });
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Revisões do planner carregadas com sucesso',
        data: {
          grouped,
          total: pendingReviews.length,
        },
      });
    } catch (error) {
      logger.error('Erro ao buscar revisões do planner:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  };
}


