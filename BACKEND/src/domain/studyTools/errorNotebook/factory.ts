import { Router } from 'express';
import { ErrorNotebookController } from './controllers/errorNotebookController';
import { ErrorNotebookEntryController } from './controllers/errorNotebookEntryController';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { FirebaseErrorNotebookRepository } from '../../../infra/repositories/firebase/FirebaseErrorNotebookRepository';

/**
 * Cria e configura o módulo de caderno de erros
 * @returns Router configurado com todas as rotas do caderno de erros
 */
export function createErrorNotebookModule(): Router {
  // Criar repositório
  const errorNotebookRepository = new FirebaseErrorNotebookRepository();

  // Criar controladores
  const errorNotebookController = new ErrorNotebookController();
  const errorNotebookEntryController = new ErrorNotebookEntryController(errorNotebookRepository);

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

  // Rotas das Entradas do Caderno de Erros
  router.post(
    '/entries',
    errorNotebookEntryController.createErrorEntry.bind(errorNotebookEntryController),
  );
  router.get(
    '/entries/:id',
    errorNotebookEntryController.getEntryById.bind(errorNotebookEntryController),
  );
  router.get(
    '/:notebookId/entries',
    errorNotebookEntryController.getEntriesByNotebookId.bind(errorNotebookEntryController),
  );
  router.put(
    '/entries/:id',
    errorNotebookEntryController.updateEntry.bind(errorNotebookEntryController),
  );
  router.delete(
    '/entries/:id',
    errorNotebookEntryController.deleteEntry.bind(errorNotebookEntryController),
  );
  router.post(
    '/entries/:id/review',
    errorNotebookEntryController.recordEntryReview.bind(errorNotebookEntryController),
  );
  router.get(
    '/entries/due',
    errorNotebookEntryController.getNextDueEntries.bind(errorNotebookEntryController),
  );

  // Rotas para importação
  router.post(
    '/import/question',
    errorNotebookEntryController.importFromQuestionResponse.bind(errorNotebookEntryController),
  );
  router.post(
    '/import/flashcard',
    errorNotebookEntryController.importFromFlashcardInteraction.bind(errorNotebookEntryController),
  );

  return router;
}
