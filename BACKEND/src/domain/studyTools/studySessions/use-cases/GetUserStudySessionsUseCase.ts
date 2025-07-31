import {
  IStudySessionRepository,
  StudySessionFilters,
  PaginationOptions,
  PaginatedStudySessions,
} from '../repositories/IStudySessionRepository';
import { AppError } from '../../../../shared/errors/AppError';

export class GetUserStudySessionsUseCase {
  constructor(private studySessionRepository: IStudySessionRepository) {}

  async execute(
    userId: string,
    filters: StudySessionFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedStudySessions> {
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

    // Obter sessões de estudo do usuário com filtros e paginação
    const paginatedSessions = await this.studySessionRepository.findByUser(userId, filters, {
      page,
      limit,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });

    return paginatedSessions;
  }
}
