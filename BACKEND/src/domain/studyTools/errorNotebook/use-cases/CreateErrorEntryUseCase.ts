import { IErrorNotebookEntryRepository } from '../repositories/IErrorNotebookEntryRepository';
import {
  ErrorNotebookEntry,
  CreateErrorEntryPayload,
  ErrorNoteDifficulty,
} from '../types';
import { AppError } from '../../../../shared/errors/AppError';

export class CreateErrorEntryUseCase {
  constructor(
    private errorNotebookEntryRepository: IErrorNotebookEntryRepository,
  ) {}

  async execute(data: CreateErrorEntryPayload): Promise<ErrorNotebookEntry> {
    // Validar existência de userId e questionId
    if (!data.user_id) {
      throw new AppError('User ID is required');
    }
    if (!data.question_id) {
      throw new AppError('Question ID is required');
    }

    // Validar conteúdo da anotação
    if (!data.user_note?.trim()) {
      throw new AppError('User note is required');
    }
    if (!data.user_explanation?.trim()) {
      throw new AppError('User explanation is required');
    }

    // Valores padrão para campos opcionais
    const entryDataForRepo = {
      userId: data.user_id,
      questionId: data.question_id,
      userNote: data.user_note.trim(),
      userExplanation: data.user_explanation.trim(),
      keyPoints: (data as any).key_points || [],
      tags: data.tags || [],
      difficulty: data.difficulty || ErrorNoteDifficulty.MEDIUM,
      confidence: data.confidence || 3,
    } as any;

    // Criar entrada no caderno de erros
    const entry = await this.errorNotebookEntryRepository.create(entryDataForRepo);

    return entry;
  }
}
