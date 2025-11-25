import { FlashcardUserInteraction } from '../types';
import { Flashcard } from '../types';

export interface IUserFlashcardInteractionRepository {
  getOrCreate(
    userId: string,
    flashcardId: string,
    deckId?: string,
  ): Promise<FlashcardUserInteraction>;
  recordReview(
    userId: string,
    flashcardId: string,
    deckId: string | undefined,
    reviewData: any,
  ): Promise<FlashcardUserInteraction>;
  resetProgress(data: any): Promise<FlashcardUserInteraction>;
  getStats(
    userId: string,
    flashcardId: string,
  ): Promise<FlashcardUserInteraction | null>;
  getDueFlashcards(
    userId: string,
    deckId?: string,
    limit?: number,
  ): Promise<Flashcard[]>;
}
