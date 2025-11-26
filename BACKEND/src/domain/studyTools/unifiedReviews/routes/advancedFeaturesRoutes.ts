import { Router } from 'express';
import { AdvancedFeaturesController } from '../controllers/AdvancedFeaturesController';
import { DailyLimitsService } from '../services';
import { DayCompletionService } from '../services';
import { supabase } from '../../../../config/supabaseAdmin';
import { enhancedAuthMiddleware } from '../../../auth/middleware/enhancedAuth.middleware';
import { requireFeature } from '../../../auth/middleware/enhancedAuth.middleware';

const router = Router();

// Middleware de autenticação + plano para todas as rotas
router.use(enhancedAuthMiddleware);
// Recursos avançados requerem estatísticas avançadas
router.use(requireFeature('canAccessAdvancedStatistics') as any);

// Instanciar services - removendo ReviewRemovalService que não existe
const dailyLimitsService = new DailyLimitsService(supabase);
const dayCompletionService = new DayCompletionService(supabase);

// Instanciar controller com apenas os serviços disponíveis
const advancedFeaturesController = new AdvancedFeaturesController(
  dailyLimitsService,
  dayCompletionService,
);

// ===== DAILY LIMITS ROUTES =====
router.get('/daily-limits', advancedFeaturesController.getDailyLimits);
router.put('/daily-limits', advancedFeaturesController.setDailyLimits);
router.get(
  '/daily-limits/status',
  advancedFeaturesController.getDailyLimitStatus,
);
router.get(
  '/daily-limits/progress',
  advancedFeaturesController.getTodayProgress,
);

// ===== DAY COMPLETION ROUTES =====
router.post(
  '/day-completion/complete',
  advancedFeaturesController.completeDayStudy,
);
router.get(
  '/day-completion/today',
  advancedFeaturesController.getTodayCompletion,
);
router.get(
  '/day-completion/stats',
  advancedFeaturesController.getCompletionStats,
);
router.post(
  '/day-completion/suggest',
  advancedFeaturesController.suggestDayCompletion,
);
router.get(
  '/day-completion/history',
  advancedFeaturesController.getCompletionHistory,
);

// ===== ADMIN ROUTES =====
// Rotas de admin removidas pois dependem de serviços não implementados

export default router;
