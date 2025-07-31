import { Request, Response, NextFunction } from 'express';
import { MentorshipServiceFactory } from '../factories';
import { CreateMentorshipMeetingPayload, MeetingType, MentorshipStatus } from '../types';
import AppError from '../../../utils/AppError';
import { mentorshipLogger } from '../utils/loggerAdapter';

/**
 * Controller para gerenciar reuniões de mentoria
 */
export class MentorshipMeetingController {
  private meetingService;
  private mentorshipService;

  constructor(factory: MentorshipServiceFactory) {
    this.meetingService = factory.getMentorshipMeetingService();
    this.mentorshipService = factory.getMentorshipService();
  }

  /**
   * Cria uma nova reunião
   */
  createMeeting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const {
        mentorshipId,
        scheduledDate,
        duration,
        meetingType,
        meetingLink,
        meetingLocation,
        agenda,
      } = req.body;

      // Verificar se a mentoria existe
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);

      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      // Verificar se o usuário é o mentor ou mentorado da mentoria
      if (mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Apenas mentor ou mentorado podem criar reuniões', 403);
      }

      // Verificar se a mentoria está ativa
      if (mentorship.status !== MentorshipStatus.ACTIVE) {
        throw new AppError('Só é possível criar reuniões para mentorias ativas', 400);
      }

      const meetingData: CreateMentorshipMeetingPayload = {
        mentorshipId,
        scheduledDate: new Date(scheduledDate),
        duration,
        meetingType: meetingType as MeetingType,
        meetingLink,
        meetingLocation,
        agenda: Array.isArray(agenda) ? agenda.join('; ') : String(agenda ?? ''),
      };

      const meeting = await this.meetingService.createMeeting(meetingData);

      return res.status(201).json({
        success: true,
        data: meeting,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao criar reunião', error);
      next(error);
      return;
    }
  };

  /**
   * Obtém uma reunião pelo ID
   */
  getMeeting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('ID da reunião é obrigatório', 400);
      }

      const meeting = await this.meetingService.getMeetingById(id);

      if (!meeting) {
        throw new AppError('Reunião não encontrada', 404);
      }

      // Verificar se o usuário é o mentor ou mentorado da mentoria associada
      const mentorship = await this.mentorshipService.getMentorshipById(meeting.mentorshipId);

      if (!mentorship) {
        throw new AppError('Mentoria associada não encontrada', 404);
      }

      const userId = req.user?.id;
      if (userId && mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado a esta reunião', 403);
      }

      return res.status(200).json({
        success: true,
        data: meeting,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar reunião', error);
      next(error);
      return;
    }
  };

  /**
   * Lista reuniões de uma mentoria
   */
  getMeetingsByMentorship = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mentorshipId } = req.params;

      if (!mentorshipId) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      // Verificar se a mentoria existe
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);

      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      // Verificar se o usuário é o mentor ou mentorado da mentoria
      const userId = req.user?.id;
      if (userId && mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado às reuniões desta mentoria', 403);
      }

      const meetings = await this.meetingService.getMeetingsByMentorship(mentorshipId);

      return res.status(200).json({
        success: true,
        data: meetings,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar reuniões', error);
      next(error);
      return;
    }
  };

  /**
   * Lista próximas reuniões de uma mentoria
   */
  getUpcomingMeetings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mentorshipId } = req.params;

      if (!mentorshipId) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      // Verificar se a mentoria existe
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);

      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      // Verificar se o usuário é o mentor ou mentorado da mentoria
      const userId = req.user?.id;
      if (userId && mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado às reuniões desta mentoria', 403);
      }

      const meetings = await this.meetingService.getUpcomingMeetings(mentorshipId);

      return res.status(200).json({
        success: true,
        data: meetings,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar próximas reuniões', error);
      next(error);
      return;
    }
  };

  /**
   * Completa uma reunião
   */
  completeMeeting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { actualDate, actualDuration, notes, mentorFeedback, studentFeedback } = req.body;

      if (!id) {
        throw new AppError('ID da reunião é obrigatório', 400);
      }

      if (!actualDate || !actualDuration) {
        throw new AppError('Data e duração real da reunião são obrigatórios', 400);
      }

      // Verificar se a reunião existe
      const meeting = await this.meetingService.getMeetingById(id);

      if (!meeting) {
        throw new AppError('Reunião não encontrada', 404);
      }

      // Verificar se o usuário é o mentor ou mentorado da mentoria associada
      const mentorship = await this.mentorshipService.getMentorshipById(meeting.mentorshipId);

      if (!mentorship) {
        throw new AppError('Mentoria associada não encontrada', 404);
      }

      const userId = req.user?.id;
      if (userId && mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado a esta reunião', 403);
      }

      const updatedMeeting = await this.meetingService.completeMeeting(
        id,
        new Date(actualDate),
        actualDuration,
        notes,
        mentorFeedback,
        studentFeedback,
      );

      return res.status(200).json({
        success: true,
        data: updatedMeeting,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao completar reunião', error);
      next(error);
      return;
    }
  };

  /**
   * Cancela uma reunião
   */
  cancelMeeting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        throw new AppError('ID da reunião é obrigatório', 400);
      }

      // Verificar se a reunião existe
      const meeting = await this.meetingService.getMeetingById(id);

      if (!meeting) {
        throw new AppError('Reunião não encontrada', 404);
      }

      // Verificar se o usuário é o mentor ou mentorado da mentoria associada
      const mentorship = await this.mentorshipService.getMentorshipById(meeting.mentorshipId);

      if (!mentorship) {
        throw new AppError('Mentoria associada não encontrada', 404);
      }

      const userId = req.user?.id;
      if (userId && mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado a esta reunião', 403);
      }

      const updatedMeeting = await this.meetingService.cancelMeeting(id, reason);

      return res.status(200).json({
        success: true,
        data: updatedMeeting,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao cancelar reunião', error);
      next(error);
      return;
    }
  };

  /**
   * Reagenda uma reunião
   */
  rescheduleMeeting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const {
        newDate,
        newDuration,
        newMeetingType,
        newMeetingLink,
        newMeetingLocation,
        newAgenda,
        reason,
      } = req.body;

      if (!id || !newDate) {
        throw new AppError('ID da reunião e nova data são obrigatórios', 400);
      }

      // Verificar se a reunião existe
      const meeting = await this.meetingService.getMeetingById(id);

      if (!meeting) {
        throw new AppError('Reunião não encontrada', 404);
      }

      // Verificar se o usuário é o mentor ou mentorado da mentoria associada
      const mentorship = await this.mentorshipService.getMentorshipById(meeting.mentorshipId);

      if (!mentorship) {
        throw new AppError('Mentoria associada não encontrada', 404);
      }

      const userId = req.user?.id;
      if (userId && mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado a esta reunião', 403);
      }

      const updatedMeeting = await this.meetingService.rescheduleMeeting(
        id,
        new Date(newDate),
        newDuration,
        newMeetingType,
        newMeetingLink,
        newMeetingLocation,
        newAgenda,
        reason,
      );

      return res.status(200).json({
        success: true,
        data: updatedMeeting,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao reagendar reunião', error);
      next(error);
      return;
    }
  };

  /**
   * Adiciona anotações a uma reunião
   */
  addNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (!id || !notes) {
        throw new AppError('ID da reunião e anotações são obrigatórios', 400);
      }

      // Verificar se a reunião existe
      const meeting = await this.meetingService.getMeetingById(id);

      if (!meeting) {
        throw new AppError('Reunião não encontrada', 404);
      }

      // Verificar se o usuário é o mentor ou mentorado da mentoria associada
      const mentorship = await this.mentorshipService.getMentorshipById(meeting.mentorshipId);

      if (!mentorship) {
        throw new AppError('Mentoria associada não encontrada', 404);
      }

      const userId = req.user?.id;
      if (userId && mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado a esta reunião', 403);
      }

      const updatedMeeting = await this.meetingService.addNotes(id, notes);

      return res.status(200).json({
        success: true,
        data: updatedMeeting,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao adicionar anotações', error);
      next(error);
      return;
    }
  };
}
