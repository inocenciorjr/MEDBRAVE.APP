import { IErrorNotebookEntryRepository } from '../repositories/IErrorNotebookEntryRepository';
import { ErrorNotebookEntry } from '../types';
import { AppError } from '../../../../shared/errors/AppError';
import { ReviewQuality } from '../../flashcards/types';

export class RecordEntryReviewUseCase {
  constructor(
    private errorNotebookEntryRepository: IErrorNotebookEntryRepository,
  ) {}

  async execute(
    id: string,
    userId: string,
    quality: ReviewQuality,
    notes?: string | null,
  ): Promise<ErrorNotebookEntry> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Entry ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    if (!quality || !Object.values(ReviewQuality).includes(quality)) {
      throw new AppError('A valid review quality is required');
    }

    // Verificar se a entrada existe
    const existingEntry = await this.errorNotebookEntryRepository.findById(id);

    if (!existingEntry) {
      throw new AppError('Error notebook entry not found', 404);
    }

    // Verificar se a entrada pertence ao usuário
    if (existingEntry.user_id !== userId) {
      throw new AppError('Unauthorized access to error notebook entry', 403);
    }

    // Registrar revisão
    const updatedEntry = await this.errorNotebookEntryRepository.recordReview(
      id,
      userId,
      quality,
      notes,
    );

    if (!updatedEntry) {
      throw new AppError('Failed to record entry review', 500);
    }

    return updatedEntry;
  }
}
