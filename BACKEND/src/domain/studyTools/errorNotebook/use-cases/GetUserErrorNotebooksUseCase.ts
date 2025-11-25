import {
  IErrorNotebookRepository,
  ErrorNotebookFilters,
  PaginatedErrorNotebooks,
} from '../repositories/IErrorNotebookRepository';
import { AppError } from '../../../../shared/errors/AppError';
// PaginationOptions moved to shared types
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class GetUserErrorNotebooksUseCase {
  constructor(private errorNotebookRepository: IErrorNotebookRepository) {}

  async execute(
    userId: string,
    filters: ErrorNotebookFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedErrorNotebooks> {
    // Validar parâmetros
    if (!userId) {
      throw new AppError('User ID is required');
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

    // Obter cadernos de erros do usuário com filtros e paginação
    const paginatedNotebooks = await this.errorNotebookRepository.findByUser(
      userId,
      filters,
      {
        page,
        limit,
        sortBy: pagination.sortBy,
        sortOrder: pagination.sortOrder,
      },
    );

    return paginatedNotebooks;
  }
}
