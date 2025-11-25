import { SupabaseClient } from '@supabase/supabase-js';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  CreatePaymentPayload,
  UpdatePaymentPayload,
  ListPaymentsOptions,
  PaginatedPaymentsResult,
  PaymentProcessResult,
  UserPlanStatus,
} from '../../../domain/payment/types';
import { IPaymentService } from '../../../domain/payment/interfaces/IPaymentService';
import { IUserPlanService } from '../../../domain/payment/interfaces/IUserPlanService';
import { IPixPaymentService } from '../../../domain/payment/interfaces/IPixPaymentService';
import { SupabasePaymentNotificationService } from '../../notifications/supabase/SupabasePaymentNotificationService';
import logger from '../../../utils/logger';
import { ErrorCodes, createError } from '../../../utils/errors';

// Constantes para validação
const VALID_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
const MAX_AMOUNT = 1000000; // 1 milhão na moeda base
const MIN_AMOUNT = 0.01;
const MAX_METADATA_SIZE = 10000; // 10KB em caracteres

/**
 * Implementação do serviço de pagamentos utilizando Supabase
 */
export class SupabasePaymentService implements IPaymentService {
  private userPlanService: IUserPlanService;
  private pixPaymentService: IPixPaymentService | null = null;

  /**
   * Construtor da classe SupabasePaymentService
   * @param supabase Cliente Supabase
   * @param userPlanService Serviço de planos de usuário (obrigatório)
   * @param pixPaymentService Serviço de pagamentos PIX (opcional)
   * @param paymentNotificationService Serviço de notificações de pagamento (opcional)
   */
  constructor(
    private supabase: SupabaseClient,
    userPlanService: IUserPlanService,
    pixPaymentService?: IPixPaymentService,
  ) {
    this.userPlanService = userPlanService;

    if (pixPaymentService) {
      this.pixPaymentService = pixPaymentService;
    }
  }

  /**
   * Valida os dados de um pagamento
   * @param paymentData Dados do pagamento a serem validados
   * @throws {AppError} Erro caso a validação falhe
   */
  private validatePaymentData(paymentData: Partial<Payment>): void {
    // Validações de campos obrigatórios
    if (!paymentData.userId?.trim()) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        'UserId é obrigatório e não pode estar vazio.',
      );
    }
    if (!paymentData.planId?.trim()) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        'PlanId é obrigatório e não pode estar vazio.',
      );
    }

    // Validação de valores monetários
    if (
      typeof paymentData.amount !== 'number' ||
      isNaN(paymentData.amount) ||
      paymentData.amount < MIN_AMOUNT ||
      paymentData.amount > MAX_AMOUNT
    ) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        `Amount deve ser um número entre ${MIN_AMOUNT} e ${MAX_AMOUNT}.`,
      );
    }

    // Validação de moeda
    if (
      paymentData.currency &&
      !VALID_CURRENCIES.includes(paymentData.currency as any)
    ) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        `Currency deve ser uma das seguintes: ${VALID_CURRENCIES.join(', ')}.`,
      );
    }

    // Validação de método de pagamento
    if (
      paymentData.paymentMethod &&
      !Object.values(PaymentMethod).includes(paymentData.paymentMethod)
    ) {
      throw createError(ErrorCodes.VALIDATION_ERROR, 'PaymentMethod inválido.');
    }

    // Validação de status
    if (
      paymentData.status &&
      !Object.values(PaymentStatus).includes(paymentData.status)
    ) {
      throw createError(ErrorCodes.VALIDATION_ERROR, 'Status inválido.');
    }

    // Validação de metadata
    if (
      paymentData.metadata &&
      JSON.stringify(paymentData.metadata).length > MAX_METADATA_SIZE
    ) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        `Metadata excede o tamanho máximo de ${MAX_METADATA_SIZE} caracteres.`,
      );
    }
  }

  /**
   * Valida transições de status de pagamento
   * @param currentStatus Status atual do pagamento
   * @param newStatus Novo status desejado
   * @throws {AppError} Erro caso a transição seja inválida
   */
  private validateStatusTransition(
    currentStatus: PaymentStatus,
    newStatus: PaymentStatus,
  ): void {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [
        PaymentStatus.APPROVED,
        PaymentStatus.REJECTED,
        PaymentStatus.CANCELLED,
        PaymentStatus.FAILED,
      ],
      [PaymentStatus.APPROVED]: [
        PaymentStatus.REFUNDED,
        PaymentStatus.CHARGEBACK,
      ],
      [PaymentStatus.REJECTED]: [],
      [PaymentStatus.REFUNDED]: [],
      [PaymentStatus.CANCELLED]: [],
      [PaymentStatus.CHARGEBACK]: [],
      [PaymentStatus.FAILED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        `Transição de status inválida: ${currentStatus} -> ${newStatus}`,
      );
    }
  }

  /**
   * Envia notificação de mudança de status do pagamento
   * @param payment Dados do pagamento
   */
  private async sendPaymentStatusNotification(payment: Payment): Promise<void> {
    try {
      const notifier = new SupabasePaymentNotificationService();
      switch (payment.status) {
        case PaymentStatus.APPROVED:
          await notifier.sendPaymentApprovedNotification(payment.userId, {
            amount: payment.amount,
            planName: payment.planId,
            transactionId: payment.id,
            paymentMethod: payment.paymentMethod,
          });
          break;
        case PaymentStatus.REJECTED:
          await notifier.sendPaymentRejectedNotification(payment.userId, {
            amount: payment.amount,
            planName: payment.planId,
            transactionId: payment.id,
            reason: payment.failureReason || 'Motivo não especificado',
          });
          break;
        case PaymentStatus.REFUNDED:
          await notifier.sendRefundProcessedNotification(payment.userId, {
            amount: payment.amount,
            originalTransactionId: payment.id,
            refundId: 'unknown',
          });
          break;
        case PaymentStatus.CANCELLED:
          await notifier.sendPaymentCancelledNotification(payment.userId, {
            amount: payment.amount,
            planName: payment.planId,
            transactionId: payment.id,
            reason: payment.cancellationReason || 'Motivo não especificado',
          });
          break;
      }
    } catch (error) {
      logger.error('Erro ao enviar notificação de pagamento:', error);
    }
  }

  async createPayment(paymentData: CreatePaymentPayload): Promise<Payment> {
    try {
      // Validação dos dados
      this.validatePaymentData(paymentData);

      const now = new Date();
      const payment: Omit<Payment, 'id'> = {
        userId: paymentData.userId,
        planId: paymentData.planId,
        userPlanId: paymentData.userPlanId || null,
        invoiceId: null,
        couponId: paymentData.couponId || null,
        originalAmount: paymentData.originalAmount || paymentData.amount,
        discountAmount: paymentData.discountAmount || 0,
        amount: paymentData.amount,
        currency: paymentData.currency || 'BRL',
        description: paymentData.description || null,
        paymentMethod: paymentData.paymentMethod,
        paymentMethodDetails: paymentData.paymentMethodDetails || null,
        status: PaymentStatus.PENDING,
        externalId: null,
        externalReference: null,
        transactionData: null,
        metadata: paymentData.metadata || null,
        pixCode: null,
        pixExpirationDate: null,
        cardLastFourDigits: null,
        cardBrand: null,
        installments: null,
        receiptUrl: null,
        failureReason: null,
        refundReason: null,
        chargebackReason: null,
        cancellationReason: null,
        processedAt: null,
        paidAt: null,
        refundedAt: null,
        cancelledAt: null,
        chargebackAt: null,
        processedBy: null,
        refundedBy: null,
        refundTransactionId: null,
        createdAt: now,
        updatedAt: now,
      };

      const { data, error } = await this.supabase
        .from('payments')
        .insert(this.mapToDatabase(payment))
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create payment: ${error.message}`);
      }

      const createdPayment = this.mapToEntity(data);

      logger.info(`Payment created successfully: ${createdPayment.id}`);
      return createdPayment;
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    }
  }

  async getPaymentById(paymentId: string): Promise<Payment | null> {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get payment: ${error.message}`);
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(`Error getting payment ${paymentId}:`, error);
      throw error;
    }
  }

  async getPaymentsByUserId(userId: string): Promise<Payment[]> {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get payments by user: ${error.message}`);
      }

      return data.map((item) => this.mapToEntity(item));
    } catch (error) {
      logger.error(`Error getting payments for user ${userId}:`, error);
      throw error;
    }
  }

  async getPaymentsByUserPlanId(userPlanId: string): Promise<Payment[]> {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('user_plan_id', userPlanId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(
          `Failed to get payments by user plan: ${error.message}`,
        );
      }

      return data.map((item) => this.mapToEntity(item));
    } catch (error) {
      logger.error(
        `Error getting payments for user plan ${userPlanId}:`,
        error,
      );
      throw error;
    }
  }

  async updatePayment(
    paymentId: string,
    updates: UpdatePaymentPayload,
  ): Promise<Payment | null> {
    try {
      const existingPayment = await this.getPaymentById(paymentId);
      if (!existingPayment) {
        throw createError(
          ErrorCodes.NOT_FOUND,
          `Payment with ID ${paymentId} not found`,
        );
      }

      // Validar transição de status se fornecida
      if (updates.status && updates.status !== existingPayment.status) {
        this.validateStatusTransition(existingPayment.status, updates.status);
      }

      const updateData = {
        ...updates,
        updated_at: new Date(),
      };

      // Remover somente campos inexistentes no payload original

      const { data, error } = await this.supabase
        .from('payments')
        .update(this.mapToDatabase(updateData))
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update payment: ${error.message}`);
      }

      const updatedPayment = this.mapToEntity(data);

      // Enviar notificação se o status mudou
      if (updates.status && updates.status !== existingPayment.status) {
        await this.sendPaymentStatusNotification(updatedPayment);
      }

      logger.info(`Payment ${paymentId} updated successfully`);
      return updatedPayment;
    } catch (error) {
      logger.error(`Error updating payment ${paymentId}:`, error);
      throw error;
    }
  }

  async approvePayment(
    paymentId: string,
    externalId?: string,
    transactionData?: Record<string, any>,
    receiptUrl?: string,
  ): Promise<Payment | null> {
    try {
      const updates: UpdatePaymentPayload = {
        status: PaymentStatus.APPROVED,
        paidAt: new Date(),
        processedAt: new Date(),
        externalId,
        transactionData,
        receiptUrl,
      };

      const payment = await this.updatePayment(paymentId, updates);
      if (!payment) {
        return null;
      }

      // Ativar plano do usuário se houver userPlanId
      if (payment.userPlanId) {
        try {
          await this.userPlanService.updateUserPlanStatus(
            payment.userPlanId,
            UserPlanStatus.ACTIVE,
            'Payment approved',
          );
          logger.info(
            `User plan ${payment.userPlanId} activated for payment ${paymentId}`,
          );
        } catch (error) {
          logger.error(
            `Error activating user plan for payment ${paymentId}:`,
            error,
          );
        }
      }

      logger.info(`Payment ${paymentId} approved successfully`);
      return payment;
    } catch (error) {
      logger.error(`Error approving payment ${paymentId}:`, error);
      throw error;
    }
  }

  async rejectPayment(
    paymentId: string,
    failureReason: string,
    transactionData?: Record<string, any>,
  ): Promise<Payment | null> {
    try {
      const updates: UpdatePaymentPayload = {
        status: PaymentStatus.REJECTED,
        failureReason,
        processedAt: new Date(),
        transactionData,
      };

      const payment = await this.updatePayment(paymentId, updates);
      if (!payment) {
        return null;
      }

      // Cancelar plano do usuário se houver userPlanId
      if (payment.userPlanId) {
        try {
          await this.userPlanService.cancelUserPlan(
            payment.userPlanId,
            'Payment rejected',
          );
          logger.info(
            `User plan ${payment.userPlanId} cancelled due to payment rejection`,
          );
        } catch (error) {
          logger.error(
            `Error cancelling user plan for rejected payment ${paymentId}:`,
            error,
          );
        }
      }

      logger.info(`Payment ${paymentId} rejected: ${failureReason}`);
      return payment;
    } catch (error) {
      logger.error(`Error rejecting payment ${paymentId}:`, error);
      throw error;
    }
  }

  async refundPayment(
    paymentId: string,
    refundReason: string,
    gatewayTransactionId?: string,
    adminUserId?: string,
  ): Promise<Payment | null> {
    try {
      const updates: UpdatePaymentPayload = {
        status: PaymentStatus.REFUNDED,
        refundReason,
        refundedAt: new Date(),
      };
      if (adminUserId) {
        updates.refundedBy = adminUserId;
      }
      if (gatewayTransactionId) {
        updates.refundTransactionId = gatewayTransactionId;
      }

      const payment = await this.updatePayment(paymentId, updates);
      if (!payment) {
        return null;
      }

      // Cancelar plano do usuário se houver userPlanId
      if (payment.userPlanId) {
        try {
          await this.userPlanService.cancelUserPlan(
            payment.userPlanId,
            'Payment refunded',
          );
          logger.info(
            `User plan ${payment.userPlanId} cancelled due to payment refund`,
          );
        } catch (error) {
          logger.error(
            `Error cancelling user plan for refunded payment ${paymentId}:`,
            error,
          );
        }
      }

      logger.info(`Payment ${paymentId} refunded: ${refundReason}`);
      return payment;
    } catch (error) {
      logger.error(`Error refunding payment ${paymentId}:`, error);
      throw error;
    }
  }

  async cancelPayment(
    paymentId: string,
    reason: string,
  ): Promise<Payment | null> {
    try {
      const updates: UpdatePaymentPayload = {
        status: PaymentStatus.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
      };

      const payment = await this.updatePayment(paymentId, updates);
      if (!payment) {
        return null;
      }

      // Cancelar plano do usuário se houver userPlanId
      if (payment.userPlanId) {
        try {
          await this.userPlanService.cancelUserPlan(
            payment.userPlanId,
            reason,
          );
          logger.info(
            `User plan ${payment.userPlanId} cancelled due to payment cancellation`,
          );
        } catch (error) {
          logger.error(
            `Error cancelling user plan for cancelled payment ${paymentId}:`,
            error,
          );
        }
      }

      logger.info(`Payment ${paymentId} cancelled: ${reason}`);
      return payment;
    } catch (error) {
      logger.error(`Error cancelling payment ${paymentId}:`, error);
      throw error;
    }
  }

  async listPayments(
    options: ListPaymentsOptions = {},
  ): Promise<PaginatedPaymentsResult> {
    try {
      let query = this.supabase
        .from('payments')
        .select('*', { count: 'exact' });

      // Filtros
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.planId) {
        query = query.eq('plan_id', options.planId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.paymentMethod) {
        query = query.eq('payment_method', options.paymentMethod);
      }

      if (options.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      // Paginação
      const limit = options.limit || 20;
      const page = options.page || 1;
      const offset = (page - 1) * limit;

      query = query.range(offset, offset + limit - 1);

      // Ordenação
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to list payments: ${error.message}`);
      }

      const payments = data.map((item) => this.mapToEntity(item));
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        payments,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error listing payments:', error);
      throw error;
    }
  }

  async getPaymentByExternalId(externalId: string): Promise<Payment | null> {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('external_id', externalId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(
          `Failed to get payment by external ID: ${error.message}`,
        );
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(
        `Error getting payment by external ID ${externalId}:`,
        error,
      );
      throw error;
    }
  }

  async processPayment(paymentId: string): Promise<PaymentProcessResult> {
    try {
      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        return {
          success: false,
          payment: {} as Payment,
          error: 'Payment not found',
        };
      }

      // Processar pagamento PIX se aplicável
      if (
        payment.paymentMethod === PaymentMethod.PIX &&
        this.pixPaymentService
      ) {
        try {
          const pixResult = await this.pixPaymentService.createPixPayment({
            paymentId: payment.id,
            expirationHours: 24,
          });

          // Atualizar pagamento com dados do PIX
          await this.updatePayment(payment.id, {
            pixCode: pixResult.copyPasteText,
            pixExpirationDate: pixResult.expirationDate,
          });

          return {
            success: true,
            payment,
            pixQrCode: pixResult.qrCode,
            pixCopiaECola: pixResult.copyPasteText,
            expirationDate: pixResult.expirationDate,
          };
        } catch (error) {
          logger.error(`Error processing PIX payment ${paymentId}:`, error);
          return {
            success: false,
            payment,
            error: 'Failed to process PIX payment',
          };
        }
      }

      return {
        success: true,
        payment,
      };
    } catch (error) {
      logger.error(`Error processing payment ${paymentId}:`, error);
      return {
        success: false,
        payment: {} as Payment,
        error: 'Internal error',
      };
    }
  }

  async handlePaymentWebhook(): Promise<any> {
    // Implementação específica do webhook será feita conforme o gateway de pagamento
    throw new Error('Method not implemented');
  }

  private mapToEntity(data: any): Payment {
    return {
      id: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      userPlanId: data.user_plan_id,
      invoiceId: data.invoice_id,
      couponId: data.coupon_id,
      originalAmount: data.original_amount,
      discountAmount: data.discount_amount,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      paymentMethod: data.payment_method,
      paymentMethodDetails: data.payment_method_details,
      status: data.status,
      externalId: data.external_id,
      externalReference: data.external_reference,
      transactionData: data.transaction_data,
      metadata: data.metadata,
      pixCode: data.pix_code,
      pixExpirationDate: data.pix_expiration_date
        ? new Date(data.pix_expiration_date)
        : null,
      cardLastFourDigits: data.card_last_four_digits,
      cardBrand: data.card_brand,
      installments: data.installments,
      receiptUrl: data.receipt_url,
      failureReason: data.failure_reason,
      refundReason: data.refund_reason,
      chargebackReason: data.chargeback_reason,
      cancellationReason: data.cancellation_reason,
      processedAt: data.processed_at ? new Date(data.processed_at) : null,
      paidAt: data.paid_at ? new Date(data.paid_at) : null,
      refundedAt: data.refunded_at ? new Date(data.refunded_at) : null,
      cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : null,
      chargebackAt: data.chargeback_at ? new Date(data.chargeback_at) : null,
      processedBy: data.processed_by,
      refundedBy: data.refunded_by,
      refundTransactionId: data.refund_transaction_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToDatabase(entity: Partial<Payment>): any {
    const data: any = {};

    if (entity.userId !== undefined) {
data.user_id = entity.userId;
}
    if (entity.planId !== undefined) {
data.plan_id = entity.planId;
}
    if (entity.userPlanId !== undefined) {
data.user_plan_id = entity.userPlanId;
}
    if (entity.invoiceId !== undefined) {
data.invoice_id = entity.invoiceId;
}
    if (entity.couponId !== undefined) {
data.coupon_id = entity.couponId;
}
    if (entity.originalAmount !== undefined) {
      data.original_amount = entity.originalAmount;
    }
    if (entity.discountAmount !== undefined) {
      data.discount_amount = entity.discountAmount;
    }
    if (entity.amount !== undefined) {
      data.amount = entity.amount;
    }
    if (entity.currency !== undefined) {
      data.currency = entity.currency;
    }
    if (entity.description !== undefined) {
      data.description = entity.description;
    }
    if (entity.paymentMethod !== undefined) {
      data.payment_method = entity.paymentMethod;
    }
    if (entity.paymentMethodDetails !== undefined) {
      data.payment_method_details = entity.paymentMethodDetails;
    }
    if (entity.status !== undefined) {
      data.status = entity.status;
    }
    if (entity.externalId !== undefined) {
      data.external_id = entity.externalId;
    }
    if (entity.externalReference !== undefined) {
      data.external_reference = entity.externalReference;
    }
    if (entity.transactionData !== undefined) {
      data.transaction_data = entity.transactionData;
    }
    if (entity.metadata !== undefined) {
      data.metadata = entity.metadata;
    }
    if (entity.pixCode !== undefined) {
      data.pix_code = entity.pixCode;
    }
    if (entity.pixExpirationDate !== undefined) {
      data.pix_expiration_date = entity.pixExpirationDate;
    }
    if (entity.cardLastFourDigits !== undefined) {
      data.card_last_four_digits = entity.cardLastFourDigits;
    }
    if (entity.cardBrand !== undefined) {
      data.card_brand = entity.cardBrand;
    }
    if (entity.installments !== undefined) {
      data.installments = entity.installments;
    }
    if (entity.receiptUrl !== undefined) {
      data.receipt_url = entity.receiptUrl;
    }
    if (entity.failureReason !== undefined) {
      data.failure_reason = entity.failureReason;
    }
    if (entity.refundReason !== undefined) {
      data.refund_reason = entity.refundReason;
    }
    if (entity.chargebackReason !== undefined) {
      data.chargeback_reason = entity.chargebackReason;
    }
    if (entity.cancellationReason !== undefined) {
      data.cancellation_reason = entity.cancellationReason;
    }
    if (entity.processedAt !== undefined) {
      data.processed_at = entity.processedAt;
    }
    if (entity.paidAt !== undefined) {
      data.paid_at = entity.paidAt;
    }
    if (entity.refundedAt !== undefined) {
      data.refunded_at = entity.refundedAt;
    }
    if (entity.cancelledAt !== undefined) {
      data.cancelled_at = entity.cancelledAt;
    }
    if (entity.chargebackAt !== undefined) {
      data.chargeback_at = entity.chargebackAt;
    }
    if (entity.processedBy !== undefined) {
      data.processed_by = entity.processedBy;
    }
    if (entity.refundedBy !== undefined) {
      data.refunded_by = entity.refundedBy;
    }
    if (entity.refundTransactionId !== undefined) {
      data.refund_transaction_id = entity.refundTransactionId;
    }
    if (entity.createdAt !== undefined) {
      data.created_at = entity.createdAt;
    }
    if (entity.updatedAt !== undefined) {
      data.updated_at = entity.updatedAt;
    }

    return data;
  }
}
