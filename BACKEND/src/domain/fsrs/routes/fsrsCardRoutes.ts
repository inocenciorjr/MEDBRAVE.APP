import { Router } from 'express';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';

const router = Router();

// Buscar content_ids de cards FSRS por seus IDs
router.post('/cards/content-ids', enhancedAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    const { cardIds } = req.body;

    if (!cardIds || !Array.isArray(cardIds)) {
      return res.status(400).json({ success: false, message: 'cardIds inválido' });
    }

    const { supabase } = await import('../../../config/supabaseAdmin');

    const { data: cards, error } = await supabase
      .from('fsrs_cards')
      .select('id, content_id')
      .in('id', cardIds)
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao buscar cards:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar cards' });
    }

    const contentIds = cards?.map(card => card.content_id) || [];

    return res.json({ success: true, data: { contentIds } });
  } catch (error) {
    console.error('Erro ao buscar content_ids:', error);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

export default router;
