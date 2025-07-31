import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import { Flashcard } from '../types/flashcard.types';
import { AppError } from '../../../../shared/errors/AppError';

export class GetFlashcardByIdUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(id: string, userId: string): Promise<Flashcard> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Flashcard ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Buscar flashcard
    const flashcard = await this.flashcardRepository.findById(id);

    // Verificar se o flashcard foi encontrado
    if (!flashcard) {
      throw new AppError('Flashcard not found', 404);
    }

    // Verificar se o flashcard pertence ao usuário
    if (flashcard.userId !== userId) {
      throw new AppError('Unauthorized access to flashcard', 403);
    }

    return flashcard;
  }
}
