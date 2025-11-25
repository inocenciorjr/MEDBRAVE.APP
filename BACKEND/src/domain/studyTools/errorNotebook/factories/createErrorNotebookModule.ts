import { Router } from 'express';
import { ErrorNotebookController } from '../controllers/errorNotebookController';
import { IErrorNotebookRepository } from '../repositories/IErrorNotebookRepository';
import { supabaseAuthMiddleware as authMiddleware } from '../../../auth/middleware/supabaseAuth.middleware';
import { SupabaseErrorNotebookRepository } from '../../../../infra/studyTools/supabase/SupabaseErrorNotebookRepository';
import { supabase } from '../../../../config/supabase';
import { SupabaseUnifiedReviewService } from '../../../../infra/studyTools/supabase/SupabaseUnifiedReviewService';

export const createErrorNotebookModule = (): {
  errorNotebookRoutes: Router;
  errorNotebookRepository: IErrorNotebookRepository;
  errorNotebookController: ErrorNotebookController;
} => {
  // Criar repositórios
  const errorNotebookRepository = new SupabaseErrorNotebookRepository(supabase);

  // Criar controladores
  const errorNotebookController = new ErrorNotebookController(supabase);

  // Injetar UnifiedReviewService
  const unifiedReviewService = new SupabaseUnifiedReviewService(supabase);
  errorNotebookController.setServices(unifiedReviewService);

  // Configurar router
  const router = Router();

  // Rotas protegidas por autenticação
  router.use(authMiddleware);

  // Rotas do Caderno de Erros (agora para ErrorNote)
  router.post('/create', errorNotebookController.createErrorNote.bind(errorNotebookController));
  router.post('/', errorNotebookController.createErrorNote.bind(errorNotebookController)); // Alias
  router.get('/user', errorNotebookController.getUserErrorNotes.bind(errorNotebookController));
  router.get('/', errorNotebookController.getUserErrorNotes.bind(errorNotebookController)); // Alias
  router.get('/stats', errorNotebookController.getUserErrorNotesStats.bind(errorNotebookController));
  router.get('/:id/review', errorNotebookController.prepareErrorNoteForReview.bind(errorNotebookController));
  router.put('/:id', errorNotebookController.updateErrorNote.bind(errorNotebookController));
  router.delete('/:id', errorNotebookController.deleteErrorNote.bind(errorNotebookController));
  router.post(
    '/:id/record-review',
    errorNotebookController.recordErrorNoteReview.bind(errorNotebookController),
  );

  return {
    errorNotebookRoutes: router,
    errorNotebookRepository,
    errorNotebookController,
  };
};
