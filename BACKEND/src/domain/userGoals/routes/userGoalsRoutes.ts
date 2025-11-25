import { Router } from 'express';
import { UserGoalsController } from '../controllers/UserGoalsController';
import { UserGoalsService } from '../../../infra/userGoals/supabase/UserGoalsService';
import { supabaseAuthMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
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

// Rotas protegidas
router.get('/', supabaseAuthMiddleware, userGoalsController.getUserGoals);
router.post('/', supabaseAuthMiddleware, userGoalsController.upsertUserGoals);
router.get('/today-stats', supabaseAuthMiddleware, userGoalsController.getTodayStats);

export default router;
