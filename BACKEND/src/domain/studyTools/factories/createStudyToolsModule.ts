import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { createErrorNotebookModule } from '../errorNotebook/factories/createErrorNotebookModule';
import { createUnifiedReviewRoutes } from '../unifiedReviews/routes/unifiedReviewRoutes';
import { createFlashcardModule } from '../flashcards/factories/createFlashcardModule';
// Study sessions module removed
import { UnifiedReviewController } from '../unifiedReviews/controllers/UnifiedReviewController';
import { SupabaseUnifiedReviewService } from '../../../infra/studyTools/supabase/SupabaseUnifiedReviewService';

export interface StudyToolsModuleOptions {
  supabaseClient?: SupabaseClient;
}

/**
 * Factory para criar o módulo completo de ferramentas de estudo
 * @param options Opções de configuração
 * @returns Objeto com rotas e submódulos
 */
export const createStudyToolsModule = (
  options: StudyToolsModuleOptions = {},
): {
  studyToolsRoutes: {
    flashcards: Router;
    decks: Router;
    // studySessions: Router; // Removed
    errorNotebooks: Router;
    unifiedReviews: Router;
  };
  // optimizedSearchRoutes removed - now uses GIN index directly
  flashcardModule: ReturnType<typeof createFlashcardModule>;
  // studySessionModule: ReturnType<typeof createStudySessionModule>; // Removed
  errorNotebookModule: ReturnType<typeof createErrorNotebookModule>;
  unifiedReviewService: SupabaseUnifiedReviewService | null;
} => {
  const { supabaseClient } = options;

  // Criar submódulos com configurações apropriadas
  const flashcardModule = createFlashcardModule({ enableFSRS: true });
  // const studySessionModule = createStudySessionModule(); // Removed
  const errorNotebookModule = createErrorNotebookModule();

  // Criar UnifiedReviewService e Controller com supabaseClient se disponível
  let unifiedReviewRoutes: Router;
  let unifiedReviewService: SupabaseUnifiedReviewService | null = null;
  
  if (supabaseClient) {
    unifiedReviewService = new SupabaseUnifiedReviewService(supabaseClient);
    const timezoneService = (unifiedReviewService as any).timezoneService;
    const unifiedReviewController = new UnifiedReviewController(
      unifiedReviewService,
      timezoneService,
      supabaseClient
    );
    unifiedReviewRoutes = createUnifiedReviewRoutes(unifiedReviewController);
  } else {
    // Fallback: criar router vazio se não há supabaseClient
    unifiedReviewRoutes = Router();
    // UnifiedReviewRoutes created without supabaseClient - limited functionality
  }

  // Criar router para flashcards (FSRS removido)
  const combinedFlashcardRoutes = Router();
  combinedFlashcardRoutes.use('/', flashcardModule.flashcardRoutes);

  // Retornar rotas de todos os submódulos
  return {
    studyToolsRoutes: {
      flashcards: combinedFlashcardRoutes,
      decks: Router(), // Placeholder para decks, poderia ser implementado como submódulo de flashcards
      // studySessions: studySessionModule.studySessionRoutes, // Removed
      errorNotebooks: errorNotebookModule.errorNotebookRoutes,
      unifiedReviews: unifiedReviewRoutes,
    },
    // optimizedSearchRoutes removed - now uses GIN index directly
    flashcardModule,
    // studySessionModule, // Removed
    errorNotebookModule,
    unifiedReviewService, // Exportar para uso em outras rotas
  };
};
