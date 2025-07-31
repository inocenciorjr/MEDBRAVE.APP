import { IStudySessionRepository } from '../repositories/IStudySessionRepository';
import { AppError } from '../../../../shared/errors/AppError';

export class DeleteStudySessionUseCase {
  constructor(private studySessionRepository: IStudySessionRepository) {}

  async execute(id: string, userId: string): Promise<void> {
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

    // Excluir sessão de estudo
    await this.studySessionRepository.delete(id, userId);
  }
}
