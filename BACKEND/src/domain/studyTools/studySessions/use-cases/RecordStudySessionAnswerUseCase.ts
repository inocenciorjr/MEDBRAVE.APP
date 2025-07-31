import { IStudySessionRepository } from '../repositories/IStudySessionRepository';
import { RecordAnswerDTO } from '../types/studySession.types';
import { AppError } from '../../../../shared/errors/AppError';

export class RecordStudySessionAnswerUseCase {
  constructor(private studySessionRepository: IStudySessionRepository) {}

  async execute(sessionId: string, userId: string, data: RecordAnswerDTO): Promise<void> {
    // Validar parâmetros
    if (!sessionId) {
      throw new AppError('Study session ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    if (!data.questionId) {
      throw new AppError('Question ID is required');
    }

    if (data.isCorrect === undefined) {
      throw new AppError('Whether the answer is correct is required');
    }

    if (data.reviewQuality === undefined) {
      throw new AppError('Review quality is required');
    }

    // Verificar se a sessão de estudo existe e pertence ao usuário
    const existingSession = await this.studySessionRepository.findById(sessionId, userId);

    if (!existingSession) {
      throw new AppError('Study session not found', 404);
    }

    if (existingSession.userId !== userId) {
      throw new AppError('Unauthorized access to study session', 403);
    }

    // Verificar se a sessão já foi concluída
    if (existingSession.isCompleted) {
      throw new AppError('Cannot record answers on a completed study session', 400);
    }

    // Registrar resposta
    await this.studySessionRepository.recordAnswer(
      sessionId,
      userId,
      data.questionId,
      data.isCorrect,
      data.reviewQuality,
      data.selectedOptionId || null,
      data.essayResponse || null,
      data.responseTimeSeconds,
      data.questionListId || null,
    );
  }
}
