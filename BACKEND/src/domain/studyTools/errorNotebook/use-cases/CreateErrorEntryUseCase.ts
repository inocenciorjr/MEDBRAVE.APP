import { IErrorNotebookEntryRepository } from '../repositories/IErrorNotebookEntryRepository';
import { ErrorNotebookEntry, CreateErrorEntryPayload, ErrorNoteDifficulty } from '../types';
import { AppError } from '../../../../shared/errors/AppError';

export class CreateErrorEntryUseCase {
  constructor(
    private errorNotebookEntryRepository: IErrorNotebookEntryRepository,
  ) {}

  async execute(data: CreateErrorEntryPayload): Promise<ErrorNotebookEntry> {
    // Validar existência de userId e questionId
    if (!data.userId) {
      throw new AppError('User ID is required');
    }
    if (!data.questionId) {
      throw new AppError('Question ID is required');
    }

    // Validar conteúdo da anotação
    if (!data.userNote?.trim()) {
      throw new AppError('User note is required');
    }
    if (!data.userExplanation?.trim()) {
      throw new AppError('User explanation is required');
    }

    // Valores padrão para campos opcionais
    const entryData: CreateErrorEntryPayload = {
      ...data,
      keyPoints: data.keyPoints || [],
      tags: data.tags || [],
      difficulty: data.difficulty || ErrorNoteDifficulty.MEDIUM,
      confidence: data.confidence || 3,
    };

    // Criar entrada no caderno de erros
    const entry = await this.errorNotebookEntryRepository.create(entryData);

    return entry;
  }
}
