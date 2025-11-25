// Controllers
export { FlashcardController } from './controllers/flashcardController';

// Routes
export { createFlashcardRoutes } from './routes/flashcardRoutes';

// Repositories
export {
  IFlashcardRepository,
  type FlashcardFilters,
  type PaginationOptions,
} from './repositories/IFlashcardRepository';

// Use Cases
export { CreateFlashcardUseCase } from './use-cases/CreateFlashcardUseCase';
export { GetFlashcardByIdUseCase } from './use-cases/GetFlashcardByIdUseCase';
export { GetUserFlashcardsUseCase } from './use-cases/GetUserFlashcardsUseCase';
export { UpdateFlashcardUseCase } from './use-cases/UpdateFlashcardUseCase';
export { DeleteFlashcardUseCase } from './use-cases/DeleteFlashcardUseCase';
export { ToggleFlashcardArchiveUseCase } from './use-cases/ToggleFlashcardArchiveUseCase';
export { RecordFlashcardReviewUseCase } from './use-cases/RecordFlashcardReviewUseCase';
export { SearchFlashcardsUseCase } from './use-cases/SearchFlashcardsUseCase';

// Types
export {
  FlashcardStatus,
  ReviewQuality,
  type Flashcard,
  type CreateFlashcardDTO,
  type UpdateFlashcardDTO,
} from './types/flashcard.types';
export { type PaginatedFlashcardsResult } from './types/index';

// Validation
export { validate } from './validation/flashcardSchemas';
