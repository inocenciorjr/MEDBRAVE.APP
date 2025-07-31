import { IStudySessionRepository } from '../repositories/IStudySessionRepository';
import { StudySession } from '../types/studySession.types';
import { AppError } from '../../../../shared/errors/AppError';

export class GetStudySessionByIdUseCase {
  constructor(private studySessionRepository: IStudySessionRepository) {}

  async execute(id: string, userId: string): Promise<StudySession> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Study session ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Buscar sessão de estudo
    const studySession = await this.studySessionRepository.findById(id, userId);

    // Verificar se a sessão de estudo foi encontrada
    if (!studySession) {
      throw new AppError('Study session not found', 404);
    }

    // Verificar se a sessão de estudo pertence ao usuário
    if (studySession.userId !== userId) {
      throw new AppError('Unauthorized access to study session', 403);
    }

    return studySession;
  }
}
