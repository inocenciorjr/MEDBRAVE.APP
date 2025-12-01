import { Router } from 'express';
import { ReviewSessionController } from '../controllers/ReviewSessionController';
import { ReviewSessionService } from '../services/ReviewSessionService';
import { PlannerService } from '../../planner/services/PlannerService';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { checkReviewsPerDayLimit } from '../../auth/middleware/usageMiddlewares';

const router = Router();
const reviewSessionService = new ReviewSessionService();
const plannerService = new PlannerService();
const controller = new ReviewSessionController(reviewSessionService, plannerService);

// Criar sessão (com limite de revisões por dia)
router.post('/', enhancedAuthMiddleware, checkReviewsPerDayLimit as any, controller.createSession);

// Buscar ou criar sessão por data (para o planner)
router.post('/for-date', enhancedAuthMiddleware, controller.getOrCreateSessionForDate);

// Buscar sessão ativa
router.get('/active', enhancedAuthMiddleware, controller.getActiveSession);

// Listar sessões do usuário
router.get('/', enhancedAuthMiddleware, controller.listSessions);

// Buscar sessão por ID
router.get('/:sessionId', enhancedAuthMiddleware, controller.getSessionById);

// Atualizar progresso da sessão
router.put('/:sessionId/progress', enhancedAuthMiddleware, controller.updateProgress);
router.patch('/:sessionId/progress', enhancedAuthMiddleware, controller.updateProgress);

// Marcar item como completado
router.post('/:sessionId/complete-item', enhancedAuthMiddleware, controller.markItemCompleted);

// Finalizar sessão
router.post('/:sessionId/complete', enhancedAuthMiddleware, controller.completeSession);

export default router;
