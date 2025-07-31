import { IStudySessionRepository } from '../repositories/IStudySessionRepository';
import { StudySession, CreateStudySessionDTO } from '../types/studySession.types';
import { AppError } from '../../../../shared/errors/AppError';

export class CreateStudySessionUseCase {
  constructor(private studySessionRepository: IStudySessionRepository) {}

  async execute(data: CreateStudySessionDTO): Promise<StudySession> {
    // Validar existência de userId
    if (!data.userId) {
      throw new AppError('User ID is required');
    }

    // Validar tipo de estudo
    if (!data.studyType) {
      throw new AppError('Study type is required');
    }

    // Criar sessão de estudo
    const studySession = await this.studySessionRepository.create(data);

    return studySession;
  }
}
