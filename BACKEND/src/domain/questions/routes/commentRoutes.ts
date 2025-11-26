import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { CommentService } from '../services/CommentService';
import { CommentController } from '../controllers/CommentController';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';

export function createCommentRoutes(supabase: SupabaseClient): Router {
  const router = Router();
  const commentService = new CommentService(supabase);
  const commentController = new CommentController(commentService);

  // Rotas públicas (não requerem autenticação para leitura)
  router.get(
    '/question/:questionId',
    commentController.getQuestionComments
  );

  router.post(
    '/:commentId/like',
    enhancedAuthMiddleware as any,
    commentController.likeComment
  );

  // Rotas que requerem autenticação + plano
  router.post(
    '/',
    enhancedAuthMiddleware as any,
    commentController.createComment
  );

  router.put(
    '/:commentId',
    enhancedAuthMiddleware as any,
    commentController.updateComment
  );

  router.delete(
    '/:commentId',
    enhancedAuthMiddleware as any,
    commentController.deleteComment
  );

  return router;
}
