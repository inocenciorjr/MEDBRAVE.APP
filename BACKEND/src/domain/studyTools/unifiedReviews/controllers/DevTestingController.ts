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

/**
 * Controlador para testes de desenvolvimento
 * ⚠️ APENAS PARA DESENVOLVIMENTO - NÃO USAR EM PRODUÇÃO
 */
export class DevTestingController {
  constructor(private supabase: SupabaseClient) {}

  /**
   * POST /api/unified-reviews/dev/simulate-overdue
   * Simula revisões atrasadas alterando datas no banco
   */
  simulateOverdueReviews = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      // ⚠️ Verificar se está em desenvolvimento
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'Endpoint disponível apenas em desenvolvimento',
        });
      }

      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const { days_overdue = 45, count = 50 } = req.body;

      // Buscar cards do usuário
      const { data: cards, error: fetchError } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', user_id)
        .limit(count);

      if (fetchError) {
        throw new AppError('Erro ao buscar cards', 500);
      }

      if (!cards || cards.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Nenhum card encontrado para simular',
          data: { modified: 0 },
        });
      }

      // Alterar datas para simular atraso
      const now = new Date();
      const updates = [];

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        
        // Calcular data atrasada (varia entre 1 e days_overdue)
        const daysBack = Math.floor(Math.random() * days_overdue) + 1;
        const overdueDate = new Date(now);
        overdueDate.setDate(overdueDate.getDate() - daysBack);

        await this.supabase
          .from('fsrs_cards')
          .update({
            due: overdueDate.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', card.id);

        updates.push({
          id: card.id,
          content_type: card.content_type,
          days_overdue: daysBack,
        });
      }

      logger.info(
        `[DEV] ${updates.length} cards modificados para simular atraso (usuário ${user_id})`,
      );

      return res.status(200).json({
        success: true,
        message: `${updates.length} revisões simuladas como atrasadas`,
        data: {
          modified: updates.length,
          max_days_overdue: days_overdue,
          cards: updates.slice(0, 10), // Mostrar apenas 10 primeiros
        },
      });
    } catch (error) {
      logger.error('[DEV] Erro ao simular revisões atrasadas:', error);

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
   * POST /api/unified-reviews/dev/reset-dates
   * Reseta datas para hoje (desfaz simulação)
   */
  resetDates = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'Endpoint disponível apenas em desenvolvimento',
        });
      }

      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const now = new Date();

      // Resetar todas as datas para hoje
      const { error: updateError, count } = await this.supabase
        .from('fsrs_cards')
        .update({
          due: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', user_id);

      if (updateError) {
        throw new AppError('Erro ao resetar datas', 500);
      }

      logger.info(
        `[DEV] ${count || 0} cards resetados para hoje (usuário ${user_id})`,
      );

      return res.status(200).json({
        success: true,
        message: `${count || 0} revisões resetadas para hoje`,
        data: {
          reset_count: count || 0,
        },
      });
    } catch (error) {
      logger.error('[DEV] Erro ao resetar datas:', error);

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
   * POST /api/unified-reviews/dev/create-test-cards
   * Cria cards de teste para simular
   */
  createTestCards = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'Endpoint disponível apenas em desenvolvimento',
        });
      }

      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const { count = 50 } = req.body;
      const now = new Date();
      
      // Buscar ou criar um deck de teste
      let testDeckId: string;
      
      const { data: existingDeck } = await this.supabase
        .from('decks')
        .select('id')
        .eq('user_id', user_id)
        .eq('name', 'TEST_DECK')
        .single();
      
      if (existingDeck) {
        testDeckId = existingDeck.id;
      } else {
        const { data: newDeck, error: deckError } = await this.supabase
          .from('decks')
          .insert({
            id: `test_deck_${user_id}`,
            user_id,
            name: 'TEST_DECK',
            title: 'Deck de Teste',
            description: 'Deck de teste para desenvolvimento',
            is_public: false,
            fsrs_enabled: true,
            total_cards: 0,
            flashcard_count: 0,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .select()
          .single();
        
        if (deckError) {
          logger.error('[DEV] Erro ao criar deck:', deckError);
          throw new AppError(`Erro ao criar deck de teste: ${deckError.message}`, 500);
        }
        
        testDeckId = newDeck.id;
      }

      const cards = [];

      // Criar cards de teste
      for (let i = 0; i < count; i++) {
        const contentType = ['QUESTION', 'FLASHCARD', 'ERROR_NOTEBOOK'][
          i % 3
        ];

        cards.push({
          user_id,
          deck_id: testDeckId,
          content_type: contentType,
          content_id: `test_${contentType.toLowerCase()}_${Date.now()}_${i}`,
          due: now.toISOString(),
          stability: 5,
          difficulty: 5,
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
          state: 0, // NEW
          last_review: null,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });
      }

      const { error: insertError, data: insertedData } = await this.supabase
        .from('fsrs_cards')
        .insert(cards)
        .select();

      if (insertError) {
        logger.error('[DEV] Erro do Supabase ao inserir cards:', insertError);
        throw new AppError(`Erro ao criar cards de teste: ${insertError.message}`, 500);
      }

      const insertCount = insertedData?.length || 0;

      logger.info(
        `[DEV] ${insertCount} cards de teste criados (usuário ${user_id})`,
      );

      return res.status(200).json({
        success: true,
        message: `${insertCount} cards de teste criados`,
        data: {
          created_count: insertCount,
        },
      });
    } catch (error) {
      logger.error('[DEV] Erro ao criar cards de teste:', error);

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
   * DELETE /api/unified-reviews/dev/delete-test-cards
   * Deleta cards de teste
   */
  deleteTestCards = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'Endpoint disponível apenas em desenvolvimento',
        });
      }

      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      // Deletar cards de teste (começam com "test_")
      const { error: deleteError, count } = await this.supabase
        .from('fsrs_cards')
        .delete()
        .eq('user_id', user_id)
        .like('content_id', 'test_%');

      if (deleteError) {
        throw new AppError('Erro ao deletar cards de teste', 500);
      }

      logger.info(
        `[DEV] ${count || 0} cards de teste deletados (usuário ${user_id})`,
      );

      return res.status(200).json({
        success: true,
        message: `${count || 0} cards de teste deletados`,
        data: {
          deleted_count: count || 0,
        },
      });
    } catch (error) {
      logger.error('[DEV] Erro ao deletar cards de teste:', error);

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
