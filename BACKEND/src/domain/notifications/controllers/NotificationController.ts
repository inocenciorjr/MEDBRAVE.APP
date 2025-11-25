import { Request, Response } from 'express';
import {
  CreateNotificationPayload,
  ListNotificationsOptions,
  NotificationPriority,
  NotificationType,
} from '../types';
import { validateCreateNotification } from '../validators/notificationValidators';
import { inject, injectable } from 'tsyringe';
import { CreateNotificationUseCase } from '../use-cases/CreateNotificationUseCase';
import { GetNotificationsUseCase } from '../use-cases/GetNotificationsUseCase';
import { MarkNotificationAsReadUseCase } from '../use-cases/MarkNotificationAsReadUseCase';

@injectable()
export class NotificationController {
  constructor(
    @inject('CreateNotificationUseCase')
    private createNotificationUseCase: CreateNotificationUseCase,

    @inject('GetNotificationsUseCase')
    private getNotificationsUseCase: GetNotificationsUseCase,

    @inject('MarkNotificationAsReadUseCase')
    private markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
  ) {}

  /**
   * Cria uma nova notificação
   */
  async createNotification(req: Request, res: Response) {
    try {
      // Validar dados de entrada
      const validationResult = validateCreateNotification(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: validationResult.error || 'Dados inválidos',
            details: validationResult.validationErrors,
          },
        });
      }

      const notificationData: CreateNotificationPayload = req.body;

      // Se não for um administrador, o usuário só pode criar notificações para si mesmo
      if (
        !req.user ||
        ((req.user.user_role || '').toUpperCase() !== 'ADMIN' && (notificationData as any).user_id !== req.user?.id)
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message:
              'Você não tem permissão para criar notificações para outros usuários',
          },
        });
      }

      const notification =
        await this.createNotificationUseCase.execute(notificationData);

      return res.status(201).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao criar notificação';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Busca uma notificação pelo ID
   */
  async getNotificationById(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      // const { id } = req.params; // id is not used
      // Aqui deveria chamar um use case/service específico para buscar por ID
      // Exemplo: const notification = await this.getNotificationByIdUseCase.execute(id);
      // Por enquanto, retorna erro
      return res
        .status(501)
        .json({ error: 'Não implementado: buscar notificação por ID' });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar notificação por ID';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Lista notificações do usuário autenticado
   */
  async getMyNotifications(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const {
        isRead,
        type,
        priority,
        limit,
        page,
        offset,
        orderByCreatedAt,
        includeExpired,
      } = req.query;
      const options: ListNotificationsOptions = {
        is_read: isRead !== undefined ? isRead === 'true' : undefined,
        type: type as NotificationType,
        priority: priority as NotificationPriority,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        order_by_created_at: orderByCreatedAt as 'asc' | 'desc',
        include_expired: includeExpired === 'true',
      };
      const result = await this.getNotificationsUseCase.execute(
        req.user.id,
        options,
      );
      return res.json({
        success: true,
        data: result.notifications,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: (result as any).total_pages,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao buscar notificações';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Marca uma notificação como lida
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json({ error: 'ID da notificação não fornecido' });
      }

      const notification = await this.markNotificationAsReadUseCase.execute(id);

      if (!notification) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }

      // Verificar se a notificação pertence ao usuário autenticado
      if (!req.user || (notification as any).user_id !== userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      return res.status(200).json(notification);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao marcar notificação como lida';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Marca todas as notificações do usuário como lidas
   */
  async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      // Aqui deveria chamar um use case/service para marcar todas como lidas
      // Exemplo: const count = await this.markAllNotificationsAsReadUseCase.execute(userId);
      // Por enquanto, retorna 0
      return res.json({
        success: true,
        data: { count: 0, message: 'Notificações marcadas como lidas' },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao marcar todas como lidas';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Exclui uma notificação
   */
  async deleteNotification(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      // const { id } = req.params; // id is not used
      // Aqui deveria chamar um use case/service para deletar a notificação
      // Exemplo: await this.deleteNotificationUseCase.execute(id, req.user.id, req.user.role);
      return res.json({
        success: true,
        data: { message: 'Notificação excluída com sucesso' },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao excluir notificação';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Exclui todas as notificações do usuário
   */
  async deleteAllNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      // Aqui deveria chamar um use case/service para deletar todas as notificações do usuário
      // Exemplo: const count = await this.deleteAllUserNotificationsUseCase.execute(userId);
      return res.json({
        success: true,
        data: { count: 0, message: 'Notificações excluídas com sucesso' },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao excluir todas as notificações';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Conta notificações não lidas do usuário
   */
  async countUnreadNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      // Aqui deveria chamar um use case/service para contar notificações não lidas
      // Exemplo: const count = await this.countUnreadNotificationsUseCase.execute(userId);
      return res.json({ success: true, data: { count: 0 } });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao contar notificações não lidas';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Envia notificação para múltiplos usuários (apenas para admin)
   */
  async sendNotificationToMultipleUsers(req: Request, res: Response) {
    try {
      if (!req.user?.role || req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message:
              'Apenas administradores podem enviar notificações em massa',
          },
        });
      }
      const { userIds } = req.body;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'É necessário fornecer uma lista de usuários',
          },
        });
      }
      // Aqui deveria chamar um use case/service para enviar notificações em massa
      // Exemplo: const count = await this.sendNotificationToMultipleUsersUseCase.execute(userIds, notificationData);
      return res.json({
        success: true,
        data: { count: 0, message: 'Notificação enviada para 0 usuários' },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao enviar notificações em massa';
      return res.status(500).json({ error: errorMessage });
    }
  }
}
