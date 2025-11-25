import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { CommentService } from '../services/CommentService';
import { CommentController } from '../controllers/CommentController';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';

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
    authMiddleware as any,
    commentController.likeComment
  );

  // Rotas que requerem autenticação
  router.post(
    '/',
    authMiddleware as any,
    commentController.createComment
  );

  router.put(
    '/:commentId',
    authMiddleware as any,
    commentController.updateComment
  );

  router.delete(
    '/:commentId',
    authMiddleware as any,
    commentController.deleteComment
  );

  return router;
}
