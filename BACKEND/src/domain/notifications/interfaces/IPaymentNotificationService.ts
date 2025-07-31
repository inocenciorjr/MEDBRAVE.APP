import { Notification } from '../types';

/**
 * Interface para o serviço de notificações de pagamento
 */
export interface IPaymentNotificationService {
  /**
   * Notifica sobre um novo pagamento realizado
   */
  notifyPaymentReceived(
    userId: string,
    paymentId: string,
    amount: number,
    planName: string,
  ): Promise<Notification>;

  /**
   * Notifica sobre uma assinatura prestes a expirar
   */
  notifySubscriptionExpiring(
    userId: string,
    subscriptionId: string,
    daysUntilExpiration: number,
    planName: string,
  ): Promise<Notification>;

  /**
   * Notifica sobre uma assinatura expirada
   */
  notifySubscriptionExpired(
    userId: string,
    subscriptionId: string,
    planName: string,
  ): Promise<Notification>;

  /**
   * Notifica sobre uma assinatura renovada automaticamente
   */
  notifySubscriptionRenewed(
    userId: string,
    subscriptionId: string,
    amount: number,
    planName: string,
    nextRenewalDate: Date,
  ): Promise<Notification>;

  /**
   * Notifica sobre uma falha no pagamento
   */
  notifyPaymentFailed(
    userId: string,
    paymentId: string,
    amount: number,
    reason: string,
  ): Promise<Notification>;

  /**
   * Notifica sobre um reembolso processado
   */
  notifyRefundProcessed(
    userId: string,
    paymentId: string,
    amount: number,
    reason?: string,
  ): Promise<Notification>;

  /**
   * Notifica sobre uma mudança no método de pagamento
   */
  notifyPaymentMethodUpdated(
    userId: string,
    methodType: string,
    lastFourDigits?: string,
  ): Promise<Notification>;

  /**
   * Notifica sobre um desconto aplicado
   */
  notifyDiscountApplied(
    userId: string,
    discountCode: string,
    discountAmount: number,
    totalAfterDiscount: number,
  ): Promise<Notification>;
}
