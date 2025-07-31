import {
  CreateNotificationPayload,
  ListNotificationsOptions,
  Notification,
  PaginatedNotificationsResult,
  UpdateNotificationPayload,
  NotificationType,
  NotificationPriority,
} from '../types';

/**
 * Interface para o serviço de notificações
 */
export interface INotificationService {
  /**
   * Cria uma nova notificação
   * @param data Dados da notificação
   */
  createNotification(data: CreateNotificationPayload): Promise<Notification>;

  /**
   * Busca uma notificação pelo ID
   * @param notificationId ID da notificação
   */
  getNotificationById(notificationId: string): Promise<Notification | null>;

  /**
   * Busca notificações por ID de usuário com opções de filtro
   * @param userId ID do usuário
   * @param options Opções de filtro
   */
  getUserNotifications(
    userId: string,
    options?: ListNotificationsOptions,
  ): Promise<PaginatedNotificationsResult>;

  /**
   * Marca uma notificação como lida
   * @param notificationId ID da notificação
   */
  markNotificationAsRead(notificationId: string): Promise<Notification | null>;

  /**
   * Marca todas as notificações de um usuário como lidas
   * @param userId ID do usuário
   */
  markAllNotificationsAsRead(userId: string): Promise<number>;

  /**
   * Atualiza uma notificação existente
   * @param notificationId ID da notificação
   * @param updates Dados para atualização
   */
  updateNotification(
    notificationId: string,
    updates: UpdateNotificationPayload,
  ): Promise<Notification | null>;

  /**
   * Exclui uma notificação
   * @param notificationId ID da notificação
   */
  deleteNotification(notificationId: string): Promise<void>;

  /**
   * Exclui todas as notificações de um usuário
   * @param userId ID do usuário
   */
  deleteAllUserNotifications(userId: string): Promise<number>;

  /**
   * Limpa notificações expiradas do sistema
   */
  cleanupExpiredNotifications(): Promise<number>;

  /**
   * Envia notificação para múltiplos usuários
   * @param userIds Lista de IDs de usuários
   * @param notificationData Dados da notificação
   */
  sendNotificationToMultipleUsers(
    userIds: string[],
    notificationData: Omit<CreateNotificationPayload, 'userId'>,
  ): Promise<number>;

  /**
   * Conta notificações não lidas de um usuário
   * @param userId ID do usuário
   */
  countUnreadNotifications(userId: string): Promise<number>;

  /**
   * Busca notificações não lidas por tipo e prioridade
   * @param userId ID do usuário
   * @param type Tipo da notificação
   * @param priority Prioridade da notificação
   * @param limit Limite de resultados
   */
  getUnreadNotificationsByTypeAndPriority(
    userId: string,
    type: NotificationType,
    priority: NotificationPriority,
    limit?: number,
  ): Promise<Notification[]>;
}
