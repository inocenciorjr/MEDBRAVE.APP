import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import {
  Flashcard,
  CreateFlashcardDTO,
  FlashcardStatus,
} from '../types/flashcard.types';
import { AppError } from '../../../../shared/errors/AppError';

export class CreateFlashcardUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(data: CreateFlashcardDTO, user_id?: string): Promise<Flashcard> {
    // Validar existência de deck_id
    if (!data.deck_id) {
      throw new AppError('Deck ID is required');
    }

    // Validar conteúdo do flashcard
    if (!data.front_content || !data.front_content.trim()) {
      throw new AppError('Front content is required');
    }

    if (!data.back_content || !data.back_content.trim()) {
      throw new AppError('Back content is required');
    }

    // Verificar se o usuário pode EDITAR o deck (deve ser o dono)
    if (user_id) {
      const canEdit = await this.flashcardRepository.canEditDeck(data.deck_id, user_id);
      if (!canEdit) {
        throw new AppError('Unauthorized: You are not the owner of this deck', 403);
      }
    }

    // Tratar valores opcionais
    const tags = data.tags || [];

    // Criar flashcard (searchable_text é gerado automaticamente pelo trigger)
    const flashcard = await this.flashcardRepository.create({
      deck_id: data.deck_id,
      front_content: data.front_content,
      back_content: data.back_content,
      tags,
      status: FlashcardStatus.NEW,
      searchable_text: '', // Será ignorado pelo repository
    });

    return flashcard;
  }
}
