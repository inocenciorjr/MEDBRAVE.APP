import { INotificationService } from '../../../domain/notifications/interfaces/INotificationService';
import {
  CreateNotificationPayload,
  NotificationType,
  NotificationPriority,
} from '../../../domain/notifications/types';
import { logger } from '../../../utils/logger';
import { SupabaseNotificationService } from './SupabaseNotificationService';

/**
 * Serviço de notificações de pagamento
 * Implementação usando Supabase através do SupabaseNotificationService
 */
import { IPaymentNotificationService } from '../../../domain/notifications/interfaces/IPaymentNotificationService';
export class SupabasePaymentNotificationService implements IPaymentNotificationService {
  private serviceName = 'SupabasePaymentNotificationService';

  constructor(
    private readonly notificationService: INotificationService = new SupabaseNotificationService(),
  ) {}

  async notifyPaymentReceived(userId: string, paymentId: string, amount: number, planName: string) {
    const data: CreateNotificationPayload = {
      user_id: userId,
      title: 'Pagamento Recebido',
      message: `Recebemos seu pagamento de R$ ${amount.toFixed(2)} para o plano ${planName}.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      data: { paymentId, amount, planName, status: 'received' },
    };
    return this.notificationService.createNotification(data);
  }

  async notifySubscriptionExpiring(userId: string, subscriptionId: string, daysUntilExpiration: number, planName: string) {
    const data: CreateNotificationPayload = {
      user_id: userId,
      title: 'Assinatura Expirando',
      message: `Sua assinatura do plano ${planName} expira em ${daysUntilExpiration} dia(s).`,
      type: NotificationType.REMINDER,
      priority: NotificationPriority.NORMAL,
      data: { subscriptionId, planName, daysUntilExpiration, status: 'expiring' },
    };
    return this.notificationService.createNotification(data);
  }

  async notifySubscriptionExpired(userId: string, subscriptionId: string, planName: string) {
    const data: CreateNotificationPayload = {
      user_id: userId,
      title: 'Assinatura Expirada',
      message: `Sua assinatura do plano ${planName} expirou.`,
      type: NotificationType.REMINDER,
      priority: NotificationPriority.HIGH,
      data: { subscriptionId, planName, status: 'expired' },
    };
    return this.notificationService.createNotification(data);
  }

  async notifySubscriptionRenewed(userId: string, subscriptionId: string, amount: number, planName: string, nextRenewalDate: Date) {
    const data: CreateNotificationPayload = {
      user_id: userId,
      title: 'Assinatura Renovada',
      message: `Sua assinatura do plano ${planName} foi renovada por R$ ${amount.toFixed(2)}.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      data: { subscriptionId, planName, amount, nextRenewalDate: nextRenewalDate.toISOString(), status: 'renewed' },
    };
    return this.notificationService.createNotification(data);
  }

  async notifyPaymentFailed(userId: string, paymentId: string, amount: number, reason: string) {
    const data: CreateNotificationPayload = {
      user_id: userId,
      title: 'Pagamento Falhou',
      message: reason || `Falha no pagamento de R$ ${amount.toFixed(2)}.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.HIGH,
      data: { paymentId, amount, reason, status: 'failed' },
    };
    return this.notificationService.createNotification(data);
  }

  async notifyRefundProcessed(userId: string, paymentId: string, amount: number, reason?: string) {
    const data: CreateNotificationPayload = {
      user_id: userId,
      title: 'Reembolso Processado',
      message: `Reembolso de R$ ${amount.toFixed(2)} ${reason ? `- ${reason}` : ''}.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      data: { paymentId, amount, reason, status: 'refunded' },
    };
    return this.notificationService.createNotification(data);
  }

  async notifyPaymentMethodUpdated(userId: string, methodType: string, lastFourDigits?: string) {
    const data: CreateNotificationPayload = {
      user_id: userId,
      title: 'Método de Pagamento Atualizado',
      message: `Seu método de pagamento (${methodType}) foi atualizado${lastFourDigits ? ` (final ${lastFourDigits})` : ''}.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      data: { methodType, lastFourDigits, status: 'method_updated' },
    };
    return this.notificationService.createNotification(data);
  }

  async notifyDiscountApplied(userId: string, discountCode: string, discountAmount: number, totalAfterDiscount: number) {
    const data: CreateNotificationPayload = {
      user_id: userId,
      title: 'Desconto Aplicado',
      message: `Cupom ${discountCode} aplicado: -R$ ${discountAmount.toFixed(2)}. Total: R$ ${totalAfterDiscount.toFixed(2)}.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      data: { discountCode, discountAmount, totalAfterDiscount, status: 'discount_applied' },
    };
    return this.notificationService.createNotification(data);
  }

  /**
   * Envia notificação de pagamento aprovado
   */
  async sendPaymentApprovedNotification(
    userId: string,
    paymentData: {
      amount: number;
      planName: string;
      transactionId: string;
      paymentMethod: string;
    },
  ): Promise<void> {
    try {
      const notificationData: CreateNotificationPayload = {
        user_id: userId,
        title: 'Pagamento Aprovado',
        message: `Seu pagamento de R$ ${paymentData.amount.toFixed(2)} para o plano ${paymentData.planName} foi aprovado com sucesso!`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.HIGH,
        data: {
          paymentId: paymentData.transactionId,
          amount: paymentData.amount,
          planName: paymentData.planName,
          paymentMethod: paymentData.paymentMethod,
          status: 'approved',
        },
      };

      await this.notificationService.createNotification(notificationData);
      logger.info(
        `${this.serviceName}: Notificação de pagamento aprovado enviada`,
        {
          userId,
          transactionId: paymentData.transactionId,
        },
      );
    } catch (error) {
      logger.error(
        `${this.serviceName}: Erro ao enviar notificação de pagamento aprovado`,
        {
          error,
          userId,
          paymentData,
        },
      );
      throw error;
    }
  }

  /**
   * Envia notificação de pagamento rejeitado
   */
  async sendPaymentRejectedNotification(
    userId: string,
    paymentData: {
      amount: number;
      planName: string;
      transactionId: string;
      reason?: string;
    },
  ): Promise<void> {
    try {
      const notificationData: CreateNotificationPayload = {
        user_id: userId,
        title: 'Pagamento Rejeitado',
        message: `Seu pagamento de R$ ${paymentData.amount.toFixed(2)} para o plano ${paymentData.planName} foi rejeitado. ${paymentData.reason ? `Motivo: ${paymentData.reason}` : 'Tente novamente ou entre em contato conosco.'}`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.HIGH,
        data: {
          paymentId: paymentData.transactionId,
          amount: paymentData.amount,
          planName: paymentData.planName,
          reason: paymentData.reason,
          status: 'rejected',
        },
      };

      await this.notificationService.createNotification(notificationData);
      logger.info(
        `${this.serviceName}: Notificação de pagamento rejeitado enviada`,
        {
          userId,
          transactionId: paymentData.transactionId,
        },
      );
    } catch (error) {
      logger.error(
        `${this.serviceName}: Erro ao enviar notificação de pagamento rejeitado`,
        {
          error,
          userId,
          paymentData,
        },
      );
      throw error;
    }
  }

  /**
   * Envia notificação de pagamento pendente
   */
  async sendPaymentPendingNotification(
    userId: string,
    paymentData: {
      amount: number;
      planName: string;
      transactionId: string;
      paymentMethod: string;
    },
  ): Promise<void> {
    try {
      const notificationData: CreateNotificationPayload = {
        user_id: userId,
        title: 'Pagamento Pendente',
        message: `Seu pagamento de R$ ${paymentData.amount.toFixed(2)} para o plano ${paymentData.planName} está sendo processado. Aguarde a confirmação.`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.NORMAL,
        data: {
          paymentId: paymentData.transactionId,
          amount: paymentData.amount,
          planName: paymentData.planName,
          paymentMethod: paymentData.paymentMethod,
          status: 'pending',
        },
      };

      await this.notificationService.createNotification(notificationData);
      logger.info(
        `${this.serviceName}: Notificação de pagamento pendente enviada`,
        {
          userId,
          transactionId: paymentData.transactionId,
        },
      );
    } catch (error) {
      logger.error(
        `${this.serviceName}: Erro ao enviar notificação de pagamento pendente`,
        {
          error,
          userId,
          paymentData,
        },
      );
      throw error;
    }
  }

  /**
   * Envia notificação de pagamento cancelado
   */
  async sendPaymentCancelledNotification(
    userId: string,
    paymentData: {
      amount: number;
      planName: string;
      transactionId: string;
      reason?: string;
    },
  ): Promise<void> {
    try {
      const notificationData: CreateNotificationPayload = {
        user_id: userId,
        title: 'Pagamento Cancelado',
        message: `Seu pagamento de R$ ${paymentData.amount.toFixed(2)} para o plano ${paymentData.planName} foi cancelado. ${paymentData.reason || 'Você pode tentar novamente quando desejar.'}`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.NORMAL,
        data: {
          paymentId: paymentData.transactionId,
          amount: paymentData.amount,
          planName: paymentData.planName,
          reason: paymentData.reason,
          status: 'cancelled',
        },
      };

      await this.notificationService.createNotification(notificationData);
      logger.info(
        `${this.serviceName}: Notificação de pagamento cancelado enviada`,
        {
          userId,
          transactionId: paymentData.transactionId,
        },
      );
    } catch (error) {
      logger.error(
        `${this.serviceName}: Erro ao enviar notificação de pagamento cancelado`,
        {
          error,
          userId,
          paymentData,
        },
      );
      throw error;
    }
  }

  /**
   * Envia notificação de reembolso processado
   */
  async sendRefundProcessedNotification(
    userId: string,
    refundData: {
      amount: number;
      originalTransactionId: string;
      refundId: string;
      reason?: string;
    },
  ): Promise<void> {
    try {
      const notificationData: CreateNotificationPayload = {
        user_id: userId,
        title: 'Reembolso Processado',
        message: `Seu reembolso de R$ ${refundData.amount.toFixed(2)} foi processado com sucesso. O valor será creditado em sua conta em até 5 dias úteis.`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.HIGH,
        data: {
          refundId: refundData.refundId,
          originalTransactionId: refundData.originalTransactionId,
          amount: refundData.amount,
          reason: refundData.reason,
          status: 'refunded',
        },
      };

      await this.notificationService.createNotification(notificationData);
      logger.info(
        `${this.serviceName}: Notificação de reembolso processado enviada`,
        {
          userId,
          refundId: refundData.refundId,
        },
      );
    } catch (error) {
      logger.error(
        `${this.serviceName}: Erro ao enviar notificação de reembolso processado`,
        {
          error,
          userId,
          refundData,
        },
      );
      throw error;
    }
  }

  /**
   * Envia notificação de vencimento de plano
   */
  async sendPlanExpirationNotification(
    userId: string,
    planData: {
      planName: string;
      expirationDate: Date;
      daysUntilExpiration: number;
    },
  ): Promise<void> {
    try {
      const isExpired = planData.daysUntilExpiration <= 0;
      const title = isExpired
        ? 'Plano Expirado'
        : 'Plano Próximo ao Vencimento';
      const message = isExpired
        ? `Seu plano ${planData.planName} expirou. Renove agora para continuar aproveitando todos os benefícios.`
        : `Seu plano ${planData.planName} vence em ${planData.daysUntilExpiration} dia(s). Renove agora para não perder o acesso.`;

      const notificationData: CreateNotificationPayload = {
        user_id: userId,
        title,
        message,
        type: NotificationType.REMINDER,
        priority: isExpired
          ? NotificationPriority.HIGH
          : NotificationPriority.NORMAL,
        data: {
          planName: planData.planName,
          expirationDate: planData.expirationDate.toISOString(),
          daysUntilExpiration: planData.daysUntilExpiration,
          status: isExpired ? 'expired' : 'expiring_soon',
        },
      };

      await this.notificationService.createNotification(notificationData);
      logger.info(
        `${this.serviceName}: Notificação de vencimento de plano enviada`,
        {
          userId,
          planName: planData.planName,
          daysUntilExpiration: planData.daysUntilExpiration,
        },
      );
    } catch (error) {
      logger.error(
        `${this.serviceName}: Erro ao enviar notificação de vencimento de plano`,
        {
          error,
          userId,
          planData,
        },
      );
      throw error;
    }
  }

  /**
   * Envia notificação de renovação automática
   */
  async sendAutoRenewalNotification(
    userId: string,
    renewalData: {
      planName: string;
      amount: number;
      nextBillingDate: Date;
      paymentMethod: string;
    },
  ): Promise<void> {
    try {
      const notificationData: CreateNotificationPayload = {
        user_id: userId,
        title: 'Renovação Automática Agendada',
        message: `Seu plano ${renewalData.planName} será renovado automaticamente em ${renewalData.nextBillingDate.toLocaleDateString('pt-BR')} por R$ ${renewalData.amount.toFixed(2)}.`,
        type: NotificationType.REMINDER,
        priority: NotificationPriority.NORMAL,
        data: {
          planName: renewalData.planName,
          amount: renewalData.amount,
          nextBillingDate: renewalData.nextBillingDate.toISOString(),
          paymentMethod: renewalData.paymentMethod,
          status: 'auto_renewal_scheduled',
        },
      };

      await this.notificationService.createNotification(notificationData);
      logger.info(
        `${this.serviceName}: Notificação de renovação automática enviada`,
        {
          userId,
          planName: renewalData.planName,
          nextBillingDate: renewalData.nextBillingDate,
        },
      );
    } catch (error) {
      logger.error(
        `${this.serviceName}: Erro ao enviar notificação de renovação automática`,
        {
          error,
          userId,
          renewalData,
        },
      );
      throw error;
    }
  }
}
