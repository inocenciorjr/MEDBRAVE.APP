import { Router } from 'express';
import { SmartSchedulingController } from '../controllers/SmartSchedulingController';
import { SmartSchedulingService } from '../services/SmartSchedulingService';
import { supabase } from '../../../../config/supabaseAdmin';
import { supabaseAuthMiddleware as authMiddleware } from '../../../auth/middleware/supabaseAuth.middleware';

const router = Router();

// Instanciar service e controller
const smartSchedulingService = new SmartSchedulingService(supabase);
const smartSchedulingController = new SmartSchedulingController(smartSchedulingService);

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

/**
 * GET /api/unified-reviews/backlog-status
 * Analisa o backlog do usuário
 */
router.get('/backlog-status', smartSchedulingController.getBacklogStatus);

/**
 * POST /api/unified-reviews/recovery-mode
 * Ativa modo recuperação
 */
router.post('/recovery-mode', smartSchedulingController.activateRecoveryMode);

/**
 * GET /api/unified-reviews/study-pattern
 * Verifica padrão de estudo
 */
router.get('/study-pattern', smartSchedulingController.getStudyPattern);

export default router;
