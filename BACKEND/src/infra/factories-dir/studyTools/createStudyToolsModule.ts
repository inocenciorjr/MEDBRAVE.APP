import { Router } from 'express';
import { createFlashcardModule } from './createFlashcardModule';
import { createStudySessionModule } from './createStudySessionModule';

export const createStudyToolsModule = (
): {
  studyToolsRoutes: {
    flashcards: Router;
    decks: Router;
    studySessions: Router;
    errorNotebooks: Router;
    unifiedReviews: Router;
  };
} => {
  // Criar submódulos
  const flashcardModule = createFlashcardModule();
  const studySessionModule = createStudySessionModule();

  // Aqui seriam criados os outros submódulos do StudyTools
  // const deckModule = createDeckModule({ firestoreDb: db });
  // const errorNotebookModule = createErrorNotebookModule({ firestoreDb: db });
  // const unifiedReviewModule = createUnifiedReviewModule({ firestoreDb: db });

  // Retornar rotas de todos os submódulos
  return {
    studyToolsRoutes: {
      flashcards: flashcardModule.flashcardRoutes,
      decks: Router(), // Placeholder, seria substituído por deckModule.deckRoutes
      studySessions: studySessionModule.studySessionRoutes,
      errorNotebooks: Router(), // Placeholder
      unifiedReviews: Router(), // Placeholder - Sistema FSRS Unificado
    },
  };
};
