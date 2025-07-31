import {
  IErrorNotebookEntryRepository,
  ErrorNotebookEntryFilters,
  PaginatedErrorNotebookEntries,
} from '../repositories/IErrorNotebookEntryRepository';
import { IErrorNotebookRepository } from '../repositories/IErrorNotebookRepository';
import { AppError } from '../../../../shared/errors/AppError';
import { PaginationOptions } from '../../studySessions/types';

export class GetErrorEntriesByNotebookUseCase {
  constructor(
    private errorNotebookEntryRepository: IErrorNotebookEntryRepository,
    private errorNotebookRepository: IErrorNotebookRepository,
  ) {}

  async execute(
    notebookId: string,
    userId: string,
    filters: ErrorNotebookEntryFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedErrorNotebookEntries> {
    // Validar parâmetros
    if (!notebookId) {
      throw new AppError('Notebook ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Verificar se o caderno de erros existe
    const errorNotebook = await this.errorNotebookRepository.findById(notebookId);

    if (!errorNotebook) {
      throw new AppError('Error notebook not found', 404);
    }

    // Verificar se o caderno de erros pertence ao usuário ou é público
    if (errorNotebook.userId !== userId && !errorNotebook.isPublic) {
      throw new AppError('Unauthorized access to error notebook', 403);
    }

    // Validar e ajustar paginação
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;

    if (page < 1) {
      throw new AppError('Page number must be greater than or equal to 1');
    }

    if (limit < 1 || limit > 100) {
      throw new AppError('Limit must be between 1 and 100');
    }

    // Obter entradas do caderno de erros com filtros e paginação
    const paginatedEntries = await this.errorNotebookEntryRepository.findByNotebook(
      notebookId,
      filters,
      {
        page,
        limit,
        sortBy: pagination.sortBy,
        sortOrder: pagination.sortOrder,
      },
    );

    return paginatedEntries;
  }
}
