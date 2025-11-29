import { Router } from 'express';
import { supabaseAuthMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
import supabase from '../../../config/supabaseAdmin';

const router = Router();

/**
 * POST /api/activity/track
 * Registra atividade do usuário em tempo real
 */
router.post('/track', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId, actionType, pageUrl } = req.body;

    if (!userId || !sessionId) {
      return res.status(400).json({ error: 'userId e sessionId são obrigatórios' });
    }

    // Registrar atividade
    const { error } = await supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        session_id: sessionId,
        action_type: actionType || 'heartbeat',
        page_url: pageUrl,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });

    if (error) {
      console.error('[ActivityTracker] Erro ao registrar atividade:', error);
      return res.status(500).json({ error: 'Erro ao registrar atividade' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[ActivityTracker] Erro:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
