import { inject, injectable } from 'tsyringe';
import { INotificationService } from '../interfaces/INotificationService';
import { INotificationRepository } from '../interfaces/INotificationRepository';
import {
  CreateNotificationPayload,
  Notification,
  NotificationPriority,
  NotificationType,
  ListNotificationsOptions,
  PaginatedNotificationsResult,
  UpdateNotificationPayload,
} from '../types';

/**
 * Serviu00e7o de gerenciamento de notificau00e7u00f5es
 * Implementau00e7u00e3o usando Firebase Firestore
 */
@injectable()
export class FirebaseNotificationService implements INotificationService {
  constructor(
    @inject('NotificationRepository')
    private notificationRepository?: INotificationRepository,
  ) {}

  /**
   * Cria uma nova notificau00e7u00e3o
   */
  async createNotification(data: CreateNotificationPayload): Promise<Notification> {
    const notification: Notification = {
      id: '', // Será gerado pelo repositório
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || NotificationType.GENERAL,
      priority: data.priority || NotificationPriority.NORMAL,
      read: false,
      data: data.data || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    return this.notificationRepository.create(notification);
  }

  /**
   * Busca uma notificau00e7u00e3o pelo ID
   */
  async getNotificationById(notificationId: string): Promise<Notification | null> {
    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    return this.notificationRepository.findById(notificationId);
  }

  /**
   * Busca notificau00e7u00f5es por ID de usuu00e1rio com opu00e7u00f5es de filtro
   */
  async getUserNotifications(
    userId: string,
    options: ListNotificationsOptions = {},
  ): Promise<PaginatedNotificationsResult> {
    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    const notifications = await this.notificationRepository.findByUserId(
      userId,
      options.limit || 10,
      options.offset || 0,
    );
    const total = notifications.length;
    const limit = options.limit || total;
    const page = options.page || 1;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    return {
      notifications,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Marca uma notificau00e7u00e3o como lida
   */
  async markNotificationAsRead(notificationId: string): Promise<Notification | null> {
    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    const notification = await this.notificationRepository.findById(notificationId);

    if (!notification) {
      return null;
    }

    notification.read = true;
    notification.updatedAt = new Date();

    return this.notificationRepository.update(notification);
  }

  /**
   * Marca todas as notificau00e7u00f5es de um usuu00e1rio como lidas
   */
  async markAllNotificationsAsRead(userId: string): Promise<number> {
    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    await this.notificationRepository.markAllAsRead(userId);
    return -1;
  }

  /**
   * Atualiza uma notificau00e7u00e3o existente
   */
  async updateNotification(
    notificationId: string,
    updates: UpdateNotificationPayload,
  ): Promise<Notification | null> {
    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    const notification = await this.notificationRepository.findById(notificationId);

    if (!notification) {
      return null;
    }

    const updatedNotification = { ...notification, ...updates, updatedAt: new Date() };

    return this.notificationRepository.update(updatedNotification);
  }

  /**
   * Exclui uma notificau00e7u00e3o
   */
  async deleteNotification(notificationId: string): Promise<void> {
    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    return this.notificationRepository.delete(notificationId);
  }

  /**
   * Exclui todas as notificau00e7u00f5es de um usuu00e1rio
   */
  async deleteAllUserNotifications(userId: string): Promise<number> {
    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    return this.notificationRepository.deleteAll(userId);
  }

  /**
   * Limpa notificau00e7u00f5es expiradas do sistema
   */
  async cleanupExpiredNotifications(): Promise<number> {
    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    return this.notificationRepository.deleteExpired();
  }

  /**
   * Envia notificau00e7u00e3o para mu00faltiplos usuu00e1rios
   */
  async sendNotificationToMultipleUsers(
    userIds: string[],
    notificationData: Omit<CreateNotificationPayload, 'userId'>,
  ): Promise<number> {
    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    return this.notificationRepository.createMultiple(userIds, notificationData);
  }

  /**
   * Conta notificau00e7u00f5es nu00e3o lidas de um usuu00e1rio
   */
  async countUnreadNotifications(userId: string): Promise<number> {
    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    return this.notificationRepository.getUnreadCount(userId);
  }

  /**
   * Busca notificau00e7u00f5es nu00e3o lidas por tipo e prioridade
   */
  async getUnreadNotificationsByTypeAndPriority(
    userId: string,
    type: NotificationType,
    priority: NotificationPriority,
    limit = 5,
  ): Promise<Notification[]> {
    if (!this.notificationRepository) throw new Error('NotificationRepository não definido');
    return this.notificationRepository.findUnreadByTypeAndPriority(userId, type, priority, limit);
  }
}
