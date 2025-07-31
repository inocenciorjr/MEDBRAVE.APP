import { firestore } from '../../../config/firebaseAdmin';
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
} from '../types';
import { IPaymentService } from '../interfaces/IPaymentService';
import { IUserPlanService } from '../interfaces/IUserPlanService';
import { IPixPaymentService } from '../interfaces/IPixPaymentService';
import { IPaymentNotificationService } from '../../notifications/interfaces/IPaymentNotificationService';
import logger from '../../../utils/logger';
import { ErrorCodes, createError } from '../../../utils/errors';
import {
  Timestamp,
  CollectionReference,
} from 'firebase-admin/firestore';

// Coleções do Firestore
const PAYMENTS_COLLECTION = 'payments';

// Constantes para validação
const VALID_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
const MAX_AMOUNT = 1000000; // 1 milhão na moeda base
const MIN_AMOUNT = 0.01;
const MAX_METADATA_SIZE = 10000; // 10KB em caracteres

/**
 * Implementação do serviço de pagamentos utilizando Firebase
 */
export class FirebasePaymentService implements IPaymentService {
  private paymentsCollection: CollectionReference;
  private userPlanService: IUserPlanService;
  private pixPaymentService: IPixPaymentService | null = null;
  private paymentNotificationService: IPaymentNotificationService | null = null;

  /**
   * Construtor da classe FirebasePaymentService
   * @param userPlanService Serviço de planos de usuário (obrigatório)
   * @param pixPaymentService Serviço de pagamentos PIX (opcional)
   * @param paymentNotificationService Serviço de notificações de pagamento (opcional)
   */
  constructor(
    userPlanService: IUserPlanService,
    pixPaymentService?: IPixPaymentService,
    paymentNotificationService?: IPaymentNotificationService,
  ) {
    this.paymentsCollection = firestore.collection(PAYMENTS_COLLECTION);
    this.userPlanService = userPlanService;

    if (pixPaymentService) {
      this.pixPaymentService = pixPaymentService;
    }

    if (paymentNotificationService) {
      this.paymentNotificationService = paymentNotificationService;
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
      !VALID_CURRENCIES.includes(paymentData.currency as (typeof VALID_CURRENCIES)[number])
    ) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        `Moeda inválida. Valores permitidos: ${VALID_CURRENCIES.join(', ')}`,
      );
    }

    // Validação do método de pagamento
    if (
      paymentData.paymentMethod &&
      !Object.values(PaymentMethod).includes(paymentData.paymentMethod)
    ) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        `Método de pagamento inválido. Valores permitidos: ${Object.values(PaymentMethod).join(', ')}`,
      );
    }

    // Validação de desconto
    if (paymentData.discountAmount !== undefined) {
      if (
        typeof paymentData.discountAmount !== 'number' ||
        isNaN(paymentData.discountAmount) ||
        paymentData.discountAmount < 0 ||
        paymentData.discountAmount > paymentData.amount!
      ) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'DiscountAmount deve ser um número não negativo e não pode ser maior que o amount.',
        );
      }
    }

    // Validação do valor original
    if (paymentData.originalAmount !== undefined) {
      if (
        typeof paymentData.originalAmount !== 'number' ||
        isNaN(paymentData.originalAmount) ||
        paymentData.originalAmount <= 0 ||
        paymentData.originalAmount > MAX_AMOUNT
      ) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          `OriginalAmount deve ser um número positivo e não pode ser maior que ${MAX_AMOUNT}.`,
        );
      }
    }

    // Validação de metadata
    if (paymentData.metadata) {
      const metadataSize = JSON.stringify(paymentData.metadata).length;
      if (metadataSize > MAX_METADATA_SIZE) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          `Metadata muito grande. Tamanho máximo permitido: ${MAX_METADATA_SIZE} caracteres.`,
        );
      }
    }
  }

  /**
   * Valida a transição de status de um pagamento
   * @param currentStatus Status atual
   * @param newStatus Novo status
   * @throws {AppError} Erro caso a transição seja inválida
   */
  private validateStatusTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): void {
    if (currentStatus === newStatus) {
      return; // Mesmo status, nada a fazer
    }

    // Definir transições válidas por status atual
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [
        PaymentStatus.APPROVED,
        PaymentStatus.REJECTED,
        PaymentStatus.CANCELLED,
      ],
      [PaymentStatus.APPROVED]: [PaymentStatus.REFUNDED, PaymentStatus.CHARGEBACK],
      [PaymentStatus.REJECTED]: [
        PaymentStatus.PENDING, // Pode tentar novamente
      ],
      [PaymentStatus.REFUNDED]: [],
      [PaymentStatus.CANCELLED]: [
        PaymentStatus.PENDING, // Pode reativar
      ],
      [PaymentStatus.CHARGEBACK]: [
        PaymentStatus.APPROVED, // Resolve chargeback
      ],
      [PaymentStatus.FAILED]: [
        PaymentStatus.PENDING, // Pode tentar novamente
      ]
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw createError(
        ErrorCodes.FORBIDDEN,
        `Transição de status inválida: ${currentStatus} -> ${newStatus}`,
      );
    }
  }

  /**
   * Envia uma notificação sobre mudança de status do pagamento
   * @param payment Pagamento atualizado
   */
  private async sendPaymentStatusNotification(payment: Payment): Promise<void> {
    if (!this.paymentNotificationService) {
      logger.warn(
        'Serviço de notificação não disponível, não é possível enviar notificação de pagamento',
      );
      return;
    }

    try {
      if (payment.status === PaymentStatus.APPROVED) {
        await this.paymentNotificationService.notifyPaymentReceived(
          payment.userId,
          payment.id,
          payment.amount,
          payment.planId || ''
        );
      } else if (payment.status === PaymentStatus.REJECTED) {
        await this.paymentNotificationService.notifyPaymentFailed(
          payment.userId,
          payment.id,
          payment.amount,
          payment.failureReason || 'Pagamento falhou.'
        );
      }
    } catch (error) {
      logger.error(`Erro ao enviar notificação de pagamento: ${error}`);
    }
  }

  /**
   * Cria um novo pagamento
   * @param paymentData Dados do pagamento
   * @returns Pagamento criado
   */
  async createPayment(paymentData: CreatePaymentPayload): Promise<Payment> {
    try {
      // Validar os dados do pagamento
      this.validatePaymentData(paymentData);

      // Criar o documento do pagamento
      const paymentRef = this.paymentsCollection.doc();
      const now = Timestamp.now();

      const newPayment: Payment = {
        id: paymentRef.id,
        userId: paymentData.userId,
        planId: paymentData.planId,
        description: paymentData.description || null,
        userPlanId: paymentData.userPlanId || null,
        invoiceId: null,
        couponId: paymentData.couponId || null,
        originalAmount: paymentData.originalAmount || paymentData.amount,
        discountAmount: paymentData.discountAmount || 0,
        amount: paymentData.amount,
        currency: paymentData.currency || 'BRL',
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
        createdAt: now,
        updatedAt: now,
        refundedBy: null,
        refundTransactionId: null,
      };

      // Salvar o pagamento no Firestore
      await paymentRef.set(newPayment);

      // Enviar notificação de pagamento pendente
      await this.sendPaymentStatusNotification(newPayment);

      logger.info(`Pagamento criado com sucesso: ${newPayment.id}`);
      return newPayment;
    } catch (error) {
      logger.error(`Erro ao criar pagamento: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao criar pagamento: ${error}`);
    }
  }

  /**
   * Obtém um pagamento pelo seu ID
   * @param paymentId ID do pagamento
   * @returns Pagamento encontrado ou null
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    try {
      const paymentDoc = await this.paymentsCollection.doc(paymentId).get();
      if (!paymentDoc.exists) {
        return null;
      }

      return paymentDoc.data() as Payment;
    } catch (error) {
      logger.error(`Erro ao buscar pagamento por ID ${paymentId}: ${error}`);
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao buscar pagamento: ${error}`);
    }
  }

  /**
   * Obtém pagamentos de um usuário
   * @param userId ID do usuário
   * @returns Lista de pagamentos do usuário
   */
  async getPaymentsByUserId(userId: string): Promise<Payment[]> {
    try {
      const snapshot = await this.paymentsCollection
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as Payment);
    } catch (error) {
      logger.error(`Erro ao buscar pagamentos do usuário ${userId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao buscar pagamentos do usuário: ${error}`,
      );
    }
  }

  /**
   * Obtém pagamentos associados a um plano de usuário
   * @param userPlanId ID do plano do usuário
   * @returns Lista de pagamentos do plano de usuário
   */
  async getPaymentsByUserPlanId(userPlanId: string): Promise<Payment[]> {
    try {
      const snapshot = await this.paymentsCollection
        .where('userPlanId', '==', userPlanId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as Payment);
    } catch (error) {
      logger.error(`Erro ao buscar pagamentos do plano de usuário ${userPlanId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao buscar pagamentos do plano de usuário: ${error}`,
      );
    }
  }

  /**
   * Atualiza um pagamento existente
   * @param paymentId ID do pagamento
   * @param updates Dados a serem atualizados
   * @returns Pagamento atualizado ou null
   */
  async updatePayment(paymentId: string, updates: UpdatePaymentPayload): Promise<Payment | null> {
    try {
      const paymentRef = this.paymentsCollection.doc(paymentId);
      const paymentDoc = await paymentRef.get();

      if (!paymentDoc.exists) {
        return null;
      }

      const currentPayment = paymentDoc.data() as Payment;

      // Validar a transição de status, se houver
      if (updates.status && updates.status !== currentPayment.status) {
        this.validateStatusTransition(currentPayment.status, updates.status);
      }

      // Preparar dados de atualização com conversões de timestamp
      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Converter objetos Date para Firestore Timestamps
      if (updates.paidAt) {
        updateData.paidAt = Timestamp.fromDate(updates.paidAt);
      }
      if (updates.refundedAt) {
        updateData.refundedAt = Timestamp.fromDate(updates.refundedAt);
      }
      if (updates.cancelledAt) {
        updateData.cancelledAt = Timestamp.fromDate(updates.cancelledAt);
      }
      if (updates.chargebackAt) {
        updateData.chargebackAt = Timestamp.fromDate(updates.chargebackAt);
      }
      if (updates.processedAt) {
        updateData.processedAt = Timestamp.fromDate(updates.processedAt);
      }

      await paymentRef.update(updateData);

      // Buscar documento atualizado
      const updatedPaymentDoc = await paymentRef.get();
      const updatedPayment = updatedPaymentDoc.data() as Payment;

      // Se o status mudou, enviar notificação
      if (updates.status && updates.status !== currentPayment.status) {
        await this.sendPaymentStatusNotification(updatedPayment);
      }

      return updatedPayment;
    } catch (error) {
      logger.error(`Erro ao atualizar pagamento ${paymentId}: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao atualizar pagamento: ${error}`);
    }
  }

  /**
   * Aprova um pagamento
   * @param paymentId ID do pagamento
   * @param externalId ID externo do gateway de pagamento
   * @param transactionData Dados da transação
   * @param receiptUrl URL do recibo
   * @returns Pagamento aprovado ou null
   */
  async approvePayment(
    paymentId: string,
    externalId?: string,
    transactionData?: Record<string, any>,
    receiptUrl?: string,
  ): Promise<Payment | null> {
    try {
      const payment = await this.getPaymentById(paymentId);

      if (!payment) {
        return null;
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw createError(
          ErrorCodes.FORBIDDEN,
          `Não é possível aprovar um pagamento com status ${payment.status}`,
        );
      }

      const updateData: UpdatePaymentPayload = {
        status: PaymentStatus.APPROVED,
        paidAt: new Date(),
        processedAt: new Date(),
      };

      if (externalId) {
        updateData.externalId = externalId;
      }

      if (transactionData) {
        updateData.transactionData = transactionData;
      }

      if (receiptUrl) {
        updateData.receiptUrl = receiptUrl;
      }

      const updatedPayment = await this.updatePayment(paymentId, updateData);

      // Se o pagamento estiver associado a um plano de usuário, atualizar o status do plano
      if (updatedPayment && updatedPayment.userPlanId) {
        try {
          await this.userPlanService.updateUserPlanStatus(
            updatedPayment.userPlanId,
            UserPlanStatus.ACTIVE,
          );
        } catch (error) {
          logger.error(
            `Erro ao atualizar status do plano do usuário após aprovação de pagamento: ${error}`,
          );
        }
      }

      return updatedPayment;
    } catch (error) {
      logger.error(`Erro ao aprovar pagamento ${paymentId}: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao aprovar pagamento: ${error}`);
    }
  }

  /**
   * Rejeita um pagamento
   * @param paymentId ID do pagamento
   * @param failureReason Motivo da falha
   * @param transactionData Dados da transação
   * @returns Pagamento rejeitado ou null
   */
  async rejectPayment(
    paymentId: string,
    failureReason: string,
    transactionData?: Record<string, any>,
  ): Promise<Payment | null> {
    try {
      const payment = await this.getPaymentById(paymentId);

      if (!payment) {
        return null;
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw createError(
          ErrorCodes.FORBIDDEN,
          `Não é possível rejeitar um pagamento com status ${payment.status}`,
        );
      }

      const updateData: UpdatePaymentPayload = {
        status: PaymentStatus.REJECTED,
        failureReason,
        processedAt: new Date(),
      };

      if (transactionData) {
        updateData.transactionData = transactionData;
      }

      const updatedPayment = await this.updatePayment(paymentId, updateData);

      // Se o pagamento estiver associado a um plano de usuário, atualizar o status do plano
      if (updatedPayment && updatedPayment.userPlanId) {
        try {
          await this.userPlanService.updateUserPlanStatus(
            updatedPayment.userPlanId,
            UserPlanStatus.PENDING_PAYMENT,
          );
        } catch (error) {
          logger.error(
            `Erro ao atualizar status do plano do usuário após rejeição de pagamento: ${error}`,
          );
        }
      }

      return updatedPayment;
    } catch (error) {
      logger.error(`Erro ao rejeitar pagamento ${paymentId}: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao rejeitar pagamento: ${error}`);
    }
  }

  /**
   * Reembolsa um pagamento
   * @param paymentId ID do pagamento
   * @param refundReason Motivo do reembolso
   * @param gatewayTransactionId ID da transação no gateway
   * @param adminUserId ID do usuário administrador que autorizou o reembolso
   * @returns Pagamento reembolsado ou null
   */
  async refundPayment(
    paymentId: string,
    refundReason: string,
    gatewayTransactionId?: string,
    adminUserId?: string,
  ): Promise<Payment | null> {
    try {
      const payment = await this.getPaymentById(paymentId);

      if (!payment) {
        return null;
      }

      if (payment.status !== PaymentStatus.APPROVED) {
        throw createError(
          ErrorCodes.FORBIDDEN,
          `Não é possível reembolsar um pagamento com status ${payment.status}`,
        );
      }

      const updateData: UpdatePaymentPayload = {
        status: PaymentStatus.REFUNDED,
        refundReason,
        refundedAt: new Date(),
        refundedBy: adminUserId,
      };

      if (gatewayTransactionId) {
        updateData.refundTransactionId = gatewayTransactionId;
        updateData.transactionData = {
          ...(payment.transactionData || {}),
          refund: {
            transactionId: gatewayTransactionId,
            createdAt: new Date(),
          }
        };
      }

      const updatedPayment = await this.updatePayment(paymentId, updateData);

      // Se o pagamento estiver associado a um plano de usuário, tratar mudança de plano
      if (updatedPayment && updatedPayment.userPlanId) {
        // TODO: Implementar lógica de alteração de plano após reembolso, se necessário
      }

      return updatedPayment;
    } catch (error) {
      logger.error(`Erro ao reembolsar pagamento ${paymentId}: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao reembolsar pagamento: ${error}`);
    }
  }

  /**
   * Cancela um pagamento
   * @param paymentId ID do pagamento
   * @param reason Motivo do cancelamento
   * @returns Pagamento cancelado ou null
   */
  async cancelPayment(paymentId: string, reason: string): Promise<Payment | null> {
    try {
      const payment = await this.getPaymentById(paymentId);

      if (!payment) {
        return null;
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw createError(
          ErrorCodes.FORBIDDEN,
          `Não é possível cancelar um pagamento com status ${payment.status}`,
        );
      }

      const updateData: UpdatePaymentPayload = {
        status: PaymentStatus.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
      };

      const updatedPayment = await this.updatePayment(paymentId, updateData);

      // Se o pagamento for por PIX e tiver um serviço de PIX disponível, cancelar também o PIX
      if (
        updatedPayment &&
        updatedPayment.paymentMethod === PaymentMethod.PIX &&
        this.pixPaymentService
      ) {
        // TODO: Implementar cancelamento de pagamento Pix, se necessário
      }

      // Se o pagamento estiver associado a um plano de usuário, atualizar o status do plano
      if (updatedPayment && updatedPayment.userPlanId) {
        try {
          await this.userPlanService.updateUserPlanStatus(
            updatedPayment.userPlanId,
            UserPlanStatus.CANCELLED,
            reason,
          );
        } catch (error) {
          logger.error(
            `Erro ao atualizar status do plano do usuário após cancelamento de pagamento: ${error}`,
          );
        }
      }

      return updatedPayment;
    } catch (error) {
      logger.error(`Erro ao cancelar pagamento ${paymentId}: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao cancelar pagamento: ${error}`);
    }
  }

  /**
   * Lista pagamentos com filtros
   * @param options Opções de filtragem e paginação
   * @returns Resultado paginado de pagamentos
   */
  async listPayments(options: ListPaymentsOptions = {}): Promise<PaginatedPaymentsResult> {
    const {
      userId,
      planId,
      status,
      paymentMethod,
      startDate,
      endDate,
      limit = 20,
      page = 1,
      startAfter,
    } = options;

    try {
      // Collection de pagamentos
      const paymentsCollection = firestore.collection('payments');

      // Inicia a consulta
      let query = paymentsCollection.orderBy('createdAt', 'desc');

      // Adiciona filtros
      if (userId) {
        query = query.where('userId', '==', userId);
      }

      if (planId) {
        query = query.where('planId', '==', planId);
      }

      if (status) {
        query = query.where('status', '==', status);
      }

      if (paymentMethod) {
        query = query.where('paymentMethod', '==', paymentMethod);
      }

      if (startDate) {
        const startTimestamp = Timestamp.fromDate(startDate);
        query = query.where('createdAt', '>=', startTimestamp);
      }

      if (endDate) {
        const endTimestamp = Timestamp.fromDate(endDate);
        query = query.where('createdAt', '<=', endTimestamp);
      }

      // Se startAfter foi fornecido, obtenha o documento para iniciar após ele
      if (startAfter) {
        const startAfterDoc = await firestore.collection('payments').doc(startAfter).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      } else if (page > 1) {
        // Se é uma página posterior e não temos startAfter, calculamos o offset
        // Isso é menos eficiente que usar startAfter com cursores
        const offset = (page - 1) * limit;
        // Note: Firestore não tem suporte nativo para offset
        // Isso é uma simulação e não é recomendado para grandes datasets
        const docs = await query.limit(offset + limit).get();
        let docsArray = docs.docs;

        if (docsArray.length <= offset) {
          return {
            payments: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          };
        }

        docsArray = docsArray.slice(offset);

        const payments = docsArray.map(doc => {
          const data = doc.data() as Payment;
          return { ...data, id: doc.id };
        });

        // Obter contagem total (note: isso é ineficiente em Firestore)
        const countQuery = await paymentsCollection.get();
        const totalCount = countQuery.size;
        const totalPages = Math.ceil(totalCount / limit);

        return {
          payments,
          total: totalCount,
          page,
          limit,
          totalPages,
          nextPageStartAfter: payments.length > 0 ? payments[payments.length - 1].id : undefined,
        };
      }

      // Limite o número de resultados
      const limitedQuery = query.limit(limit);

      // Execute a consulta
      const querySnapshot = await limitedQuery.get();

      // Transforme os documentos em objetos Payment
      const payments = querySnapshot.docs.map(doc => {
        const data = doc.data() as Payment;
        return { ...data, id: doc.id };
      });

      // Obter contagem total (note: isso é ineficiente em Firestore)
      const countSnapshot = await paymentsCollection.get();
      const totalCount = countSnapshot.size;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        payments,
        total: totalCount,
        page,
        limit,
        totalPages,
        nextPageStartAfter: payments.length > 0 ? payments[payments.length - 1].id : undefined,
      };
    } catch (error) {
      logger.error(`Erro ao listar pagamentos: ${error}`);
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao listar pagamentos: ${error}`);
    }
  }

  /**
   * Obtém um pagamento pelo ID externo do gateway
   * @param externalId ID externo do gateway
   * @returns Pagamento encontrado ou null
   */
  async getPaymentByExternalId(externalId: string): Promise<Payment | null> {
    try {
      const snapshot = await this.paymentsCollection
        .where('externalId', '==', externalId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as Payment;
    } catch (error) {
      logger.error(`Erro ao buscar pagamento por externalId ${externalId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao buscar pagamento por ID externo: ${error}`,
      );
    }
  }

  /**
   * Processa um pagamento
   * @param paymentId ID do pagamento
   * @returns Resultado do processamento
   */
  async processPayment(paymentId: string): Promise<PaymentProcessResult> {
    try {
      const payment = await this.getPaymentById(paymentId);

      if (!payment) {
        throw createError(ErrorCodes.NOT_FOUND, `Pagamento ${paymentId} não encontrado`);
      }

      if (payment.status !== PaymentStatus.PENDING) {
        return {
          success: false,
          payment,
          error: `Pagamento já processado com status: ${payment.status}`,
        };
      }

      // Obter o plano do usuário se disponível
      let userPlan = null;
      if (payment.userPlanId) {
        userPlan = await this.userPlanService.getUserPlanById(payment.userPlanId);
      }

      // Processar de acordo com o método de pagamento
      switch (payment.paymentMethod) {
      case PaymentMethod.PIX:
        // O usuário deverá fazer o pagamento PIX, retornar dados para gerar QR code
        return {
          success: true,
          payment,
          userPlan: userPlan || undefined,
          pixQrCode: payment.pixCode || undefined,
          pixCopiaECola: payment.pixCode || undefined,
          expirationDate: payment.pixExpirationDate?.toDate(),
          };

      case PaymentMethod.CREDIT_CARD:
        // Para cartão de crédito, normalmente já terá sido processado pelo gateway antes,
        // mas se necessário, pode-se implementar aqui
        return {
          success: true,
          payment,
          userPlan: userPlan || undefined,
          };

      case PaymentMethod.ADMIN:
        // Aprovar automaticamente pagamentos administrativos
        const approvedPayment = await this.approvePayment(payment.id, 'admin_approval', {
          approvedByAdmin: true,
        });
        return {
          success: true,
          payment: approvedPayment || (() => { throw new Error('Pagamento aprovado não encontrado'); })(),
          userPlan: userPlan || undefined,
          };

      case PaymentMethod.FREE:
        // Aprovar automaticamente pagamentos gratuitos
        const freePayment = await this.approvePayment(payment.id, 'free_plan', {
          freeSubscription: true,
        });
        return {
          success: true,
          payment: freePayment || (() => { throw new Error('Pagamento gratuito não encontrado'); })(),
          userPlan: userPlan || undefined,
          };

      default:
        return {
          success: false,
          payment,
          error: `Método de pagamento não suportado: ${payment.paymentMethod}`,
          };
      }
    } catch (error) {
      logger.error(`Erro ao processar pagamento ${paymentId}: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao processar pagamento: ${error}`);
    }
  }

  async handlePaymentWebhook(): Promise<any> {
    throw new Error('handlePaymentWebhook não implementado');
  }
}
