import { IErrorNotebookEntryRepository } from '../repositories/IErrorNotebookEntryRepository';
import { ErrorNotebookEntry } from '../types';
import { AppError } from '../../../../shared/errors/AppError';

export class ToggleEntryResolvedUseCase {
  constructor(private errorNotebookEntryRepository: IErrorNotebookEntryRepository) {}

  async execute(id: string, userId: string): Promise<ErrorNotebookEntry> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Entry ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Verificar se a entrada existe
    const existingEntry = await this.errorNotebookEntryRepository.findById(id);

    if (!existingEntry) {
      throw new AppError('Error notebook entry not found', 404);
    }

    // Verificar se a entrada pertence ao usuário
    if (existingEntry.userId !== userId) {
      throw new AppError('Unauthorized access to error notebook entry', 403);
    }

    // Alternar status de resolução
    const updatedEntry = await this.errorNotebookEntryRepository.toggleResolved(id, userId);

    if (!updatedEntry) {
      throw new AppError('Failed to toggle entry resolved status', 500);
    }

    return updatedEntry;
  }
}
