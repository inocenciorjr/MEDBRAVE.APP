import { IErrorNotebookRepository } from '../repositories/IErrorNotebookRepository';
import { ErrorNotebook, CreateErrorNotebookPayload } from '../types';
import { AppError } from '../../../../shared/errors/AppError';

export class CreateErrorNotebookUseCase {
  constructor(private errorNotebookRepository: IErrorNotebookRepository) {}

  async execute(data: CreateErrorNotebookPayload): Promise<ErrorNotebook> {
    // Validar existência de user_id
    if (!data.user_id) {
      throw new AppError('User ID is required');
    }

    // Validar título
    if (!data.title || !data.title.trim()) {
      throw new AppError('Notebook title is required');
    }

    // Valores padrão para campos opcionais
    const notebookData: CreateErrorNotebookPayload = {
      user_id: data.user_id,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      is_public: data.is_public || false,
      tags: data.tags || [],
    };

    // Criar caderno de erros
    const errorNotebook =
      await this.errorNotebookRepository.create(notebookData);

    return errorNotebook;
  }
}
