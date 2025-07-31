import { IErrorNotebookRepository } from '../repositories/IErrorNotebookRepository';
import { ErrorNotebook, CreateErrorNotebookPayload } from '../types';
import { AppError } from '../../../../shared/errors/AppError';

export class CreateErrorNotebookUseCase {
  constructor(private errorNotebookRepository: IErrorNotebookRepository) {}

  async execute(data: CreateErrorNotebookPayload): Promise<ErrorNotebook> {
    // Validar existência de userId
    if (!data.userId) {
      throw new AppError('User ID is required');
    }

    // Validar título
    if (!data.title || !data.title.trim()) {
      throw new AppError('Notebook title is required');
    }

    // Valores padrão para campos opcionais
    const notebookData = {
      userId: data.userId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      isPublic: data.isPublic || false,
      tags: data.tags || [],
    };

    // Criar caderno de erros
    const errorNotebook = await this.errorNotebookRepository.create(notebookData);

    return errorNotebook;
  }
}
