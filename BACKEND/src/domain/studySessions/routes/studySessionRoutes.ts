import { Router } from 'express';
import { StudySessionController } from '../controllers/StudySessionController';
import { StudySessionService } from '../../../infra/studySessions/StudySessionService';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
import { supabase } from '../../../config/supabase';

const router = Router();
const studySessionService = new StudySessionService(supabase);
const controller = new StudySessionController(studySessionService, supabase);

// Todas as rotas requerem autenticação
router.use(authMiddleware as any);

// POST /api/study-sessions/start - Iniciar sessão de estudo
router.post('/start', (req, res) => controller.startSession(req, res));

// PUT /api/study-sessions/:id/end - Finalizar sessão de estudo
router.put('/:id/end', (req, res) => controller.endSession(req, res));

// PUT /api/study-sessions/:id/heartbeat - Manter sessão ativa
router.put('/:id/heartbeat', (req, res) => controller.heartbeat(req, res));

// GET /api/study-sessions/active - Buscar sessão ativa do usuário
router.get('/active', (req, res) => controller.getActiveSession(req, res));

// GET /api/study-sessions/weekly - Buscar tempo de estudo da semana atual
router.get('/weekly', (req, res) => controller.getWeeklyStudyTime(req, res));

// GET /api/study-sessions/by-day - Buscar tempo de estudo agrupado por dia
router.get('/by-day', (req, res) => controller.getStudyTimeByDay(req, res));

// POST /api/study-sessions/cleanup - Limpar sessões órfãs (ativas há mais de 2h)
router.post('/cleanup', (req, res) => controller.cleanupOrphanedSessions(req, res));

// GET /api/study-sessions/history - Buscar histórico de sessões
// router.get('/history', (req, res) => controller.getSessionHistory(req, res));

export default router;
