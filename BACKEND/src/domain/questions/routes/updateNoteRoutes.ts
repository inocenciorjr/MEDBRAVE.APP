import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { UpdateNoteService } from '../services/UpdateNoteService';
import { UpdateNoteController } from '../controllers/UpdateNoteController';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
import { adminMiddleware } from '../../auth/middleware/admin.middleware';

export function createUpdateNoteRoutes(supabase: SupabaseClient): Router {
  const router = Router();
  const updateNoteService = new UpdateNoteService(supabase);
  const updateNoteController = new UpdateNoteController(updateNoteService);

  // Rota pública para buscar notas de uma questão (não requer autenticação)
  router.get(
    '/question/:questionId',
    updateNoteController.getNotesForQuestion
  );

  // Rotas admin (requerem autenticação e permissão de admin)
  router.post(
    '/',
    authMiddleware as any,
    adminMiddleware as any,
    updateNoteController.createUpdateNote
  );

  router.get(
    '/',
    authMiddleware as any,
    adminMiddleware as any,
    updateNoteController.getAllUpdateNotes
  );

  router.get(
    '/:noteId/questions',
    authMiddleware as any,
    adminMiddleware as any,
    updateNoteController.getQuestionsForNote
  );

  router.get(
    '/:noteId',
    authMiddleware as any,
    adminMiddleware as any,
    updateNoteController.getUpdateNoteById
  );

  router.put(
    '/:noteId',
    authMiddleware as any,
    adminMiddleware as any,
    updateNoteController.updateUpdateNote
  );

  router.delete(
    '/:noteId',
    authMiddleware as any,
    adminMiddleware as any,
    updateNoteController.deleteUpdateNote
  );

  return router;
}
