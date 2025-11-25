import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import { Flashcard } from '../types/flashcard.types';
import { AppError } from '../../../../shared/errors/AppError';

export class ToggleFlashcardArchiveUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(id: string, user_id: string): Promise<Flashcard> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Flashcard ID is required');
    }

    if (!user_id) {
      throw new AppError('User ID is required');
    }

    // Verificar se o flashcard existe e pertence ao usuário
    const existingFlashcard = await this.flashcardRepository.findById(id);

    if (!existingFlashcard) {
      throw new AppError('Flashcard not found', 404);
    }

    // Verificar se o deck do flashcard pertence ao usuário
    if (existingFlashcard.deck_id) {
      try {
        await this.flashcardRepository.getDeckById(existingFlashcard.deck_id, user_id);
        // Se getDeckById não lançar erro, o usuário tem acesso ao deck
      } catch (error: any) {
        // Se o erro for "Deck not found or access denied", significa que o usuário não tem acesso
        if (error.message?.includes('not found') || error.message?.includes('access denied')) {
          throw new AppError('Unauthorized access to flashcard', 403);
        }
        // Se for outro erro, propagar
        throw error;
      }
    }

    // Alternar status de arquivamento
    const updatedFlashcard = await this.flashcardRepository.toggleArchive(id);

    return updatedFlashcard;
  }
}
