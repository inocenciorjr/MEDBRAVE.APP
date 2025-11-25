import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { CreateFlashcardUseCase } from '../../../domain/studyTools/flashcards/use-cases/CreateFlashcardUseCase';
import { RecordFlashcardReviewUseCase } from '../../../domain/studyTools/flashcards/use-cases/RecordFlashcardReviewUseCase';
import { GetUserFlashcardsUseCase } from '../../../domain/studyTools/flashcards/use-cases/GetUserFlashcardsUseCase';

export class FlashcardController {
  async create(request: Request, response: Response): Promise<Response> {
    
    const { deckId, frontContent, backContent, tags } = request.body;

    const createFlashcard = container.resolve(CreateFlashcardUseCase);
    const flashcard = await createFlashcard.execute({
      deck_id: deckId,
      front_content: frontContent,
      back_content: backContent,
      tags,
    });

    return response.status(201).json(flashcard);
  }

  async review(request: Request, response: Response): Promise<Response> {
    
    const { flashcardId } = request.params;
    const { reviewQuality } = request.body;

    const reviewFlashcard = container.resolve(RecordFlashcardReviewUseCase);
    const flashcard = await reviewFlashcard.execute(
      flashcardId,
      request.userId,
      reviewQuality,
    );

    return response.json(flashcard);
  }

  async getForReview(request: Request, response: Response): Promise<Response> {
    
    const { deckId, page = 1, limit = 10 } = request.query;

    const getUserFlashcards = container.resolve(GetUserFlashcardsUseCase);
    const filters = {
      deck_id: deckId as string | undefined,
      ready_for_review: true,
    };
    const pagination = {
      page: Number(page),
      limit: Number(limit),
    };
    const flashcards = await getUserFlashcards.execute(
      request.userId,
      filters,
      pagination,
    );

    return response.json(flashcards);
  }
}
