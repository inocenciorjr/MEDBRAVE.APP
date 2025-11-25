import { Router } from 'express';
import { QuestionHistoryController } from '../controllers/QuestionHistoryController';
import { QuestionHistoryService } from '../services/QuestionHistoryService';
import { supabaseAuthMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
import { supabase } from '../../../config/supabase';

const router = Router();
const service = new QuestionHistoryService(supabase);
const controller = new QuestionHistoryController(service);

// Todas as rotas requerem autenticação
// IMPORTANTE: Rotas específicas (batch) ANTES de rotas com parâmetros (:questionId)
router.post('/stats/batch', supabaseAuthMiddleware, controller.getBatchQuestionStats.bind(controller));

router.get('/:questionId/history', supabaseAuthMiddleware, controller.getQuestionHistory.bind(controller));
router.get('/:questionId/stats', supabaseAuthMiddleware, controller.getQuestionStats.bind(controller));
router.post('/:questionId/attempt', supabaseAuthMiddleware, controller.recordAttempt.bind(controller));

export default router;
