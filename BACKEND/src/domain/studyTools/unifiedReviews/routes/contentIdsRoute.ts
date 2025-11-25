import { Router } from 'express';
import { supabaseAuthMiddleware as authMiddleware } from '../../../auth/middleware/supabaseAuth.middleware';
import { supabase } from '../../../../config/supabaseAdmin';

const router = Router();

/**
 * POST /api/unified-reviews/content-ids
 * Buscar content_ids a partir de review IDs
 */
router.post('/content-ids', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
      });
    }

    const { reviewIds } = req.body;

    if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'reviewIds é obrigatório e deve ser um array',
      });
    }

    // Buscar os content_ids dos cards
    const { data: cards, error } = await supabase
      .from('fsrs_cards')
      .select('content_id')
      .eq('user_id', userId)
      .in('id', reviewIds);

    if (error) {
      console.error('Erro ao buscar content_ids:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar content_ids',
      });
    }

    const contentIds = cards?.map(c => c.content_id) || [];

    return res.status(200).json({
      success: true,
      data: {
        contentIds,
        total: contentIds.length,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar content_ids:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
});

export default router;
