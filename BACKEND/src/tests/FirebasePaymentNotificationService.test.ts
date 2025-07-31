import { FirebasePaymentNotificationService } from '../domain/payment/services/FirebasePaymentNotificationService';
import {
  CreatePaymentNotificationPayload,
  PaymentNotification,
  PaymentNotificationType,
} from '../domain/payment/types';
import { Timestamp } from 'firebase-admin/firestore';

describe('FirebasePaymentNotificationService', () => {
  let service: FirebasePaymentNotificationService;
  const userId = 'test-user-id';
  const paymentId = 'test-payment-id';
  const notificationId = 'test-notification-id';

  beforeEach(() => {
    service = new FirebasePaymentNotificationService();
  });

  describe('createPaymentNotification', () => {
    it('deve criar uma notificação de pagamento corretamente', async () => {
      const payload: CreatePaymentNotificationPayload = {
        userId,
        paymentId,
        type: PaymentNotificationType.PAYMENT_APPROVED,
        title: 'Pagamento Aprovado',
        message: 'Seu pagamento foi aprovado com sucesso!',
      };

      const result = await service.createPaymentNotification(payload);

      expect(result).toEqual(
        expect.objectContaining({
          ...payload,
          isRead: false,
          readAt: null,
        }),
      );
    });
  });

  describe('getPaymentNotificationById', () => {
    it('deve retornar uma notificação de pagamento quando ela existir', async () => {
      const mockNotification: PaymentNotification = {
        id: notificationId,
        userId,
        paymentId,
        type: PaymentNotificationType.PAYMENT_APPROVED,
        title: 'Pagamento Aprovado',
        message: 'Seu pagamento foi aprovado com sucesso!',
        isRead: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const result = await service.getPaymentNotificationById(notificationId);

      expect(result).toEqual(mockNotification);
    });

    it('deve retornar null quando a notificação de pagamento não existir', async () => {
      const result = await service.getPaymentNotificationById(notificationId);

      expect(result).toBeNull();
    });
  });

  describe('getPaymentNotificationsByUserId', () => {
    it('deve retornar as notificações de pagamento de um usuário corretamente', async () => {
      const mockNotifications: PaymentNotification[] = [
        {
          id: 'notification-1',
          userId,
          paymentId,
          type: PaymentNotificationType.PAYMENT_APPROVED,
          title: 'Pagamento Aprovado',
          message: 'Seu pagamento foi aprovado com sucesso!',
          isRead: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        {
          id: 'notification-2',
          userId,
          paymentId,
          type: PaymentNotificationType.PAYMENT_PENDING,
          title: 'Pagamento Pendente',
          message: 'Seu pagamento está pendente',
          isRead: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      const result = await service.getPaymentNotificationsByUserId(userId);

      expect(result).toEqual({
        notifications: mockNotifications,
        total: 5,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('getPaymentNotificationsByPaymentId', () => {
    it('deve retornar as notificações de um pagamento específico', async () => {
      const mockNotifications: PaymentNotification[] = [
        {
          id: 'notification-1',
          userId,
          paymentId,
          type: PaymentNotificationType.PAYMENT_APPROVED,
          title: 'Pagamento Aprovado',
          message: 'Seu pagamento foi aprovado com sucesso!',
          isRead: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      const result = await service.getPaymentNotificationsByPaymentId(paymentId);

      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markPaymentNotificationAsRead', () => {
    it('deve marcar uma notificação de pagamento como lida corretamente', async () => {
      const mockNotification: PaymentNotification = {
        id: notificationId,
        userId,
        paymentId,
        type: PaymentNotificationType.PAYMENT_APPROVED,
        title: 'Pagamento Aprovado',
        message: 'Seu pagamento foi aprovado com sucesso!',
        isRead: true,
        readAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const result = await service.markPaymentNotificationAsRead(notificationId);

      expect(result).toEqual(mockNotification);
    });
  });

  describe('markAllPaymentNotificationsAsRead', () => {
    it('deve marcar todas as notificações de pagamento de um usuário como lidas', async () => {
      const result = await service.markAllPaymentNotificationsAsRead(userId);

      expect(result).toBe(5);
    });
  });

  describe('processPaymentWebhook', () => {
    it('deve processar um webhook de pagamento e criar uma notificação', async () => {
      const webhookData = {
        type: 'payment.approved',
        userId: userId,
        id: paymentId,
      };

      const mockNotification: PaymentNotification = {
        id: notificationId,
        userId,
        paymentId,
        type: PaymentNotificationType.PAYMENT_APPROVED,
        title: 'Pagamento Aprovado',
        message: 'Seu pagamento foi aprovado com sucesso!',
        isRead: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Mock da chamada ao createPaymentNotification dentro do processPaymentWebhook
      jest.spyOn(service, 'createPaymentNotification').mockResolvedValueOnce(mockNotification);

      const result = await service.processPaymentWebhook(webhookData, paymentId);

      expect(service.createPaymentNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          paymentId,
          type: PaymentNotificationType.PAYMENT_APPROVED,
          title: 'Pagamento Aprovado',
          message: 'Seu pagamento foi aprovado com sucesso!',
          metadata: webhookData,
        }),
      );

      expect(result).toEqual(mockNotification);
    });

    it('deve retornar null quando o webhookData não contém userId', async () => {
      const webhookData = {
        type: 'payment.approved',
        // Sem userId
      };

      const result = await service.processPaymentWebhook(webhookData, paymentId);

      expect(result).toBeNull();
    });
  });

  describe('updatePaymentNotification', () => {
    it('deve atualizar uma notificação de pagamento corretamente', async () => {
      const mockNotification: PaymentNotification = {
        id: notificationId,
        userId,
        paymentId,
        type: PaymentNotificationType.PAYMENT_APPROVED,
        title: 'Título Atualizado',
        message: 'Mensagem atualizada',
        isRead: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const result = await service.updatePaymentNotification(notificationId, {
        title: 'Título Atualizado',
        message: 'Mensagem atualizada',
      });

      expect(result).toEqual(mockNotification);
    });
  });

  describe('deletePaymentNotification', () => {
    it('deve excluir uma notificação de pagamento corretamente', async () => {
      await service.deletePaymentNotification(notificationId);
    });
  });
});
