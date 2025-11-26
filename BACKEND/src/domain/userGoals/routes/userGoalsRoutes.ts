import { Router } from 'express';
import { UserGoalsController } from '../controllers/UserGoalsController';
import { UserGoalsService } from '../../../infra/userGoals/supabase/UserGoalsService';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Criar instância do Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Criar instâncias do serviço e controller
const userGoalsService = new UserGoalsService(supabase);
const userGoalsController = new UserGoalsController(userGoalsService);

// Rotas protegidas (requerem plano ativo)
router.get('/', enhancedAuthMiddleware, userGoalsController.getUserGoals);
router.post('/', enhancedAuthMiddleware, userGoalsController.upsertUserGoals);
router.get('/today-stats', enhancedAuthMiddleware, userGoalsController.getTodayStats);

export default router;
