import { Router } from 'express';
import { enhancedAuthMiddleware } from '../domain/auth/middleware/enhancedAuth.middleware';
import { adminMiddleware } from '../domain/auth/middleware/admin.middleware';
import { clearUserPlanCache, clearAllPlanCache } from '../domain/auth/middleware/planCheck.middleware';

const router = Router();

// Aplicar middleware de autenticação + admin
router.use(enhancedAuthMiddleware);
router.use(adminMiddleware);

/**
 * POST /api/admin/cache/clear-user-plan/:userId
 * Limpa o cache de plano de um usuário específico
 */
router.post('/clear-user-plan/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    clearUserPlanCache(userId);
    
    return res.json({
      success: true,
      message: `Cache de plano limpo para usuário ${userId}`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/cache/clear-all-plans
 * Limpa todo o cache de planos
 */
router.post('/clear-all-plans', (req, res) => {
  try {
    clearAllPlanCache();
    
    return res.json({
      success: true,
      message: 'Cache de todos os planos limpo com sucesso',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
