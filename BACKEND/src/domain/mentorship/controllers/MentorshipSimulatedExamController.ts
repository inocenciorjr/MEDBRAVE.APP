import { Request, Response, NextFunction } from 'express';
import { MentorshipServiceFactory } from '../factories';
import { CreateMentorshipSimulatedExamPayload } from '../types';
import AppError from '../../../utils/AppError';
import { mentorshipLogger } from '../utils/loggerAdapter';

/**
 * Controller para gerenciar simulados de mentoria
 */
export class MentorshipSimulatedExamController {
  private simulatedExamService;
  private mentorshipService;

  constructor(factory: MentorshipServiceFactory) {
    this.simulatedExamService = factory.getMentorshipSimulatedExamService();
    this.mentorshipService = factory.getMentorshipService();
  }

  /**
   * Atribui um simulado a uma mentoria
   */
  assignSimulatedExam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const { mentorshipId, simulatedExamId, dueDate } = req.body;

      // Verificar se a mentoria existe e se o usuário é o mentor
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      if (mentorship.mentorId !== userId) {
        throw new AppError('Apenas o mentor pode atribuir simulados', 403);
      }

      const examData: CreateMentorshipSimulatedExamPayload = {
        mentorshipId,
        simulatedExamId,
        assignedByUserId: userId,
        dueDate: dueDate ? new Date(dueDate) : null,
      };

      const exam = await this.simulatedExamService.assignSimulatedExam(examData);

      return res.status(201).json({
        success: true,
        data: exam,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao atribuir simulado', error);
      next(error);
    }
  };

  /**
   * Obtém um simulado pelo ID
   */
  getSimulatedExam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const exam = await this.simulatedExamService.getSimulatedExamById(id);
      if (!exam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      return res.status(200).json({
        success: true,
        data: exam,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar simulado', error);
      next(error);
    }
  };

  /**
   * Lista simulados de uma mentoria
   */
  getSimulatedExamsByMentorship = async (req: Request, res: Response, next: NextFunction) => {
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

      const exams = await this.simulatedExamService.getSimulatedExamsByMentorship(mentorshipId);

      return res.status(200).json({
        success: true,
        data: exams,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar simulados', error);
      next(error);
    }
  };

  /**
   * Lista simulados pendentes de uma mentoria
   */
  getPendingSimulatedExams = async (req: Request, res: Response, next: NextFunction) => {
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

      const exams = await this.simulatedExamService.getPendingSimulatedExams(mentorshipId);

      return res.status(200).json({
        success: true,
        data: exams,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar simulados pendentes', error);
      next(error);
    }
  };

  /**
   * Lista simulados atribuídos pelo usuário (mentor)
   */
  getMyAssignedExams = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const exams = await this.simulatedExamService.getSimulatedExamsAssignedByUser(userId);

      return res.status(200).json({
        success: true,
        data: exams,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar simulados atribuídos', error);
      next(error);
    }
  };

  /**
   * Marca um simulado como concluído
   */
  completeSimulatedExam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { score } = req.body;

      if (typeof score !== 'number' || score < 0 || score > 100) {
        throw new AppError('Score deve ser um número entre 0 e 100', 400);
      }

      // Verificar se o simulado existe
      const existingExam = await this.simulatedExamService.getSimulatedExamById(id);
      if (!existingExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar se o usuário é o mentorado da mentoria
      const mentorship = await this.mentorshipService.getMentorshipById(existingExam.mentorshipId);
      if (!mentorship || mentorship.menteeId !== userId) {
        throw new AppError('Apenas o mentorado pode completar o simulado', 403);
      }

      const exam = await this.simulatedExamService.completeSimulatedExam(id, score);

      return res.status(200).json({
        success: true,
        data: exam,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao completar simulado', error);
      next(error);
    }
  };

  /**
   * Atualiza um simulado
   */
  updateSimulatedExam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const updateData = req.body;

      // Verificar se o simulado existe
      const existingExam = await this.simulatedExamService.getSimulatedExamById(id);
      if (!existingExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar se o usuário é o mentor que atribuiu
      if (existingExam.assignedByUserId !== userId) {
        throw new AppError('Apenas o mentor que atribuiu pode editar', 403);
      }

      const exam = await this.simulatedExamService.updateSimulatedExam(id, updateData);

      return res.status(200).json({
        success: true,
        data: exam,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar simulado', error);
      next(error);
    }
  };

  /**
   * Remove um simulado
   */
  removeSimulatedExam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      // Verificar se o simulado existe
      const existingExam = await this.simulatedExamService.getSimulatedExamById(id);
      if (!existingExam) {
        throw new AppError('Simulado não encontrado', 404);
      }

      // Verificar se o usuário é o mentor que atribuiu
      if (existingExam.assignedByUserId !== userId) {
        throw new AppError('Apenas o mentor que atribuiu pode remover', 403);
      }

      await this.simulatedExamService.removeSimulatedExam(id);

      return res.status(200).json({
        success: true,
        message: 'Simulado removido com sucesso',
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao remover simulado', error);
      next(error);
    }
  };
}
