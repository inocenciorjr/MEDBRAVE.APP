import { Router } from 'express';
import statisticsRoutes from './statisticsRoutes';

/**
 * Rotas de estatísticas de usuário
 * Re-exporta as rotas de statistics para manter compatibilidade
 */
const router = Router();

// Usar as rotas de statistics
router.use('/', statisticsRoutes);

export default router;
