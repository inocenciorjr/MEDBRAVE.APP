import { Router } from 'express';
import { Firestore } from 'firebase-admin/firestore';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { GoalService } from '../services/GoalService';
import { logger } from '../../../utils/logger';

export const createGoalRoutes = (db: Firestore) => {
  const router = Router();
  const service = new GoalService(db);

  router.use(authMiddleware);

  /**
   * Listar objetivos do usuário
   */
  router.get('/', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Placeholder implementation
      const goals: any[] = [];
      
      return res.json({ data: goals });
    } catch (error) {
      logger.error('Error getting user goals:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Criar meta
  router.post('/', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
      const payload = { ...req.body, userId };
      const goal = await service.createGoal(payload as any);
      return res.status(201).json({ success: true, data: goal });
    } catch (e) {
      logger.error('goalRoutes', 'create', e);
      return res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Atualizar meta
  router.put('/:id', async (req, res) => {
    try {
      await service.updateGoal(req.params.id, req.body);
      return res.json({ success: true });
    } catch (e) {
      logger.error('goalRoutes', 'update', e);
      return res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Deletar meta
  router.delete('/:id', async (req, res) => {
    try {
      await service.deleteGoal(req.params.id);
      return res.json({ success: true });
    } catch (e) {
      logger.error('goalRoutes', 'delete', e);
      return res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Progresso das metas
  router.get('/progress', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
      const result = await service.getGoalsProgress(userId);
      return res.json({ success: true, data: result });
    } catch (e) {
      logger.error('goalRoutes', 'progress', e);
      return res.status(500).json({ error: 'Erro interno' });
    }
  });

  return router;
}; 