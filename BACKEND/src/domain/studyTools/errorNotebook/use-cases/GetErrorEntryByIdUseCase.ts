import { IErrorNotebookEntryRepository } from '../repositories/IErrorNotebookEntryRepository';
import { ErrorNotebookEntry } from '../types';
import { AppError } from '../../../../shared/errors/AppError';

export class GetErrorEntryByIdUseCase {
  constructor(private errorNotebookEntryRepository: IErrorNotebookEntryRepository) {}

  async execute(id: string, userId: string): Promise<ErrorNotebookEntry> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Entry ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Buscar entrada
    const entry = await this.errorNotebookEntryRepository.findById(id);

    // Verificar se a entrada foi encontrada
    if (!entry) {
      throw new AppError('Error notebook entry not found', 404);
    }

    // Verificar se a entrada pertence ao usuário
    if (entry.userId !== userId) {
      throw new AppError('Unauthorized access to error notebook entry', 403);
    }

    return entry;
  }
}
