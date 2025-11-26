import { Router } from 'express';
import { enhancedAuthMiddleware } from '../../../auth/middleware/enhancedAuth.middleware';
import { checkFSRSCardsLimit } from '../../../auth/middleware/usageMiddlewares';
import { supabase } from '../../../../config/supabase';

export const createFsrsCardsRoutes = (): Router => {
  const router = Router();

  // Middleware de autenticação + plano para todas as rotas
  router.use(enhancedAuthMiddleware);

  /**
   * GET /api/fsrs/cards
   * Buscar cards FSRS por IDs
   */
  router.get('/cards', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const idsParam = req.query.ids as string;
      if (!idsParam) {
        return res.status(400).json({
          success: false,
          message: 'IDs não fornecidos',
        });
      }

      const ids = idsParam.split(',').map(id => id.trim()).filter(id => id);
      
      if (ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum ID válido fornecido',
        });
      }

      // Buscar cards FSRS
      const { data: cards, error } = await supabase
        .from('fsrs_cards')
        .select('id, content_id, content_type, due, state')
        .in('id', ids)
        .eq('user_id', userId);

      if (error) {
        console.error('[FSRS Cards] Erro ao buscar cards:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar cards',
          error: error.message,
        });
      }

      return res.json({
        success: true,
        data: {
          cards: cards || [],
        },
      });
    } catch (error) {
      console.error('[FSRS Cards] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
};
