import { Request, Response, NextFunction } from 'express';
import { MentorshipServiceFactory } from '../factories';
import {
  CreateMentorProfilePayload,
  UpdateMentorProfilePayload,
} from '../types';
import AppError from '../../../utils/AppError';
import { mentorshipLogger } from '../utils/loggerAdapter';

/**
 * Controller para gerenciar perfis de mentores
 */
export class MentorProfileController {
  private mentorProfileService;

  constructor(factory: MentorshipServiceFactory) {
    this.mentorProfileService = factory.getMentorProfileService();
  }

  /**
   * Cria um novo perfil de mentor
   */
  createProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const profileData: CreateMentorProfilePayload = {
        userId,
        ...req.body,
      };

      const profile =
        await this.mentorProfileService.createMentorProfile(profileData);

      return res.status(201).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao criar perfil de mentor', error);
      next(error);
      return;
    }
  };

  /**
   * Atualiza um perfil de mentor existente
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const updateData: UpdateMentorProfilePayload = req.body;

      const profile = await this.mentorProfileService.updateMentorProfile(
        userId,
        updateData,
      );

      if (!profile) {
        throw new AppError('Perfil de mentor não encontrado', 404);
      }

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar perfil de mentor', error);
      next(error);
      return;
    }
  };

  /**
   * Obtém perfil de mentor pelo ID do usuário
   */
  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId || req.user?.id;

      if (!userId) {
        throw new AppError('ID do usuário não fornecido', 400);
      }

      const profile =
        await this.mentorProfileService.getMentorProfileByUserId(userId);

      if (!profile) {
        throw new AppError('Perfil de mentor não encontrado', 404);
      }

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar perfil de mentor', error);
      next(error);
      return;
    }
  };

  /**
   * Lista perfis de mentores com paginação
   */
  listProfiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = 10, page = 1 } = req.query;

      const result = await this.mentorProfileService.listMentorProfiles(
        Number(limit),
        Number(page),
      );

      return res.status(200).json({
        success: true,
        data: result.profiles,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar perfis de mentores', error);
      next(error);
      return;
    }
  };

  /**
   * Busca perfis de mentores por especialidade
   */
  findBySpecialty = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { specialty } = req.params;
      const { limit = 10, page = 1 } = req.query;

      if (!specialty) {
        throw new AppError('Especialidade não fornecida', 400);
      }

      const result = await this.mentorProfileService.findProfilesBySpecialty(
        specialty,
        Number(limit),
        Number(page),
      );

      return res.status(200).json({
        success: true,
        data: result.profiles,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar perfis por especialidade', error);
      next(error);
      return;
    }
  };

  /**
   * Verifica se um usuário é mentor
   */
  checkIsMentor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId || req.user?.id;

      if (!userId) {
        throw new AppError('ID do usuário não fornecido', 400);
      }

      const isMentor = await this.mentorProfileService.isMentor(userId);

      return res.status(200).json({
        success: true,
        data: { isMentor },
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao verificar se usuário é mentor', error);
      next(error);
      return;
    }
  };
}
