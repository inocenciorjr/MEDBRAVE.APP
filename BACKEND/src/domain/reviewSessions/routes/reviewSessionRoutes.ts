import { Router } from 'express';
import { ReviewSessionController } from '../controllers/ReviewSessionController';
import { ReviewSessionService } from '../services/ReviewSessionService';
import { PlannerService } from '../../planner/services/PlannerService';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';

const router = Router();
const reviewSessionService = new ReviewSessionService();
const plannerService = new PlannerService();
const controller = new ReviewSessionController(reviewSessionService, plannerService);

// Criar sessão
router.post('/', authMiddleware, controller.createSession);

// Buscar sessão ativa
router.get('/active', authMiddleware, controller.getActiveSession);

// Listar sessões do usuário
router.get('/', authMiddleware, controller.listSessions);

// Buscar sessão por ID
router.get('/:sessionId', authMiddleware, controller.getSessionById);

// Atualizar progresso da sessão
router.put('/:sessionId/progress', authMiddleware, controller.updateProgress);
router.patch('/:sessionId/progress', authMiddleware, controller.updateProgress);

// Marcar item como completado
router.post('/:sessionId/complete-item', authMiddleware, controller.markItemCompleted);

// Finalizar sessão
router.post('/:sessionId/complete', authMiddleware, controller.completeSession);

export default router;
