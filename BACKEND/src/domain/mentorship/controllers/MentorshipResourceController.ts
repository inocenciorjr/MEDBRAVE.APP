import { Request, Response, NextFunction } from 'express';
import { MentorshipServiceFactory } from '../factories';
import { CreateMentorshipResourcePayload, ResourceType } from '../types';
import AppError from '../../../utils/AppError';
import { mentorshipLogger } from '../utils/loggerAdapter';

/**
 * Controller para gerenciar recursos de mentoria
 */
export class MentorshipResourceController {
  private resourceService;
  private mentorshipService;

  constructor(factory: MentorshipServiceFactory) {
    this.resourceService = factory.getMentorshipResourceService();
    this.mentorshipService = factory.getMentorshipService();
  }

  /**
   * Cria um novo recurso
   */
  createResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const { mentorshipId, title, type, url, description } = req.body;

      // Verificar se a mentoria existe e se o usuário tem acesso
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      if (mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado a esta mentoria', 403);
      }

      const resourceData: CreateMentorshipResourcePayload = {
        mentorshipId,
        addedByUserId: userId,
        title,
        type: type as ResourceType,
        url,
        description,
      };

      const resource = await this.resourceService.createResource(resourceData);

      return res.status(201).json({
        success: true,
        data: resource,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao criar recurso', error);
      next(error);
    }
  };

  /**
   * Obtém um recurso pelo ID
   */
  getResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const resource = await this.resourceService.getResourceById(id);
      if (!resource) {
        throw new AppError('Recurso não encontrado', 404);
      }

      return res.status(200).json({
        success: true,
        data: resource,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar recurso', error);
      next(error);
    }
  };

  /**
   * Lista recursos de uma mentoria
   */
  getResourcesByMentorship = async (req: Request, res: Response, next: NextFunction) => {
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

      const resources = await this.resourceService.getResourcesByMentorship(mentorshipId);

      return res.status(200).json({
        success: true,
        data: resources,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar recursos', error);
      next(error);
    }
  };

  /**
   * Lista recursos por tipo
   */
  getResourcesByType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { mentorshipId, type } = req.params;

      // Verificar acesso à mentoria
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError('Mentoria não encontrada', 404);
      }

      if (userId && mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
        throw new AppError('Acesso não autorizado', 403);
      }

      const resources = await this.resourceService.getResourcesByType(
        mentorshipId,
        type as ResourceType
      );

      return res.status(200).json({
        success: true,
        data: resources,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar recursos por tipo', error);
      next(error);
    }
  };

  /**
   * Lista recursos adicionados pelo usuário
   */
  getMyResources = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const resources = await this.resourceService.getResourcesAddedByUser(userId);

      return res.status(200).json({
        success: true,
        data: resources,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao listar meus recursos', error);
      next(error);
    }
  };

  /**
   * Atualiza um recurso
   */
  updateResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const updateData = req.body;

      // Verificar se o recurso pertence ao usuário
      const existingResource = await this.resourceService.getResourceById(id);
      if (!existingResource) {
        throw new AppError('Recurso não encontrado', 404);
      }

      if (existingResource.addedByUserId !== userId) {
        throw new AppError('Você só pode editar seus próprios recursos', 403);
      }

      const resource = await this.resourceService.updateResource(id, updateData);

      return res.status(200).json({
        success: true,
        data: resource,
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar recurso', error);
      next(error);
    }
  };

  /**
   * Deleta um recurso
   */
  deleteResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      // Verificar se o recurso pertence ao usuário
      const existingResource = await this.resourceService.getResourceById(id);
      if (!existingResource) {
        throw new AppError('Recurso não encontrado', 404);
      }

      if (existingResource.addedByUserId !== userId) {
        throw new AppError('Você só pode deletar seus próprios recursos', 403);
      }

      await this.resourceService.deleteResource(id);

      return res.status(200).json({
        success: true,
        message: 'Recurso deletado com sucesso',
      });
    } catch (error) {
      mentorshipLogger.error('Erro ao deletar recurso', error);
      next(error);
    }
  };
}
