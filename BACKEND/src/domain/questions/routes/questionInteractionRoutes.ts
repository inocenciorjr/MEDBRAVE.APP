import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { QuestionInteractionController } from '../controllers/QuestionInteractionController';
import { supabaseAuthMiddleware } from '../../auth/middleware/supabaseAuth.middleware';

export function createQuestionInteractionRoutes(_supabase: SupabaseClient): Router {
  const router = Router();
  const controller = new QuestionInteractionController();

  // Reações (likes/dislikes) - GET público, POST requer auth
  router.get(
    '/:questionId/reactions',
    controller.getReactionStats.bind(controller)
  );

  router.post(
    '/:questionId/reactions',
    supabaseAuthMiddleware as any,
    controller.toggleReaction.bind(controller)
  );

  // Estilos - GET público, POST requer auth
  router.get(
    '/:questionId/styles',
    controller.getStyleStats.bind(controller)
  );

  router.post(
    '/:questionId/styles',
    supabaseAuthMiddleware as any,
    controller.toggleStyleVote.bind(controller)
  );

  return router;
}
