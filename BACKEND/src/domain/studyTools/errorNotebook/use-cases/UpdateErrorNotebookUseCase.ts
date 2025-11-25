import { IErrorNotebookRepository } from '../repositories/IErrorNotebookRepository';
import { ErrorNotebook, UpdateErrorNotebookPayload } from '../types';
import { AppError } from '../../../../shared/errors/AppError';

export class UpdateErrorNotebookUseCase {
  constructor(private errorNotebookRepository: IErrorNotebookRepository) {}

  async execute(
    id: string,
    userId: string,
    data: UpdateErrorNotebookPayload,
  ): Promise<ErrorNotebook> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Notebook ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Verificar se há dados para atualização
    if (Object.keys(data).length === 0) {
      throw new AppError('No data provided for update');
    }

    // Validar o título se estiver presente
    if (data.title !== undefined && (!data.title || !data.title.trim())) {
      throw new AppError('Notebook title cannot be empty');
    }

    // Verificar se o caderno de erros existe
    const existingNotebook = await this.errorNotebookRepository.findById(id);

    if (!existingNotebook) {
      throw new AppError('Error notebook not found', 404);
    }

    // Verificar se o caderno de erros pertence ao usuário
    if (existingNotebook.user_id !== userId) {
      throw new AppError('Unauthorized access to error notebook', 403);
    }

    // Atualizar caderno de erros
      const updatedNotebook = await this.errorNotebookRepository.update(
        id,
        userId,
        {
          title: data.title?.trim(),
          description: data.description?.trim(),
          is_public: data.is_public,
          tags: data.tags,
        },
      );

    if (!updatedNotebook) {
      throw new AppError('Failed to update error notebook', 500);
    }

    return updatedNotebook;
  }
}
