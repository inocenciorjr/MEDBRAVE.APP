import { Router } from 'express';
import { FlashcardController } from '../controllers/flashcardController';
import { FlashcardFSRSController } from '../controllers/FlashcardFSRSController';
import { deckController } from '../controllers/deckController';
import { createFlashcardRoutes } from '../routes/flashcardRoutes';
import { createFlashcardFSRSRoutes } from '../routes/flashcardFSRSRoutes';
import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import { CreateFlashcardUseCase } from '../use-cases/CreateFlashcardUseCase';
import { GetFlashcardByIdUseCase } from '../use-cases/GetFlashcardByIdUseCase';
import { GetUserFlashcardsUseCase } from '../use-cases/GetUserFlashcardsUseCase';
import { UpdateFlashcardUseCase } from '../use-cases/UpdateFlashcardUseCase';
import { DeleteFlashcardUseCase } from '../use-cases/DeleteFlashcardUseCase';
import { ToggleFlashcardArchiveUseCase } from '../use-cases/ToggleFlashcardArchiveUseCase';
import { RecordFlashcardReviewUseCase } from '../use-cases/RecordFlashcardReviewUseCase';
import { SearchFlashcardsUseCase } from '../use-cases/SearchFlashcardsUseCase';
import { FirebaseFlashcardRepository } from '../../../../infra/repositories/firebase/FirebaseFlashcardRepository';
import { FlashcardFSRSService } from '../services/FlashcardFSRSService';

export interface FlashcardModuleOptions {
  flashcardRepository?: IFlashcardRepository;
  enableFSRS?: boolean;
}

/**
 * Factory para criar o módulo de flashcards
 * @param options Opções de configuração
 */
export function createFlashcardModule(options?: FlashcardModuleOptions) {
  // Obter ou criar repositório
  const flashcardRepository =
    options?.flashcardRepository || new FirebaseFlashcardRepository();

  // Criar casos de uso
  const createFlashcardUseCase = new CreateFlashcardUseCase(flashcardRepository);
  const getFlashcardByIdUseCase = new GetFlashcardByIdUseCase(flashcardRepository);
  const getUserFlashcardsUseCase = new GetUserFlashcardsUseCase(flashcardRepository);
  const updateFlashcardUseCase = new UpdateFlashcardUseCase(flashcardRepository);
  const deleteFlashcardUseCase = new DeleteFlashcardUseCase(flashcardRepository);
  const toggleFlashcardArchiveUseCase = new ToggleFlashcardArchiveUseCase(flashcardRepository);
  const recordFlashcardReviewUseCase = new RecordFlashcardReviewUseCase(flashcardRepository);
  const searchFlashcardsUseCase = new SearchFlashcardsUseCase(flashcardRepository);

  // Criar controladores
  const flashcardController = new FlashcardController(flashcardRepository);

  // Criar serviços e controladores FSRS se habilitado
  let flashcardFSRSService: FlashcardFSRSService | undefined;
  let flashcardFSRSController: FlashcardFSRSController | undefined;
  let flashcardFSRSRoutes: Router | undefined;

  if (options?.enableFSRS !== false) { // FSRS habilitado por padrão
    console.log('🔧 [createFlashcardModule] Criando componentes FSRS...');
    flashcardFSRSService = new FlashcardFSRSService();
    flashcardFSRSController = new FlashcardFSRSController(flashcardFSRSService);
    flashcardFSRSRoutes = createFlashcardFSRSRoutes(flashcardFSRSController);
    console.log('✅ [createFlashcardModule] Componentes FSRS criados com sucesso');
  } else {
    console.log('❌ [createFlashcardModule] FSRS desabilitado');
  }

  // Usar a instância singleton do deck controller

  // Criar rotas
  const flashcardRoutes = createFlashcardRoutes(flashcardController);

  return {
    flashcardRoutes,
    flashcardFSRSRoutes,

    // Expor controladores
    controllers: {
      flashcardController,
      flashcardFSRSController,
      deckController,
    },

    // Expor serviços
    services: {
      flashcardFSRSService,
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
