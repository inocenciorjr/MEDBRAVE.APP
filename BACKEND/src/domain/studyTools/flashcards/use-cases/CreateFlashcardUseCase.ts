import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import { Flashcard, CreateFlashcardDTO, FlashcardStatus } from '../types/flashcard.types';
import { AppError } from '../../../../shared/errors/AppError';

export class CreateFlashcardUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(data: CreateFlashcardDTO): Promise<Flashcard> {
    // Validar existência de deckId e userId
    if (!data.deckId) {
      throw new AppError('Deck ID is required');
    }

    if (!data.userId) {
      throw new AppError('User ID is required');
    }

    // Validar conteúdo do flashcard
    if (!data.frontContent || !data.frontContent.trim()) {
      throw new AppError('Front content is required');
    }

    if (!data.backContent || !data.backContent.trim()) {
      throw new AppError('Back content is required');
    }

    // Tratar valores opcionais
    const tags = data.tags || [];
    const personalNotes = data.personalNotes || '';
    const mediaUrls = data.mediaUrls || [];
    const metadata = data.metadata || {};

    // Criar flashcard
    const now = (global as any).Timestamp ? (global as any).Timestamp.now() : new Date();
    const flashcard = await this.flashcardRepository.create({
      userId: data.userId,
      deckId: data.deckId,
      frontContent: data.frontContent,
      backContent: data.backContent,
      personalNotes,
      tags,
      status: FlashcardStatus.LEARNING,
      srsData: { interval: 0, easeFactor: 2.5, repetitions: 0, lapses: 0 },
      nextReviewAt: now,
      lastReviewedAt: null,
      searchableText: `${data.frontContent} ${data.backContent} ${personalNotes}`.toLowerCase(),
      mediaUrls,
      metadata,
    });

    return flashcard;
  }
}
