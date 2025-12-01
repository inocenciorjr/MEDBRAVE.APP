import { Request, Response, NextFunction } from 'express';
import { MentorshipServiceFactory } from '../factories';
import { CreateMentorshipFeedbackPayload } from '../types';
import AppError from '../../../utils/AppError';
import { mentorshipLogger } from '../utils/loggerAdapter';

/**
 * Controller para gerenciar feedbacks de mentoria
 */
export class MentorshipFeedbackController {
  private feedbackService;
  private mentorshipService;

  constructor(factory: MentorshipServiceFactory) {
    this.feedbackService = factory.getMentorshipFeedbackService();
    this.mentorshipService = factory.getMentorshipService();
  }

  /**
   * Cria um novo feedback
   */
  createFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const { mentorshipId, toUserId, content, rating, meetingId, isAnonymous } = req.body;

      // Verificar se a mentoria existe e se o usuário tem acesso
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      if (mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado a esta mentoria', 403);
      }

      const feedbackData: CreateMentorshipFeedbackPayload = {
        mentorshipId,
        fromUserId: userId,
        toUserId,
        content,
        rating,
        meetingId,
        isAnonymous: isAnonymous ?? false,
      };

      const feedback = await this.feedbackService.createFeedback(feedbackData);

      return res.status(201).json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao criar feedback', error);
      next(error);
    }
  };

  /**
   * Obtém um feedback pelo ID
   */
  getFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const feedback = await this.feedbackService.getFeedbackById(id);
      if (!feedback) {
        throw new AppError('Feedback não encontrado', 404);
      }

      return res.status(200).json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar feedback', error);
      next(error);
    }
  };

  /**
   * Lista feedbacks de uma mentoria
   */
  getFeedbacksByMentorship = async (req: Request, res: Response, next: NextFunction) => {
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

      const feedbacks = await this.feedbackService.getFeedbacksByMentorship(mentorshipId);

      return res.status(200).json({
        success: true,
        data: feedbacks,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar feedbacks', error);
      next(error);
    }
  };

  /**
   * Lista feedbacks recebidos pelo usuário
   */
  getMyReceivedFeedbacks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const feedbacks = await this.feedbackService.getFeedbacksReceivedByUser(userId);

      return res.status(200).json({
        success: true,
        data: feedbacks,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar feedbacks recebidos', error);
      next(error);
    }
  };

  /**
   * Lista feedbacks dados pelo usuário
   */
  getMyGivenFeedbacks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const feedbacks = await this.feedbackService.getFeedbacksGivenByUser(userId);

      return res.status(200).json({
        success: true,
        data: feedbacks,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar feedbacks dados', error);
      next(error);
    }
  };

  /**
   * Obtém a média de avaliação de um usuário
   */
  getAverageRating = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const averageRating = await this.feedbackService.getAverageRatingForUser(userId);

      return res.status(200).json({
        success: true,
        data: { averageRating },
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao calcular média de avaliação', error);
      next(error);
    }
  };

  /**
   * Atualiza um feedback
   */
  updateFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const updateData = req.body;

      // Verificar se o feedback pertence ao usuário
      const existingFeedback = await this.feedbackService.getFeedbackById(id);
      if (!existingFeedback) {
        throw new AppError('Feedback não encontrado', 404);
      }

      if (existingFeedback.fromUserId !== userId) {
        throw new AppError('Você só pode editar seus próprios feedbacks', 403);
      }

      const feedback = await this.feedbackService.updateFeedback(id, updateData);

      return res.status(200).json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar feedback', error);
      next(error);
    }
  };

  /**
   * Deleta um feedback
   */
  deleteFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      // Verificar se o feedback pertence ao usuário
      const existingFeedback = await this.feedbackService.getFeedbackById(id);
      if (!existingFeedback) {
        throw new AppError('Feedback não encontrado', 404);
      }

      if (existingFeedback.fromUserId !== userId) {
        throw new AppError('Você só pode deletar seus próprios feedbacks', 403);
      }

      await this.feedbackService.deleteFeedback(id);

      return res.status(200).json({
        success: true,
        message: 'Feedback deletado com sucesso',
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao deletar feedback', error);
      next(error);
    }
  };
}
