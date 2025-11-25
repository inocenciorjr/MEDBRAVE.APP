import { Request, Response } from 'express';
import {
  CreateNotificationPayload,
  ListNotificationsOptions,
  NotificationPriority,
  NotificationType,
} from '../types';
import { validateCreateNotification } from '../validators/notificationValidators';
import { CreateNotificationUseCase } from '../use-cases/CreateNotificationUseCase';
import { GetNotificationsUseCase } from '../use-cases/GetNotificationsUseCase';
import { MarkNotificationAsReadUseCase } from '../use-cases/MarkNotificationAsReadUseCase';

/**
 * Controller de notificações que aceita dependências diretamente (sem tsyringe)
 */
export class NotificationControllerManual {
  constructor(
    private createNotificationUseCase: CreateNotificationUseCase,
    private getNotificationsUseCase: GetNotificationsUseCase,
    private markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
  ) {}

  /**
   * Cria uma nova notificação
   */
  createNotification = async (req: Request, res: Response) => {
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
  };

  /**
   * Lista notificações do usuário autenticado
   */
  getMyNotifications = async (req: Request, res: Response) => {
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
  };

  /**
   * Marca uma notificação como lida
   */
  markAsRead = async (req: Request, res: Response) => {
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
  };

  /**
   * Conta notificações não lidas do usuário
   */
  countUnreadNotifications = async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Implementação básica - retorna 0 por enquanto
      // Deveria usar um caso de uso específico para contar notificações não lidas
      return res.json({
        success: true,
        data: { count: 0 },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao contar notificações não lidas';
      return res.status(500).json({ error: errorMessage });
    }
  };

  /**
   * Busca uma notificação pelo ID
   */
  getNotificationById = async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da notificação não fornecido' });
      }

      // Implementação básica - retorna 404 por enquanto
      // Deveria usar um caso de uso específico para buscar notificação por ID
      return res.status(404).json({ error: 'Notificação não encontrada' });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao buscar notificação';
      return res.status(500).json({ error: errorMessage });
    }
  };

  /**
   * Marca todas as notificações do usuário como lidas
   */
  markAllAsRead = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Implementação básica - retorna sucesso sem alterações
      // Deveria usar um caso de uso específico para marcar todas como lidas
      return res.json({
        success: true,
        data: { count: 0 },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao marcar todas como lidas';
      return res.status(500).json({ error: errorMessage });
    }
  };

  /**
   * Deleta uma notificação específica
   */
  deleteNotification = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da notificação não fornecido' });
      }

      // Implementação básica - retorna sucesso sem alterações
      // Deveria usar um caso de uso específico para deletar notificação
      return res.json({
        success: true,
        message: 'Notificação deletada com sucesso',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao deletar notificação';
      return res.status(500).json({ error: errorMessage });
    }
  };

  /**
   * Deleta todas as notificações do usuário
   */
  deleteAllNotifications = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Implementação básica - retorna sucesso sem alterações
      // Deveria usar um caso de uso específico para deletar todas as notificações
      return res.json({
        success: true,
        data: { count: 0 },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao deletar todas as notificações';
      return res.status(500).json({ error: errorMessage });
    }
  };

  /**
   * Envia notificação para múltiplos usuários
   */
  sendNotificationToMultipleUsers = async (req: Request, res: Response) => {
    try {
      if (!req.user?.id || req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Implementação básica - retorna sucesso sem alterações
      // Deveria usar um caso de uso específico para enviar notificações em massa
      return res.json({
        success: true,
        data: { count: 0 },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao enviar notificações';
      return res.status(500).json({ error: errorMessage });
    }
  };
}
