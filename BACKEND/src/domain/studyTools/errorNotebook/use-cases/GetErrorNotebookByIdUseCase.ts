import { IErrorNotebookRepository } from '../repositories/IErrorNotebookRepository';
import { ErrorNotebook } from '../types';
import { AppError } from '../../../../shared/errors/AppError';

export class GetErrorNotebookByIdUseCase {
  constructor(private errorNotebookRepository: IErrorNotebookRepository) {}

  async execute(id: string, userId: string): Promise<ErrorNotebook> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Notebook ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Buscar caderno de erros
    const errorNotebook = await this.errorNotebookRepository.findById(id);

    // Verificar se o caderno de erros foi encontrado
    if (!errorNotebook) {
      throw new AppError('Error notebook not found', 404);
    }

    // Verificar se o caderno de erros pertence ao usuário ou é público
    if (errorNotebook.user_id !== userId && !errorNotebook.is_public) {
      throw new AppError('Unauthorized access to error notebook', 403);
    }

    return errorNotebook;
  }
}
