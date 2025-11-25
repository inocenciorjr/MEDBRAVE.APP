import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import { Flashcard } from '../types/flashcard.types';
import { AppError } from '../../../../shared/errors/AppError';

export class GetFlashcardByIdUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(id: string, user_id: string): Promise<Flashcard> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Flashcard ID is required');
    }

    if (!user_id) {
      throw new AppError('User ID is required');
    }

    // Buscar flashcard
    const flashcard = await this.flashcardRepository.findById(id);

    // Verificar se o flashcard foi encontrado
    if (!flashcard) {
      throw new AppError('Flashcard not found', 404);
    }

    // Verificar se o deck do flashcard pertence ao usuário
    if (flashcard.deck_id) {
      try {
        await this.flashcardRepository.getDeckById(flashcard.deck_id, user_id);
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

    return flashcard;
  }
}
