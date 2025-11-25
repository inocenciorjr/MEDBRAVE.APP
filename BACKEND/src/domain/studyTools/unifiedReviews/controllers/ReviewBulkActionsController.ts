import { Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
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

export class ReviewBulkActionsController {
  constructor(private supabase: SupabaseClient) {}

  /**
   * POST /api/unified-reviews/bulk/reschedule
   * Reagendar revisões pendentes para uma nova data
   */
  rescheduleReviews = async (
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

      const { content_types, new_date, days_to_distribute } = req.body;

      if (!new_date && !days_to_distribute) {
        return res.status(400).json({
          success: false,
          message: 'Informe new_date ou days_to_distribute',
        });
      }

      // Buscar cards pendentes
      let query = this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', user_id)
        .lte('due', new Date().toISOString());

      // Filtrar por tipos se especificado
      if (content_types && content_types.length > 0) {
        query = query.in('content_type', content_types);
      }

      const { data: cards, error: fetchError } = await query;

      if (fetchError) {
        throw new AppError('Erro ao buscar cards', 500);
      }

      if (!cards || cards.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Nenhuma revisão pendente encontrada',
          data: { rescheduled_count: 0 },
        });
      }

      // Reagendar cards
      const now = new Date();
      const updates = [];

      if (days_to_distribute) {
        // Distribuir ao longo de X dias
        const cardsPerDay = Math.ceil(cards.length / days_to_distribute);
        
        for (let i = 0; i < cards.length; i++) {
          const dayOffset = Math.floor(i / cardsPerDay);
          const newDue = new Date(now);
          newDue.setDate(newDue.getDate() + dayOffset);
          
          updates.push({
            id: cards[i].id,
            due: newDue.toISOString(),
            updated_at: now.toISOString(),
          });
        }
      } else {
        // Reagendar todos para uma data específica
        const targetDate = new Date(new_date);
        
        for (const card of cards) {
          updates.push({
            id: card.id,
            due: targetDate.toISOString(),
            updated_at: now.toISOString(),
          });
        }
      }

      // Aplicar atualizações em lote
      for (const update of updates) {
        await this.supabase
          .from('fsrs_cards')
          .update({
            due: update.due,
            updated_at: update.updated_at,
          })
          .eq('id', update.id);
      }

      logger.info(
        `${updates.length} revisões reagendadas para usuário ${user_id}`,
      );

      return res.status(200).json({
        success: true,
        message: 'Revisões reagendadas com sucesso',
        data: {
          rescheduled_count: updates.length,
          distribution: days_to_distribute
            ? `Distribuídas ao longo de ${days_to_distribute} dias`
            : `Reagendadas para ${new_date}`,
        },
      });
    } catch (error) {
      logger.error('Erro ao reagendar revisões:', error);

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
   * DELETE /api/unified-reviews/bulk/delete
   * Deletar revisões pendentes (cards FSRS)
   */
  deleteReviews = async (
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

      const { content_types, card_ids, delete_all } = req.body;

      // Validação: precisa especificar o que deletar
      if (!delete_all && !card_ids && !content_types) {
        return res.status(400).json({
          success: false,
          message:
            'Especifique card_ids, content_types ou delete_all: true',
        });
      }

      let query = this.supabase
        .from('fsrs_cards')
        .delete()
        .eq('user_id', user_id);

      // Deletar cards específicos
      if (card_ids && card_ids.length > 0) {
        query = query.in('id', card_ids);
      }
      // Deletar por tipos
      else if (content_types && content_types.length > 0) {
        query = query.in('content_type', content_types);
      }
      // Deletar todos os atrasados (requer confirmação explícita)
      else if (delete_all === true) {
        // Deletar apenas revisões atrasadas (due < NOW())
        query = query.lt('due', new Date().toISOString());
      } else {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros inválidos',
        });
      }

      // Primeiro, contar quantos serão deletados
      const countQuery = this.supabase
        .from('fsrs_cards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user_id);

      if (card_ids && card_ids.length > 0) {
        countQuery.in('id', card_ids);
      } else if (content_types && content_types.length > 0) {
        countQuery.in('content_type', content_types);
      } else if (delete_all === true) {
        countQuery.lt('due', new Date().toISOString());
      }

      const { count: totalToDelete } = await countQuery;

      // Agora deletar
      const { error: deleteError } = await query;

      if (deleteError) {
        logger.error('Erro ao deletar cards:', deleteError);
        throw new AppError(`Erro ao deletar cards: ${deleteError.message}`, 500);
      }

      logger.info(`${totalToDelete || 0} cards deletados para usuário ${user_id}`);

      return res.status(200).json({
        success: true,
        message: 'Revisões deletadas com sucesso',
        data: {
          deleted_count: totalToDelete || 0,
        },
      });
    } catch (error) {
      logger.error('Erro ao deletar revisões:', error);

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
   * POST /api/unified-reviews/bulk/reset-progress
   * Resetar progresso de revisões (volta cards para estado NEW)
   */
  resetProgress = async (
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

      const { content_types, card_ids } = req.body;

      if (!card_ids && !content_types) {
        return res.status(400).json({
          success: false,
          message: 'Especifique card_ids ou content_types',
        });
      }

      let query = this.supabase
        .from('fsrs_cards')
        .update({
          state: 0, // NEW
          reps: 0,
          lapses: 0,
          due: new Date().toISOString(),
          stability: 0,
          difficulty: 5,
          elapsed_days: 0,
          scheduled_days: 0,
          last_review: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id);

      if (card_ids && card_ids.length > 0) {
        query = query.in('id', card_ids);
      } else if (content_types && content_types.length > 0) {
        query = query.in('content_type', content_types);
      }

      const { error: updateError, count } = await query;

      if (updateError) {
        throw new AppError('Erro ao resetar progresso', 500);
      }

      logger.info(
        `Progresso de ${count || 0} cards resetado para usuário ${user_id}`,
      );

      return res.status(200).json({
        success: true,
        message: 'Progresso resetado com sucesso',
        data: {
          reset_count: count || 0,
        },
      });
    } catch (error) {
      logger.error('Erro ao resetar progresso:', error);

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
   * GET /api/unified-reviews/bulk/overdue-stats
   * Obter estatísticas de revisões atrasadas
   */
  getOverdueStats = async (
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

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Buscar cards atrasados (apenas datas ANTERIORES a hoje, não incluir hoje)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const { data: overdueCards, error } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', user_id)
        .lt('due', startOfToday.toISOString());

      if (error) {
        throw new AppError('Erro ao buscar cards atrasados', 500);
      }

      if (!overdueCards || overdueCards.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            total_overdue: 0,
            by_type: {},
            very_overdue: 0,
          },
        });
      }

      // Calcular estatísticas
      const byType: Record<string, number> = {};
      let veryOverdue = 0;

      for (const card of overdueCards) {
        const dueDate = new Date(card.due);
        const daysOverdue = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Contar por tipo
        byType[card.content_type] = (byType[card.content_type] || 0) + 1;

        // Contar muito atrasadas (> 30 dias)
        if (daysOverdue > 30) {
          veryOverdue++;
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          total_overdue: overdueCards.length,
          by_type: byType,
          very_overdue: veryOverdue,
          oldest_overdue_days: Math.max(
            ...overdueCards.map((card) =>
              Math.floor(
                (now.getTime() - new Date(card.due).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            ),
          ),
        },
      });
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de atrasadas:', error);

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
}
