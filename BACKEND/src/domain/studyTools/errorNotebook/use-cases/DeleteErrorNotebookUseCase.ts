import { IErrorNotebookRepository } from '../repositories/IErrorNotebookRepository';
import { AppError } from '../../../../shared/errors/AppError';

export class DeleteErrorNotebookUseCase {
  constructor(private errorNotebookRepository: IErrorNotebookRepository) {}

  async execute(id: string, userId: string): Promise<void> {
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

    // Verificar se o caderno de erros pertence ao usuário
    if (existingNotebook.userId !== userId) {
      throw new AppError('Unauthorized access to error notebook', 403);
    }

    // Excluir caderno de erros
    const success = await this.errorNotebookRepository.delete(id, userId);

    if (!success) {
      throw new AppError('Failed to delete error notebook', 500);
    }
  }
}
