import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import { Flashcard, UpdateFlashcardDTO } from '../types/flashcard.types';
import { AppError } from '../../../../shared/errors/AppError';

export class UpdateFlashcardUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(id: string, userId: string, data: UpdateFlashcardDTO): Promise<Flashcard> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Flashcard ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Verificar se há dados para atualização
    if (Object.keys(data).length === 0) {
      throw new AppError('No data provided for update');
    }

    // Verificar se o flashcard existe e pertence ao usuário
    const existingFlashcard = await this.flashcardRepository.findById(id);

    if (!existingFlashcard) {
      throw new AppError('Flashcard not found', 404);
    }

    if (existingFlashcard.userId !== userId) {
      throw new AppError('Unauthorized access to flashcard', 403);
    }

    // Validar conteúdo do flashcard se fornecido
    if (data.frontContent && !data.frontContent.trim()) {
      throw new AppError('Front content cannot be empty');
    }

    if (data.backContent && !data.backContent.trim()) {
      throw new AppError('Back content cannot be empty');
    }

    // Atualizar flashcard
    const updatedFlashcard = await this.flashcardRepository.update(id, data);

    return updatedFlashcard;
  }
}
