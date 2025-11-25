import { Router } from 'express';
//
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
import { AlertService } from '../services/AlertService';
import { logger } from '../../../utils/logger';

export function createAlertRoutes(): Router {
  const router = Router();
  const service = new AlertService();

  router.use(authMiddleware);

  // Listar alertas
  router.get('/', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const alerts = await service.getUserAlerts(userId);
      return res.json({ data: alerts });
    } catch (error) {
      logger.error('alertRoutes', 'list', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Marcar como lido
  router.post('/:id/read', async (req, res) => {
    try {
      const alertId = req.params.id;
      await service.markAsRead(alertId);
      return res.json({ success: true });
    } catch (e) {
      logger.error('alertRoutes', 'markRead', e);
      return res.status(500).json({ error: 'Erro interno' });
    }
  });

  return router;
}
