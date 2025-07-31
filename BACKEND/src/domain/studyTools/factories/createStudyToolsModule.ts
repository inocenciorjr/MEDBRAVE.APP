import { Router } from 'express';
import { firestore } from 'firebase-admin';
import { createErrorNotebookModule } from '../errorNotebook/factories/createErrorNotebookModule';
import { createUnifiedReviewRoutes } from '../unifiedReviews/routes/unifiedReviewRoutes';
import { createFlashcardModule } from '../flashcards/factories/createFlashcardModule';
import { createStudySessionModule } from '../studySessions/factories/createStudySessionModule';
import { UnifiedReviewController } from '../unifiedReviews/controllers/UnifiedReviewController';
import { UnifiedReviewService } from '../unifiedReviews/services/UnifiedReviewService';
import { FSRSServiceFactory } from '../../srs/factory/fsrsServiceFactory';
import { FirebaseQuestionService } from '../../questions/services/FirebaseQuestionService';

export interface StudyToolsModuleOptions {
  firestoreDb?: firestore.Firestore;
}

/**
 * Factory para criar o módulo completo de ferramentas de estudo
 * @param options Opções de configuração
 * @returns Objeto com rotas e submódulos
 */
export const createStudyToolsModule = (
  options: StudyToolsModuleOptions = {}
): {
  studyToolsRoutes: {
    flashcards: Router;
    decks: Router;
    studySessions: Router;
    errorNotebooks: Router;
    unifiedReviews: Router;
  };
  flashcardModule: ReturnType<typeof createFlashcardModule>;
  studySessionModule: ReturnType<typeof createStudySessionModule>;
  errorNotebookModule: ReturnType<typeof createErrorNotebookModule>;
} => {
  const { firestoreDb } = options;
  
  // Criar submódulos com configurações apropriadas
  const flashcardModule = createFlashcardModule({ enableFSRS: true });
  console.log('🔍 [createStudyToolsModule] flashcardModule criado:', {
    hasFlashcardRoutes: !!flashcardModule.flashcardRoutes,
    hasFlashcardFSRSRoutes: !!flashcardModule.flashcardFSRSRoutes
  });
  
  const studySessionModule = createStudySessionModule();
  const errorNotebookModule = createErrorNotebookModule();
  
  // Criar UnifiedReviewService e Controller com firestoreDb se disponível
  let unifiedReviewRoutes: Router;
  if (firestoreDb) {
    const fsrsService = FSRSServiceFactory.createService(firestoreDb);
    const questionService = new FirebaseQuestionService(firestoreDb);
    const unifiedReviewService = new UnifiedReviewService(firestoreDb, fsrsService, questionService);
    const unifiedReviewController = new UnifiedReviewController(unifiedReviewService);
    unifiedReviewRoutes = createUnifiedReviewRoutes(unifiedReviewController);
  } else {
    // Fallback: criar router vazio se não há firestoreDb
    unifiedReviewRoutes = Router();
    // UnifiedReviewRoutes created without firestoreDb - limited functionality
  }

  // Criar router combinado para flashcards (incluindo FSRS)
  // IMPORTANTE: Rotas FSRS devem ser registradas ANTES das rotas genéricas para evitar conflitos
  const combinedFlashcardRoutes = Router();
  if (flashcardModule.flashcardFSRSRoutes) {
    combinedFlashcardRoutes.use('/', flashcardModule.flashcardFSRSRoutes);
    console.log('✅ [createStudyToolsModule] Rotas FSRS adicionadas ao router combinado (prioridade)');
  } else {
    console.warn('⚠️ [createStudyToolsModule] flashcardFSRSRoutes não encontradas!');
  }
  combinedFlashcardRoutes.use('/', flashcardModule.flashcardRoutes);
  console.log('✅ [createStudyToolsModule] Rotas de flashcards adicionadas ao router combinado');

  // Retornar rotas de todos os submódulos
  return {
    studyToolsRoutes: {
      flashcards: combinedFlashcardRoutes,
      decks: Router(), // Placeholder para decks, poderia ser implementado como submódulo de flashcards
      studySessions: studySessionModule.studySessionRoutes,
      errorNotebooks: errorNotebookModule.errorNotebookRoutes,
      unifiedReviews: unifiedReviewRoutes,
    },
    flashcardModule,
    studySessionModule,
    errorNotebookModule,
  };
};
