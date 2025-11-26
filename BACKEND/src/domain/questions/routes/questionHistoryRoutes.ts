import { Router } from 'express';
import { QuestionHistoryController } from '../controllers/QuestionHistoryController';
import { QuestionHistoryService } from '../services/QuestionHistoryService';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { supabase } from '../../../config/supabase';

const router = Router();
const service = new QuestionHistoryService(supabase);
const controller = new QuestionHistoryController(service);

// Todas as rotas requerem autenticação + plano
// IMPORTANTE: Rotas específicas (batch) ANTES de rotas com parâmetros (:questionId)
router.post('/stats/batch', enhancedAuthMiddleware, controller.getBatchQuestionStats.bind(controller));

router.get('/:questionId/history', enhancedAuthMiddleware, controller.getQuestionHistory.bind(controller));
router.get('/:questionId/stats', enhancedAuthMiddleware, controller.getQuestionStats.bind(controller));
router.post('/:questionId/attempt', enhancedAuthMiddleware, controller.recordAttempt.bind(controller));

export default router;
