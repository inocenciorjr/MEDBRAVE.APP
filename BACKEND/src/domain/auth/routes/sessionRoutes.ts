import { Router } from 'express';
import { SessionController } from '../controllers/SessionController';
import { supabaseAuthMiddleware } from '../middleware/supabaseAuth.middleware';

const router = Router();
const sessionController = new SessionController();

// Todas as rotas requerem autenticação
router.use(supabaseAuthMiddleware);

// Listar sessões do usuário
router.get('/sessions', sessionController.listSessions);

// Revogar uma sessão específica
router.post('/sessions/revoke', sessionController.revokeSession);

// Revogar todas as outras sessões
router.post('/sessions/revoke-others', sessionController.revokeAllOtherSessions);

// Limpar sessões antigas (manter apenas as N mais recentes)
router.post('/sessions/cleanup', sessionController.cleanupOldSessions);

// Purgar TODAS as sessões de um usuário (admin only)
router.post('/sessions/purge', sessionController.purgeAllOldSessions);

export default router;
