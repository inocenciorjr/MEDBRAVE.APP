import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import { Flashcard, ReviewQuality } from '../types/flashcard.types';
import { AppError } from '../../../../shared/errors/AppError';

export class RecordFlashcardReviewUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(id: string, userId: string, reviewQuality: number): Promise<Flashcard> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Flashcard ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    if (reviewQuality === undefined || reviewQuality < 0 || reviewQuality > 3) {
      throw new AppError('Review quality must be between 0 and 3');
    }

    // Verificar se o flashcard existe e pertence ao usuário
    const existingFlashcard = await this.flashcardRepository.findById(id);

    if (!existingFlashcard) {
      throw new AppError('Flashcard not found', 404);
    }

    if (existingFlashcard.userId !== userId) {
      throw new AppError('Unauthorized access to flashcard', 403);
    }

    // Registrar revisão
    const updatedFlashcard = await this.flashcardRepository.recordReview(
      id,
      reviewQuality as ReviewQuality,
    );

    return updatedFlashcard;
  }
}
