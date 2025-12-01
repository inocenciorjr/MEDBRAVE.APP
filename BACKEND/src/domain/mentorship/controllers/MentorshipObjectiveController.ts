import { Request, Response, NextFunction } from 'express';
import { MentorshipServiceFactory } from '../factories';
import { CreateMentorshipObjectivePayload, ObjectiveStatus } from '../types';
import AppError from '../../../utils/AppError';
import { mentorshipLogger } from '../utils/loggerAdapter';

/**
 * Controller para gerenciar objetivos de mentoria
 */
export class MentorshipObjectiveController {
  private objectiveService;
  private mentorshipService;

  constructor(factory: MentorshipServiceFactory) {
    this.objectiveService = factory.getMentorshipObjectiveService();
    this.mentorshipService = factory.getMentorshipService();
  }

  /**
   * Cria um novo objetivo
   */
  createObjective = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const { mentorshipId, title, description, targetDate } = req.body;

      // Verificar se a mentoria existe e se o usuário tem acesso
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      if (mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado a esta mentoria', 403);
      }

      const objectiveData: CreateMentorshipObjectivePayload = {
        mentorshipId,
        title,
        description,
        targetDate: targetDate ? new Date(targetDate) : null,
      };

      const objective = await this.objectiveService.createObjective(objectiveData);

      return res.status(201).json({
        success: true,
        data: objective,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao criar objetivo', error);
      next(error);
    }
  };

  /**
   * Obtém um objetivo pelo ID
   */
  getObjective = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const objective = await this.objectiveService.getObjectiveById(id);
      if (!objective) {
        throw new AppError('Objetivo não encontrado', 404);
      }

      return res.status(200).json({
        success: true,
        data: objective,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar objetivo', error);
      next(error);
    }
  };

  /**
   * Lista objetivos de uma mentoria
   */
  getObjectivesByMentorship = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { mentorshipId } = req.params;

      // Verificar acesso à mentoria
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      if (userId && mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado', 403);
      }

      const objectives = await this.objectiveService.getObjectivesByMentorship(mentorshipId);

      return res.status(200).json({
        success: true,
        data: objectives,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar objetivos', error);
      next(error);
    }
  };

  /**
   * Atualiza um objetivo
   */
  updateObjective = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const objective = await this.objectiveService.updateObjective(id, updateData);
      if (!objective) {
        throw new AppError('Objetivo não encontrado', 404);
      }

      return res.status(200).json({
        success: true,
        data: objective,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar objetivo', error);
      next(error);
    }
  };

  /**
   * Atualiza o progresso de um objetivo
   */
  updateProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { progress } = req.body;

      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        throw new AppError('Progresso deve ser um número entre 0 e 100', 400);
      }

      const objective = await this.objectiveService.updateProgress(id, progress);
      if (!objective) {
        throw new AppError('Objetivo não encontrado', 404);
      }

      return res.status(200).json({
        success: true,
        data: objective,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar progresso', error);
      next(error);
    }
  };

  /**
   * Marca objetivo como completo
   */
  completeObjective = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const objective = await this.objectiveService.completeObjective(id);
      if (!objective) {
        throw new AppError('Objetivo não encontrado', 404);
      }

      return res.status(200).json({
        success: true,
        data: objective,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao completar objetivo', error);
      next(error);
    }
  };

  /**
   * Cancela um objetivo
   */
  cancelObjective = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const objective = await this.objectiveService.cancelObjective(id);
      if (!objective) {
        throw new AppError('Objetivo não encontrado', 404);
      }

      return res.status(200).json({
        success: true,
        data: objective,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao cancelar objetivo', error);
      next(error);
    }
  };

  /**
   * Deleta um objetivo
   */
  deleteObjective = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const deleted = await this.objectiveService.deleteObjective(id);
      if (!deleted) {
        throw new AppError('Objetivo não encontrado', 404);
      }

      return res.status(200).json({
        success: true,
        message: 'Objetivo deletado com sucesso',
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao deletar objetivo', error);
      next(error);
    }
  };
}
