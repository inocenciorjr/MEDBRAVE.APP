import { FlashcardController } from '../controllers/flashcardController';
import { deckController } from '../controllers/deckController';
import { createFlashcardRoutes } from '../routes/flashcardRoutes';
// FlashcardFSRSController and createFlashcardFSRSRoutes removed - FSRS logic deprecated
// optimizedSearchRoutes removed - now uses GIN index directly
import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import { CreateFlashcardUseCase } from '../use-cases/CreateFlashcardUseCase';
import { GetFlashcardByIdUseCase } from '../use-cases/GetFlashcardByIdUseCase';
import { GetUserFlashcardsUseCase } from '../use-cases/GetUserFlashcardsUseCase';
import { UpdateFlashcardUseCase } from '../use-cases/UpdateFlashcardUseCase';
import { DeleteFlashcardUseCase } from '../use-cases/DeleteFlashcardUseCase';
import { ToggleFlashcardArchiveUseCase } from '../use-cases/ToggleFlashcardArchiveUseCase';
import { RecordFlashcardReviewUseCase } from '../use-cases/RecordFlashcardReviewUseCase';
import { SearchFlashcardsUseCase } from '../use-cases/SearchFlashcardsUseCase';
// SupabaseFlashcardFSRSService removed - FSRS logic deprecated
import { container } from '../../../../shared/container';

export interface FlashcardModuleOptions {
  flashcardRepository?: IFlashcardRepository;
  enableFSRS?: boolean;
}

/**
 * Factory para criar o módulo de flashcards
 * @param options Opções de configuração
 */
export function createFlashcardModule(options?: FlashcardModuleOptions) {
  // Obter repositório do container de injeção de dependência
  const flashcardRepository =
    options?.flashcardRepository || container.resolve<IFlashcardRepository>('FlashcardRepository');

  // Criar casos de uso
  const createFlashcardUseCase = new CreateFlashcardUseCase(
    flashcardRepository,
  );
  const getFlashcardByIdUseCase = new GetFlashcardByIdUseCase(
    flashcardRepository,
  );
  const getUserFlashcardsUseCase = new GetUserFlashcardsUseCase(
    flashcardRepository,
  );
  const updateFlashcardUseCase = new UpdateFlashcardUseCase(
    flashcardRepository,
  );
  const deleteFlashcardUseCase = new DeleteFlashcardUseCase(
    flashcardRepository,
  );
  const toggleFlashcardArchiveUseCase = new ToggleFlashcardArchiveUseCase(
    flashcardRepository,
  );
  const recordFlashcardReviewUseCase = new RecordFlashcardReviewUseCase(
    flashcardRepository,
  );
  const searchFlashcardsUseCase = new SearchFlashcardsUseCase(
    flashcardRepository,
  );

  // Criar controladores
  const flashcardController = new FlashcardController(flashcardRepository);

  // FSRS services and controllers removed - FSRS logic deprecated

  // Usar a instância singleton do deck controller

  // Criar rotas
  const flashcardRoutes = createFlashcardRoutes(flashcardController);

  return {
    flashcardRoutes,
    // flashcardFSRSRoutes removed - FSRS logic deprecated
    // optimizedSearchRoutes removed - now uses GIN index directly

    // Expor controladores
    controllers: {
      flashcardController,
      // flashcardFSRSController removed - FSRS logic deprecated
      deckController,
    },

    // Expor serviços
    services: {
      // flashcardFSRSService removed - FSRS logic deprecated
    },

    // Expor casos de uso
    useCases: {
      createFlashcardUseCase,
      getFlashcardByIdUseCase,
      getUserFlashcardsUseCase,
      updateFlashcardUseCase,
      deleteFlashcardUseCase,
      toggleFlashcardArchiveUseCase,
      recordFlashcardReviewUseCase,
      searchFlashcardsUseCase,
    },

    // Expor repositórios
    repositories: {
      flashcardRepository,
    },
  };
}
