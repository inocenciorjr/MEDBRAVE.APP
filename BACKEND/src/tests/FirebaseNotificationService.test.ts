import { FirebaseNotificationService } from '../domain/notifications/services/FirebaseNotificationService';
import { INotificationRepository } from '../domain/notifications/interfaces/INotificationRepository';
import {
  CreateNotificationPayload,
  Notification,
  NotificationPriority,
  NotificationType,
} from '../domain/notifications/types';

// Mock do NotificationRepository
const mockNotificationRepository: INotificationRepository = {
  create: jest.fn(async (notification) => ({ ...notification, id: notification.id || 'test-notification-id' })),
  findById: jest.fn(async () => null),
  findByUserId: jest.fn(async () => []),
  update: jest.fn(async (notification) => notification),
  delete: jest.fn(async () => {}),
  deleteAll: jest.fn(async () => 0),
  deleteExpired: jest.fn(async () => 0),
  markAllAsRead: jest.fn(async () => {}),
  getUnreadCount: jest.fn(async () => 0),
  findUnreadByTypeAndPriority: jest.fn(async () => []),
  createMultiple: jest.fn(async (userIds) => userIds.length),
};

describe('FirebaseNotificationService', () => {
  let service: FirebaseNotificationService;
  const userId = 'test-user-id';
  const notificationId = 'test-notification-id';

  beforeEach(() => {
    service = new FirebaseNotificationService(mockNotificationRepository);
  });

  describe('createNotification', () => {
    it('deve criar uma notificação corretamente', async () => {
      const payload: CreateNotificationPayload = {
        userId,
        type: NotificationType.SYSTEM,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: NotificationPriority.NORMAL,
      };

      (mockNotificationRepository.create as jest.Mock).mockResolvedValueOnce({
        id: notificationId,
        ...payload,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createNotification(payload);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.SYSTEM,
          title: 'Test Notification',
          message: 'This is a test notification',
          priority: NotificationPriority.NORMAL,
        }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: notificationId,
          ...payload,
          read: false,
        }),
      );
    });
  });

  describe('getNotificationById', () => {
    it('deve retornar uma notificação quando ela existir', async () => {
      const mockNotification: Notification = {
        id: notificationId,
        userId,
        type: NotificationType.SYSTEM,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: NotificationPriority.NORMAL,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockNotificationRepository.findById as jest.Mock).mockResolvedValueOnce(mockNotification);

      const result = await service.getNotificationById(notificationId);

      expect(mockNotificationRepository.findById).toHaveBeenCalledWith(notificationId);
      expect(result).toEqual(mockNotification);
    });

    it('deve retornar null quando a notificação não existir', async () => {
      const result = await service.getNotificationById(notificationId);

      expect(result).toBeNull();
    });
  });

  describe('getNotificationsByUserId', () => {
    it('deve retornar as notificações de um usuário corretamente', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 'notification-1',
          userId,
          type: NotificationType.SYSTEM,
          title: 'Test Notification 1',
          message: 'This is a test notification 1',
          priority: NotificationPriority.NORMAL,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'notification-2',
          userId,
          type: NotificationType.SYSTEM,
          title: 'Test Notification 2',
          message: 'This is a test notification 2',
          priority: NotificationPriority.NORMAL,
          read: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockNotificationRepository.findByUserId as jest.Mock).mockResolvedValueOnce(mockNotifications);

      const result = await service.getUserNotifications(userId);

      expect(result).toEqual({
        notifications: mockNotifications,
        total: 5,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('markNotificationAsRead', () => {
    it('deve marcar uma notificação como lida corretamente', async () => {
      const mockNotification: Notification = {
        id: notificationId,
        userId,
        type: NotificationType.SYSTEM,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: NotificationPriority.NORMAL,
        read: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockNotificationRepository.findById as jest.Mock).mockResolvedValueOnce(mockNotification);

      const result = await service.markNotificationAsRead(notificationId);

      expect(mockNotificationRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          read: true,
          updatedAt: expect.anything(),
        }),
      );
      expect(result).toEqual(mockNotification);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('deve marcar todas as notificações de um usuário como lidas', async () => {
      const mockNotifications = [{ ref: { update: jest.fn() } }, { ref: { update: jest.fn() } }];

      (mockNotificationRepository.findByUserId as jest.Mock).mockResolvedValueOnce(mockNotifications);

      const result = await service.markAllNotificationsAsRead(userId);

      expect(mockNotificationRepository.markAllAsRead).toHaveBeenCalled();
      expect(result).toBe(mockNotifications.length);
    });
  });

  describe('updateNotification', () => {
    it('deve atualizar uma notificação corretamente', async () => {
      const mockNotification: Notification = {
        id: notificationId,
        userId,
        type: NotificationType.SYSTEM,
        title: 'Updated Test Notification',
        message: 'This is an updated test notification',
        priority: NotificationPriority.NORMAL,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockNotificationRepository.findById as jest.Mock).mockResolvedValueOnce(mockNotification);

      const updates = {
        title: 'Updated Test Notification',
        message: 'This is an updated test notification',
        priority: NotificationPriority.NORMAL,
      };

      const result = await service.updateNotification(notificationId, updates);

      expect(mockNotificationRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updatedAt: expect.anything(),
        }),
      );
      expect(result).toEqual(mockNotification);
    });
  });

  describe('deleteNotification', () => {
    it('deve excluir uma notificação corretamente', async () => {
      await service.deleteNotification(notificationId);

      expect(mockNotificationRepository.delete).toHaveBeenCalled();
    });
  });

  describe('deleteAllNotificationsByUserId', () => {
    it('deve excluir todas as notificações de um usuário', async () => {
      const mockNotifications = [{ ref: { delete: jest.fn() } }, { ref: { delete: jest.fn() } }];

      (mockNotificationRepository.findByUserId as jest.Mock).mockResolvedValueOnce(mockNotifications);

      const result = await service.deleteAllUserNotifications(userId);

      expect(mockNotificationRepository.deleteAll).toHaveBeenCalled();
      expect(result).toBe(mockNotifications.length);
    });
  });

  describe('cleanupExpiredNotifications', () => {
    it('deve remover notificações expiradas', async () => {
      const mockNotifications = [{ ref: { delete: jest.fn() } }, { ref: { delete: jest.fn() } }];

      (mockNotificationRepository.findByUserId as jest.Mock).mockResolvedValueOnce(mockNotifications);

      const result = await service.cleanupExpiredNotifications();

      expect(mockNotificationRepository.deleteExpired).toHaveBeenCalled();
      expect(result).toBe(mockNotifications.length);
    });
  });

  describe('sendNotificationToMultipleUsers', () => {
    it('deve enviar notificações para múltiplos usuários', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const notificationData = {
        type: NotificationType.SYSTEM,
        title: 'Bulk Notification',
        message: 'This is a bulk notification',
        priority: NotificationPriority.NORMAL,
      };

      const result = await service.sendNotificationToMultipleUsers(userIds, notificationData);

      expect(mockNotificationRepository.createMultiple).toHaveBeenCalled();
      expect(result).toBe(userIds.length);
    });
  });

  describe('countUnreadNotifications', () => {
    it('deve contar notificações não lidas de um usuário', async () => {
      const result = await service.countUnreadNotifications(userId);

      expect(mockNotificationRepository.getUnreadCount).toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });
});
