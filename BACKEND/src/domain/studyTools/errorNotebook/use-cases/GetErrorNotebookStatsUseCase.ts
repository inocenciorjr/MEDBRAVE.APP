import { IErrorNotebookRepository } from '../repositories/IErrorNotebookRepository';
import { ErrorNotebookStats } from '../types';
import { AppError } from '../../../../shared/errors/AppError';

export class GetErrorNotebookStatsUseCase {
  constructor(private errorNotebookRepository: IErrorNotebookRepository) {}

  async execute(id: string, userId: string): Promise<ErrorNotebookStats> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Notebook ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Verificar se o caderno de erros existe
    const existingNotebook = await this.errorNotebookRepository.findById(id);

    if (!existingNotebook) {
      throw new AppError('Error notebook not found', 404);
    }

    // Verificar se o caderno de erros pertence ao usuário ou é público
    if (existingNotebook.userId !== userId && !existingNotebook.isPublic) {
      throw new AppError('Unauthorized access to error notebook', 403);
    }

    // Obter estatísticas
    const stats = await this.errorNotebookRepository.getStats(id, userId);

    if (!stats) {
      throw new AppError('Failed to retrieve error notebook statistics', 500);
    }

    return stats;
  }
}
