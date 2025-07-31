import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import { AppError } from '../../../../shared/errors/AppError';

export class DeleteFlashcardUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Flashcard ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Verificar se o flashcard existe e pertence ao usuário
    const existingFlashcard = await this.flashcardRepository.findById(id);

    if (!existingFlashcard) {
      throw new AppError('Flashcard not found', 404);
    }

    if (existingFlashcard.userId !== userId) {
      throw new AppError('Unauthorized access to flashcard', 403);
    }

    // Excluir flashcard
    await this.flashcardRepository.delete(id);

    // O repositório já deve atualizar as estatísticas do deck automaticamente
  }
}
