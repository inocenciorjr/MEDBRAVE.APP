import { Router } from 'express';
import { SmartSchedulingController } from '../controllers/SmartSchedulingController';
import { SmartSchedulingService } from '../services/SmartSchedulingService';
import { supabase } from '../../../../config/supabaseAdmin';
import { enhancedAuthMiddleware } from '../../../auth/middleware/enhancedAuth.middleware';
import { requireFeature } from '../../../auth/middleware/enhancedAuth.middleware';

const router = Router();

// Instanciar service e controller
const smartSchedulingService = new SmartSchedulingService(supabase);
const smartSchedulingController = new SmartSchedulingController(smartSchedulingService);

// Aplicar middleware de autenticação + plano em todas as rotas
router.use(enhancedAuthMiddleware);
// Agendamento inteligente requer estatísticas avançadas
router.use(requireFeature('canAccessAdvancedStatistics') as any);

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
