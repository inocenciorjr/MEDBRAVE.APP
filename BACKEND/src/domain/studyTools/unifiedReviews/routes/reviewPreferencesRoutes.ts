import { Router } from 'express';
import { ReviewPreferencesController } from '../controllers/ReviewPreferencesController';
import { ReviewPreferencesService } from '../services/ReviewPreferencesService';
import { supabaseAuthMiddleware } from '../../../auth/middleware/supabaseAuth.middleware';
import { supabase } from '../../../../config/supabase';

const router = Router();
const service = new ReviewPreferencesService(supabase);
const controller = new ReviewPreferencesController(service);

// Todas as rotas requerem autenticação
router.get('/', supabaseAuthMiddleware, controller.getPreferences.bind(controller));
router.put('/', supabaseAuthMiddleware, controller.updatePreferences.bind(controller));
router.get('/cards-exceeding-limit', supabaseAuthMiddleware, controller.getCardsExceedingLimit.bind(controller));
router.post('/set-exam-date', supabaseAuthMiddleware, controller.setExamDate.bind(controller));
router.delete('/exam-date', supabaseAuthMiddleware, controller.clearExamDate.bind(controller));
router.post('/update-planner-schedules', supabaseAuthMiddleware, controller.updatePlannerSchedules.bind(controller));

export default router;
