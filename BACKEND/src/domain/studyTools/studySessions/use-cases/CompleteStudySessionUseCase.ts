import { IStudySessionRepository } from '../repositories/IStudySessionRepository';
import { StudySession, CompleteStudySessionDTO } from '../types/studySession.types';
import { AppError } from '../../../../shared/errors/AppError';

export class CompleteStudySessionUseCase {
  constructor(private studySessionRepository: IStudySessionRepository) {}

  async execute(id: string, userId: string, data?: CompleteStudySessionDTO): Promise<StudySession> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Study session ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
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
    if (existingSession.isCompleted) {
      throw new AppError('Study session is already completed', 400);
    }

    // Validar dados específicos
    if (data?.focusScore !== undefined && (data.focusScore < 0 || data.focusScore > 100)) {
      throw new AppError('Focus score must be between 0 and 100');
    }

    // Preparar dados para atualização
    const updateData = {
      isCompleted: true,
      endTime: data?.endTime || new Date(),
      notes: data?.notes,
      mood: data?.mood,
      difficulty: data?.difficulty,
      focusScore: data?.focusScore,
    };

    // Completar sessão de estudo
    const completedSession = await this.studySessionRepository.complete(id, userId, updateData);

    return completedSession;
  }
}
