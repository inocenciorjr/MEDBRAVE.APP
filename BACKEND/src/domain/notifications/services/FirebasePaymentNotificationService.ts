import { IPaymentNotificationService } from '../interfaces/IPaymentNotificationService';
import { INotificationService } from '../interfaces/INotificationService';
import { Notification, NotificationPriority, NotificationType } from '../types';
import { format } from 'date-fns';

export class FirebasePaymentNotificationService implements IPaymentNotificationService {
  private notificationService: INotificationService;

  constructor(
    notificationService: INotificationService,
  ) {
    this.notificationService = notificationService;
  }

  async notifyPaymentReceived(
    userId: string,
    paymentId: string,
    amount: number,
    planName: string,
  ): Promise<Notification> {
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);

    return this.notificationService.createNotification({
      userId,
      title: 'Pagamento confirmado',
      message: `Seu pagamento de ${formattedAmount} para o plano ${planName} foi confirmado.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      data: {
        paymentId,
        amount,
        planName,
        action: 'VIEW_RECEIPT',
      },
    });
  }

  async notifySubscriptionExpiring(
    userId: string,
    subscriptionId: string,
    daysUntilExpiration: number,
    planName: string,
  ): Promise<Notification> {
    return this.notificationService.createNotification({
      userId,
      title: 'Assinatura próxima do vencimento',
      message: `Sua assinatura para o plano ${planName} expira em ${daysUntilExpiration} dias. Renove agora para não perder acesso.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.HIGH,
      data: {
        subscriptionId,
        daysUntilExpiration,
        planName,
        action: 'RENEW_SUBSCRIPTION',
      },
    });
  }

  async notifySubscriptionExpired(
    userId: string,
    subscriptionId: string,
    planName: string,
  ): Promise<Notification> {
    return this.notificationService.createNotification({
      userId,
      title: 'Assinatura expirada',
      message: `Sua assinatura para o plano ${planName} expirou. Renove agora para restaurar seu acesso.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.HIGH,
      data: {
        subscriptionId,
        planName,
        action: 'RENEW_SUBSCRIPTION',
      },
    });
  }

  async notifySubscriptionRenewed(
    userId: string,
    subscriptionId: string,
    amount: number,
    planName: string,
    nextRenewalDate: Date,
  ): Promise<Notification> {
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);

    const formattedDate = format(nextRenewalDate, 'dd/MM/yyyy');

    return this.notificationService.createNotification({
      userId,
      title: 'Assinatura renovada',
      message: `Sua assinatura para o plano ${planName} foi renovada por ${formattedAmount}. Próxima renovação: ${formattedDate}.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      data: {
        subscriptionId,
        amount,
        planName,
        nextRenewalDate: nextRenewalDate.toISOString(),
        action: 'VIEW_SUBSCRIPTION',
      },
    });
  }

  async notifyPaymentFailed(
    userId: string,
    paymentId: string,
    amount: number,
    reason: string,
  ): Promise<Notification> {
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);

    return this.notificationService.createNotification({
      userId,
      title: 'Falha no pagamento',
      message: `Não conseguimos processar seu pagamento de ${formattedAmount}. Motivo: ${reason}. Por favor, atualize seus dados de pagamento.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.URGENT,
      data: {
        paymentId,
        amount,
        reason,
        action: 'UPDATE_PAYMENT',
      },
    });
  }

  async notifyRefundProcessed(
    userId: string,
    paymentId: string,
    amount: number,
    reason?: string,
  ): Promise<Notification> {
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);

    const message = reason
      ? `Seu reembolso de ${formattedAmount} foi processado. Motivo: ${reason}.`
      : `Seu reembolso de ${formattedAmount} foi processado.`;

    return this.notificationService.createNotification({
      userId,
      title: 'Reembolso processado',
      message,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      data: {
        paymentId,
        amount,
        reason,
        action: 'VIEW_REFUND',
      },
    });
  }

  async notifyPaymentMethodUpdated(
    userId: string,
    methodType: string,
    lastFourDigits?: string,
  ): Promise<Notification> {
    let message = `Seu método de pagamento (${methodType}) foi atualizado.`;

    if (lastFourDigits) {
      message = `Seu método de pagamento (${methodType} terminado em ${lastFourDigits}) foi atualizado.`;
    }

    return this.notificationService.createNotification({
      userId,
      title: 'Método de pagamento atualizado',
      message,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      data: {
        methodType,
        lastFourDigits,
        action: 'VIEW_PAYMENT_METHODS',
      },
    });
  }

  async notifyDiscountApplied(
    userId: string,
    discountCode: string,
    discountAmount: number,
    totalAfterDiscount: number,
  ): Promise<Notification> {
    const formattedDiscount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(discountAmount);

    const formattedTotal = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(totalAfterDiscount);

    return this.notificationService.createNotification({
      userId,
      title: 'Desconto aplicado',
      message: `Você recebeu um desconto de ${formattedDiscount} com o código ${discountCode}. Total: ${formattedTotal}.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      data: {
        discountCode,
        discountAmount,
        totalAfterDiscount,
        action: 'VIEW_CART',
      },
    });
  }
}
