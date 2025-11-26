import { Router } from 'express';
import { ReviewPreferencesController } from '../controllers/ReviewPreferencesController';
import { ReviewPreferencesService } from '../services/ReviewPreferencesService';
import { enhancedAuthMiddleware } from '../../../auth/middleware/enhancedAuth.middleware';
import { supabase } from '../../../../config/supabase';

const router = Router();
const service = new ReviewPreferencesService(supabase);
const controller = new ReviewPreferencesController(service);

// Todas as rotas requerem autenticação + plano ativo
router.get('/', enhancedAuthMiddleware, controller.getPreferences.bind(controller));
router.put('/', enhancedAuthMiddleware, controller.updatePreferences.bind(controller));
router.get('/cards-exceeding-limit', enhancedAuthMiddleware, controller.getCardsExceedingLimit.bind(controller));
router.post('/set-exam-date', enhancedAuthMiddleware, controller.setExamDate.bind(controller));
router.delete('/exam-date', enhancedAuthMiddleware, controller.clearExamDate.bind(controller));
router.post('/update-planner-schedules', enhancedAuthMiddleware, controller.updatePlannerSchedules.bind(controller));

export default router;
