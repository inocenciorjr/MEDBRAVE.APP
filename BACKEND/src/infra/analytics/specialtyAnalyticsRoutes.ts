import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { enhancedAuthMiddleware } from '../../domain/auth/middleware/enhancedAuth.middleware';
import { SpecialtyAnalyticsService } from './SpecialtyAnalyticsService';
import { logger } from '../../utils/logger';
import supabase from '../../config/supabaseAdmin';

export function createSpecialtyAnalyticsRoutes(
  client?: SupabaseClient,
): Router {
  const router = Router();
  const service = new SpecialtyAnalyticsService(client || supabase);

  // Todas as rotas requerem autenticação + plano ativo
  router.use(enhancedAuthMiddleware);

  // Últimas 8 semanas de accuracy por especialidade
  router.get('/:specialtyId/trend', async (req, res) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthenticated" });
      }
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
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthenticated" });
      }
      const { specialtyId } = req.params;

      // Usar método público do service para obter range da semana
      const weekStart = service.getWeekStart();
      const weekKey = weekStart.toISOString().substring(0, 10);

      const { data, error } = await service.getClient()
        .from('user_analytics_specialty')
        .select('*')
        .eq('user_id', userId)
        .eq('specialty_id', specialtyId)
        .eq('week_start', weekKey)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('specialtyAnalyticsRoutes', 'weekly', error);
        return res.status(500).json({ error: 'Erro ao buscar dados' });
      }

      return res.json({ success: true, data: data || null });
    } catch (e) {
      logger.error('specialtyAnalyticsRoutes', 'weekly', e);
      return res.status(500).json({ error: 'Erro interno' });
    }
  });

  return router;
}
