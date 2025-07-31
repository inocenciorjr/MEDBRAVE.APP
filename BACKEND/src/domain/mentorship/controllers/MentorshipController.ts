import { Request, Response, NextFunction } from 'express';
import { MentorshipServiceFactory } from '../factories';
import {
  CreateMentorshipPayload,
  ListMentorshipsOptions,
  MentorshipStatus,
} from '../types';
import AppError from '../../../utils/AppError';
import { mentorshipLogger } from '../utils/loggerAdapter';

/**
 * Controller para gerenciar mentorias
 */
export class MentorshipController {
  private mentorshipService;
  private mentorProfileService;

  constructor(factory: MentorshipServiceFactory) {
    this.mentorshipService = factory.getMentorshipService();
    this.mentorProfileService = factory.getMentorProfileService();
  }

  /**
   * Cria uma nova mentoria
   */
  createMentorship = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menteeId = req.user?.id;
      const {
        mentorId,
        title,
        description,
        meetingFrequency,
        customFrequencyDays,
        totalMeetings,
        objectives,
        notes,
      } = req.body;

      if (!menteeId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (!mentorId) {
        throw new AppError('ID do mentor é obrigatório', 400);
      }

      // Verificar se o usuário solicitado é mentor
      const isMentor = await this.mentorProfileService.isMentor(mentorId);
      if (!isMentor) {
        throw new AppError(`Usuário com ID ${mentorId} não é um mentor`, 400);
      }

      const mentorshipData: CreateMentorshipPayload = {
        mentorId,
        menteeId,
        title,
        description,
        meetingFrequency,
        customFrequencyDays,
        totalMeetings,
        objectives,
        notes,
      };

      const mentorship = await this.mentorshipService.createMentorship(mentorshipData);

      return res.status(201).json({
        success: true,
        data: mentorship,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao criar mentoria', error);
      next(error);
      return;
    }
  };

  /**
   * Obtém uma mentoria pelo ID
   */
  getMentorship = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      const mentorship = await this.mentorshipService.getMentorshipById(id);

      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      // Se o usuário não for mentor ou mentorado da mentoria, verificar acesso
      const userId = req.user?.id;
      if (userId && mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        // Verificar se o usuário tem permissão administrativa (implementação futura)
        throw new AppError('Acesso não autorizado a esta mentoria', 403);
      }

      return res.status(200).json({
        success: true,
        data: mentorship,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar mentoria', error);
      next(error);
      return;
    }
  };

  /**
   * Lista mentorias com filtros
   */
  listMentorships = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mentorId, menteeId, status, limit = 10, page = 1, startAfter } = req.query;

      // Converter status para array se necessário
      let statusArray: MentorshipStatus[] | undefined = undefined;
      if (status) {
        if (Array.isArray(status)) {
          statusArray = status as MentorshipStatus[];
        } else {
          statusArray = [status as MentorshipStatus];
        }
      }

      const options: ListMentorshipsOptions = {
        mentorId: mentorId as string,
        menteeId: menteeId as string,
        status: statusArray,
        limit: Number(limit),
        page: Number(page),
        startAfter: startAfter as string,
      };

      const result = await this.mentorshipService.listMentorships(options);

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          nextPageStartAfter: result.nextPageStartAfter,
        },
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar mentorias', error);
      next(error);
      return;
    }
  };

  /**
   * Lista mentorias onde o usuário é mentor
   */
  listMentorshipsByMentor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mentorId = req.params.mentorId || req.user?.id;
      const { status } = req.query;

      if (!mentorId) {
        throw new AppError('ID do mentor é obrigatório', 400);
      }

      // Se o usuário não for o próprio mentor, verificar acesso
      const userId = req.user?.id;
      if (userId && mentorId !== userId) {
        // Verificar se o usuário tem permissão administrativa (implementação futura)
        throw new AppError('Acesso não autorizado a estas mentorias', 403);
      }

      // Converter status para array se necessário
      let statusArray: MentorshipStatus[] | undefined = undefined;
      if (status) {
        if (Array.isArray(status)) {
          statusArray = status as MentorshipStatus[];
        } else {
          statusArray = [status as MentorshipStatus];
        }
      }

      const mentorships = await this.mentorshipService.getMentorshipsByMentor(
        mentorId,
        statusArray,
      );

      return res.status(200).json({
        success: true,
        data: mentorships,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar mentorias por mentor', error);
      next(error);
      return;
    }
  };

  /**
   * Lista mentorias onde o usuário é mentorado
   */
  listMentorshipsByMentee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menteeId = req.params.menteeId || req.user?.id;
      const { status } = req.query;

      if (!menteeId) {
        throw new AppError('ID do mentorado é obrigatório', 400);
      }

      // Se o usuário não for o próprio mentorado, verificar acesso
      const userId = req.user?.id;
      if (userId && menteeId !== userId) {
        // Verificar se o usuário tem permissão administrativa (implementação futura)
        throw new AppError('Acesso não autorizado a estas mentorias', 403);
      }

      // Converter status para array se necessário
      let statusArray: MentorshipStatus[] | undefined = undefined;
      if (status) {
        if (Array.isArray(status)) {
          statusArray = status as MentorshipStatus[];
        } else {
          statusArray = [status as MentorshipStatus];
        }
      }

      const mentorships = await this.mentorshipService.getMentorshipsByMentee(
        menteeId,
        statusArray,
      );

      return res.status(200).json({
        success: true,
        data: mentorships,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar mentorias por mentorado', error);
      next(error);
      return;
    }
  };

  /**
   * Aceita uma mentoria pendente
   */
  acceptMentorship = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      // Verificar se o usuário é o mentor da mentoria
      const mentorship = await this.mentorshipService.getMentorshipById(id);

      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      const userId = req.user?.id;
      if (!userId || mentorship.mentorId !== userId) {
        throw new AppError('Apenas o mentor pode aceitar a mentoria', 403);
      }

      const updatedMentorship = await this.mentorshipService.acceptMentorship(id);

      return res.status(200).json({
        success: true,
        data: updatedMentorship,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao aceitar mentoria', error);
      next(error);
      return;
    }
  };

  /**
   * Cancela uma mentoria ativa ou pendente
   */
  cancelMentorship = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      // Verificar se o usuário é o mentor ou mentorado da mentoria
      const mentorship = await this.mentorshipService.getMentorshipById(id);

      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      const userId = req.user?.id;
      if (!userId || (mentorship.mentorId !== userId && mentorship.menteeId !== userId)) {
        throw new AppError('Apenas o mentor ou mentorado podem cancelar a mentoria', 403);
      }

      const updatedMentorship = await this.mentorshipService.cancelMentorship(id, reason);

      return res.status(200).json({
        success: true,
        data: updatedMentorship,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao cancelar mentoria', error);
      next(error);
      return;
    }
  };

  /**
   * Completa uma mentoria ativa
   */
  completeMentorship = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { rating, feedback } = req.body;

      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      // Verificar se o usuário é o mentor ou mentorado da mentoria
      const mentorship = await this.mentorshipService.getMentorshipById(id);

      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      const userId = req.user?.id;
      if (!userId || (mentorship.mentorId !== userId && mentorship.menteeId !== userId)) {
        throw new AppError('Apenas o mentor ou mentorado podem completar a mentoria', 403);
      }

      const updatedMentorship = await this.mentorshipService.completeMentorship(
        id,
        rating,
        feedback,
      );

      return res.status(200).json({
        success: true,
        data: updatedMentorship,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao completar mentoria', error);
      next(error);
      return;
    }
  };

  /**
   * Atualiza os objetivos de uma mentoria
   */
  updateObjectives = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { objectives } = req.body;

      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      if (!objectives || !Array.isArray(objectives)) {
        throw new AppError('Objetivos devem ser uma lista', 400);
      }

      // Verificar se o usuário é o mentor ou mentorado da mentoria
      const mentorship = await this.mentorshipService.getMentorshipById(id);

      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      const userId = req.user?.id;
      if (!userId || (mentorship.mentorId !== userId && mentorship.menteeId !== userId)) {
        throw new AppError('Apenas o mentor ou mentorado podem atualizar os objetivos', 403);
      }

      const updatedMentorship = await this.mentorshipService.updateObjectives(id, objectives);

      return res.status(200).json({
        success: true,
        data: updatedMentorship,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar objetivos da mentoria', error);
      next(error);
      return;
    }
  };
}
