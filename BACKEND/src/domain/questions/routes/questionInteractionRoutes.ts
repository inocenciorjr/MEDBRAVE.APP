import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { QuestionInteractionController } from '../controllers/QuestionInteractionController';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';

export function createQuestionInteractionRoutes(_supabase: SupabaseClient): Router {
  const router = Router();
  const controller = new QuestionInteractionController();

  // Reações (likes/dislikes) - GET público, POST requer auth + plano
  router.get(
    '/:questionId/reactions',
    controller.getReactionStats.bind(controller)
  );

  router.post(
    '/:questionId/reactions',
    enhancedAuthMiddleware as any,
    controller.toggleReaction.bind(controller)
  );

  // Estilos - GET público, POST requer auth + plano
  router.get(
    '/:questionId/styles',
    controller.getStyleStats.bind(controller)
  );

  router.post(
    '/:questionId/styles',
    enhancedAuthMiddleware as any,
    controller.toggleStyleVote.bind(controller)
  );

  return router;
}
