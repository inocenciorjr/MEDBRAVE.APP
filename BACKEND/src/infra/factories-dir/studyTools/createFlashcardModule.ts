import { FlashcardController } from '../../../domain/studyTools/flashcards/controllers/flashcardController';
import { createFlashcardRoutes } from '../../../domain/studyTools/flashcards/routes/flashcardRoutes';
import { FirebaseFlashcardRepository } from '../../repositories/firebase/FirebaseFlashcardRepository';

export const createFlashcardModule = () => {
  // Criar repositório
  const flashcardRepository = new FirebaseFlashcardRepository();

  // Criar controlador
  const flashcardController = new FlashcardController(flashcardRepository);

  // Criar rotas
  const flashcardRoutes = createFlashcardRoutes(flashcardController);

  return {
    flashcardRoutes,
    flashcardRepository,
    flashcardController,
  };
};
