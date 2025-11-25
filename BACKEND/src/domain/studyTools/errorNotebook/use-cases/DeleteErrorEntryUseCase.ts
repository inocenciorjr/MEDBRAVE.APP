import { IErrorNotebookEntryRepository } from '../repositories/IErrorNotebookEntryRepository';
import { AppError } from '../../../../shared/errors/AppError';

export class DeleteErrorEntryUseCase {
  constructor(
    private errorNotebookEntryRepository: IErrorNotebookEntryRepository,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
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
    if (existingEntry.user_id !== userId) {
      throw new AppError('Unauthorized access to error notebook entry', 403);
    }

    // Excluir entrada
    const success = await this.errorNotebookEntryRepository.delete(id, userId);

    if (!success) {
      throw new AppError('Failed to delete error notebook entry', 500);
    }
  }
}
