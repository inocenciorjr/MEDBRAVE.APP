import {
  IFlashcardRepository,
  FlashcardFilters,
  PaginationOptions,
  PaginatedResult,
} from '../repositories/IFlashcardRepository';
import { AppError } from '../../../../shared/errors/AppError';
import { Flashcard } from '../types/flashcard.types';

export class GetUserFlashcardsUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(
    userId: string,
    filters: FlashcardFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<Flashcard>> {
    // Validar parâmetros
    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Validar e ajustar paginação
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;

    if (page < 1) {
      throw new AppError('Page number must be greater than or equal to 1');
    }

    if (limit < 1 || limit > 100) {
      throw new AppError('Limit must be between 1 and 100');
    }

    // Obter flashcards do usuário com filtros e paginação
    const paginatedFlashcards = await this.flashcardRepository.findByUser(
      userId,
      filters,
      {
        page,
        limit,
        sort_by: pagination.sort_by,
        sort_order: pagination.sort_order,
      },
    );

    return paginatedFlashcards;
  }
}
