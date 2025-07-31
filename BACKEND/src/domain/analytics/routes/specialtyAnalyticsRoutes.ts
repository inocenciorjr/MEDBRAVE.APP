import { Router } from 'express';
import { firestore } from 'firebase-admin';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { SpecialtyAnalyticsService } from '../services/SpecialtyAnalyticsService';
import { logger } from '../../../utils/logger';

export function createSpecialtyAnalyticsRoutes(db: firestore.Firestore): Router {
  const router = Router();
  const service = new SpecialtyAnalyticsService(db);

  router.use(authMiddleware);

  // Últimas 8 semanas de accuracy por especialidade
  router.get('/:specialtyId/trend', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
      const { specialtyId } = req.params;
      const data = await service.getTrend(userId, specialtyId, 8);
      return res.json({ success: true, data });
    } catch (e) {
      logger.error('specialtyAnalyticsRoutes', 'trend', e);
      return res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Snapshot da semana corrente (inclui métricas de retenção)
  router.get('/:specialtyId/weekly', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
      const { specialtyId } = req.params;
      const { weekStart } = service['getWeekRange']();
      const weekKey = weekStart.toISOString().substring(0, 10);
      const doc = await db
        .collection('userAnalytics')
        .doc(userId)
        .collection('specialty')
        .doc(`${weekKey}_${specialtyId}`)
        .get();
      return res.json({ success: true, data: doc.exists ? doc.data() : null });
    } catch (e) {
      logger.error('specialtyAnalyticsRoutes', 'weekly', e);
      return res.status(500).json({ error: 'Erro interno' });
    }
  });

  return router;
} 