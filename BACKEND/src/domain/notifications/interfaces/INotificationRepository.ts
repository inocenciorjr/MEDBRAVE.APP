import {
  Notification,
  NotificationType,
  NotificationPriority,
  CreateNotificationPayload,
} from '../types';

/**
 * Interface para o repositório de notificações
 */
export interface INotificationRepository {
  /**
   * Cria uma nova notificação
   */
  create(notification: Notification): Promise<Notification>;

  /**
   * Encontra uma notificação pelo ID
   */
  findById(id: string): Promise<Notification | null>;

  /**
   * Encontra notificações de um usuário
   */
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Notification[]>;

  /**
   * Atualiza uma notificação
   */
  update(notification: Notification): Promise<Notification>;

  /**
   * Exclui uma notificação
   */
  delete(id: string): Promise<void>;

  /**
   * Exclui todas as notificações de um usuário
   */
  deleteAll(userId: string): Promise<number>;

  /**
   * Exclui notificações expiradas
   */
  deleteExpired(): Promise<number>;

  /**
   * Marca todas as notificações de um usuário como lidas
   */
  markAllAsRead(userId: string): Promise<void>;

  /**
   * Conta notificações não lidas de um usuário
   */
  getUnreadCount(userId: string): Promise<number>;

  /**
   * Encontra notificações não lidas por tipo e prioridade
   */
  findUnreadByTypeAndPriority(
    userId: string,
    type: NotificationType,
    priority: NotificationPriority,
    limit?: number,
  ): Promise<Notification[]>;

  /**
   * Cria múltiplas notificações para diferentes usuários
   */
  createMultiple(
    userIds: string[],
    notificationData: Omit<CreateNotificationPayload, 'userId'>,
  ): Promise<number>;
}
