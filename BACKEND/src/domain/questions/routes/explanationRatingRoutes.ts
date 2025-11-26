import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { ExplanationRatingController } from '../controllers/ExplanationRatingController';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';

export function createExplanationRatingRoutes(supabase: SupabaseClient): Router {
  const router = Router();
  const controller = new ExplanationRatingController(supabase);

  // Todas as rotas requerem autenticação + plano
  router.use(enhancedAuthMiddleware);

  // Criar ou atualizar avaliação
  router.post('/', controller.rateExplanation.bind(controller));

  // Obter avaliações de uma questão
  router.get('/:questionId', controller.getQuestionRatings.bind(controller));

  return router;
}
