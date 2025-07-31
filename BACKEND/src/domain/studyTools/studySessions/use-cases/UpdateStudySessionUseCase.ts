import { IStudySessionRepository } from '../repositories/IStudySessionRepository';
import { StudySession, UpdateStudySessionDTO } from '../types/studySession.types';
import { AppError } from '../../../../shared/errors/AppError';

export class UpdateStudySessionUseCase {
  constructor(private studySessionRepository: IStudySessionRepository) {}

  async execute(id: string, userId: string, data: UpdateStudySessionDTO): Promise<StudySession> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Study session ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Verificar se há dados para atualização
    if (Object.keys(data).length === 0) {
      throw new AppError('No data provided for update');
    }

    // Verificar se a sessão de estudo existe e pertence ao usuário
    const existingSession = await this.studySessionRepository.findById(id, userId);

    if (!existingSession) {
      throw new AppError('Study session not found', 404);
    }

    if (existingSession.userId !== userId) {
      throw new AppError('Unauthorized access to study session', 403);
    }

    // Verificar se a sessão já foi concluída
    if (existingSession.isCompleted && !data.isCompleted === false) {
      throw new AppError('Cannot update a completed study session', 400);
    }

    // Validar dados específicos
    if (data.questionsAnswered !== undefined && data.questionsAnswered < 0) {
      throw new AppError('Questions answered cannot be negative');
    }

    if (data.correctAnswers !== undefined && data.correctAnswers < 0) {
      throw new AppError('Correct answers cannot be negative');
    }

    if (data.incorrectAnswers !== undefined && data.incorrectAnswers < 0) {
      throw new AppError('Incorrect answers cannot be negative');
    }

    if (
      data.focusScore !== undefined &&
      data.focusScore !== null &&
      (data.focusScore < 0 || data.focusScore > 100)
    ) {
      throw new AppError('Focus score must be between 0 and 100');
    }

    // Atualizar sessão de estudo
    const updatedSession = await this.studySessionRepository.update(id, userId, data);

    return updatedSession;
  }
}
