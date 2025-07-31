import { Router } from 'express';
import { ErrorNotebookController } from '../controllers/errorNotebookController';
import { IErrorNotebookRepository } from '../repositories/IErrorNotebookRepository';
import { authMiddleware } from '../../../../domain/auth/middleware/auth.middleware';
import { FirebaseErrorNotebookRepository } from '../../../../infra/repositories/firebase/FirebaseErrorNotebookRepository';

export const createErrorNotebookModule = (): {
  errorNotebookRoutes: Router;
  errorNotebookRepository: IErrorNotebookRepository;
  errorNotebookController: ErrorNotebookController;
} => {
  // Criar repositórios
  const errorNotebookRepository = new FirebaseErrorNotebookRepository();

  // Criar controladores
  const errorNotebookController = new ErrorNotebookController();

  // Configurar router
  const router = Router();

  // Rotas protegidas por autenticação
  router.use(authMiddleware);

  // Rotas do Caderno de Erros (agora para ErrorNote)
  router.post('/', errorNotebookController.createErrorNote);
  router.get('/', errorNotebookController.getUserErrorNotes);
  router.get('/stats', errorNotebookController.getUserErrorNotesStats);
  router.get('/:id/review', errorNotebookController.prepareErrorNoteForReview);
  router.put('/:id', errorNotebookController.updateErrorNote);
  router.post('/:id/record-review', errorNotebookController.recordErrorNoteReview);

  return {
    errorNotebookRoutes: router,
    errorNotebookRepository,
    errorNotebookController,
  };
};
