import { firestore } from '../../../config/firebaseAdmin';
import {
  PaymentStatus,
  CreateCreditCardPaymentPayload,
  CreditCardPayment,
} from '../types';
import { ICreditCardPaymentService } from '../interfaces/ICreditCardPaymentService';
import { IPaymentService } from '../interfaces/IPaymentService';
import logger from '../../../utils/logger';
import { ErrorCodes, createError } from '../../../utils/errors';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Coleção do Firestore para pagamentos com cartão de crédito
 */
const CREDIT_CARD_PAYMENTS_COLLECTION = 'creditCardPayments';

/**
 * Implementação do serviço de pagamentos por cartão de crédito utilizando Firebase
 */
export class FirebaseCreditCardPaymentService implements ICreditCardPaymentService {
  private creditCardPaymentsCollection;
  private paymentService: IPaymentService | null = null;

  /**
   * Construtor da classe FirebaseCreditCardPaymentService
   * @param paymentService Serviço de pagamentos (opcional)
   */
  constructor(paymentService?: IPaymentService) {
    this.creditCardPaymentsCollection = firestore.collection(CREDIT_CARD_PAYMENTS_COLLECTION);

    if (paymentService) {
      this.paymentService = paymentService;
    }
  }

  /**
   * Cria um novo pagamento por cartão de crédito
   * @param paymentData Dados do pagamento por cartão de crédito
   * @returns Pagamento por cartão de crédito criado
   */
  async createCreditCardPayment(
    paymentData: CreateCreditCardPaymentPayload,
  ): Promise<CreditCardPayment> {
    try {
      const paymentRef = this.creditCardPaymentsCollection.doc();
      const now = Timestamp.now();

      // Validação básica de dados
      if (!paymentData.paymentId) {
        throw createError(ErrorCodes.VALIDATION_ERROR, 'ID do pagamento principal é obrigatório');
      }

      if (!paymentData.cardHolderName) {
        throw createError(ErrorCodes.VALIDATION_ERROR, 'Nome do titular do cartão é obrigatório');
      }

      if (!paymentData.cardLastFourDigits) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Últimos 4 dígitos do cartão são obrigatórios',
        );
      }

      if (!paymentData.cardBrand) {
        throw createError(ErrorCodes.VALIDATION_ERROR, 'Bandeira do cartão é obrigatória');
      }

      if (!paymentData.installments || paymentData.installments < 1) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Número de parcelas deve ser maior que zero',
        );
      }

      const newPayment: CreditCardPayment = {
        id: paymentRef.id,
        paymentId: paymentData.paymentId,
        cardHolderName: paymentData.cardHolderName,
        cardLastFourDigits: paymentData.cardLastFourDigits,
        cardBrand: paymentData.cardBrand,
        installments: paymentData.installments,
        status: 'PENDING',
        transactionId: null,
        authorizationCode: null,
        nsu: null,
        acquirerName: null,
        paymentMethodId: paymentData.paymentMethodId || null,
        statementDescriptor: paymentData.statementDescriptor || null,
        gatewayResponse: null,
        errorCode: null,
        errorMessage: null,
        refundId: null,
        refundAmount: null,
        createdAt: now,
        updatedAt: now,
      };

      await paymentRef.set(newPayment);
      logger.info(
        `Pagamento por cartão de crédito criado com sucesso: ${newPayment.id} para o pagamento ${paymentData.paymentId}`,
      );

      // Atualizar o pagamento principal com os dados do cartão
      if (this.paymentService) {
        try {
          await this.paymentService.updatePayment(paymentData.paymentId, {
            cardLastFourDigits: paymentData.cardLastFourDigits,
            cardBrand: paymentData.cardBrand,
            installments: paymentData.installments,
          });
        } catch (error) {
          logger.error(`Erro ao atualizar pagamento principal com dados do cartão: ${error}`);
        }
      }

      return newPayment;
    } catch (error) {
      logger.error(`Erro ao criar pagamento por cartão de crédito: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao criar pagamento por cartão de crédito: ${error}`,
      );
    }
  }

  /**
   * Obtém um pagamento por cartão de crédito pelo seu ID
   * @param paymentId ID do pagamento por cartão de crédito
   * @returns Pagamento por cartão de crédito encontrado ou null
   */
  async getCreditCardPaymentById(paymentId: string): Promise<CreditCardPayment | null> {
    try {
      const paymentDoc = await this.creditCardPaymentsCollection.doc(paymentId).get();

      if (!paymentDoc.exists) {
        return null;
      }

      return paymentDoc.data() as CreditCardPayment;
    } catch (error) {
      logger.error(`Erro ao buscar pagamento por cartão de crédito por ID ${paymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao buscar pagamento por cartão de crédito: ${error}`,
      );
    }
  }

  /**
   * Obtém um pagamento por cartão de crédito pelo ID do pagamento principal
   * @param paymentId ID do pagamento principal
   * @returns Pagamento por cartão de crédito encontrado ou null
   */
  async getCreditCardPaymentByPaymentId(paymentId: string): Promise<CreditCardPayment | null> {
    try {
      const snapshot = await this.creditCardPaymentsCollection
        .where('paymentId', '==', paymentId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as CreditCardPayment;
    } catch (error) {
      logger.error(
        `Erro ao buscar pagamento por cartão de crédito por PaymentId ${paymentId}: ${error}`,
      );
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao buscar pagamento por cartão de crédito por PaymentId: ${error}`,
      );
    }
  }

  /**
   * Atualiza um pagamento por cartão de crédito existente
   * @param paymentId ID do pagamento por cartão de crédito
   * @param updates Dados a serem atualizados
   * @returns Pagamento por cartão de crédito atualizado ou null
   */
  async updateCreditCardPayment(
    paymentId: string,
    updates: Partial<Omit<CreditCardPayment, 'id' | 'createdAt'>>,
  ): Promise<CreditCardPayment | null> {
    try {
      const paymentRef = this.creditCardPaymentsCollection.doc(paymentId);
      const paymentDoc = await paymentRef.get();

      if (!paymentDoc.exists) {
        return null;
      }

      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await paymentRef.update(updateData);

      const updatedPaymentDoc = await paymentRef.get();
      return updatedPaymentDoc.data() as CreditCardPayment;
    } catch (error) {
      logger.error(`Erro ao atualizar pagamento por cartão de crédito ${paymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao atualizar pagamento por cartão de crédito: ${error}`,
      );
    }
  }

  /**
   * Atualiza o status de um pagamento por cartão de crédito
   * @param paymentId ID do pagamento por cartão de crédito
   * @param status Novo status
   * @param details Detalhes adicionais para atualização
   * @returns Pagamento por cartão de crédito atualizado ou null
   */
  async updateCreditCardPaymentStatus(
    paymentId: string,
    status: string,
    details?: Partial<CreditCardPayment>,
  ): Promise<CreditCardPayment | null> {
    try {
      const payment = await this.getCreditCardPaymentById(paymentId);

      if (!payment) {
        return null;
      }

      const updates: Partial<CreditCardPayment> = {
        status: status.toUpperCase(),
      };

      if (details) {
        if (details.transactionId !== undefined) {
updates.transactionId = details.transactionId;
}
        if (details.authorizationCode !== undefined) {
updates.authorizationCode = details.authorizationCode;
}
        if (details.nsu !== undefined) {
updates.nsu = details.nsu;
}
        if (details.gatewayResponse !== undefined) {
updates.gatewayResponse = details.gatewayResponse;
}
        if (details.errorCode !== undefined) {
updates.errorCode = details.errorCode;
}
        if (details.errorMessage !== undefined) {
updates.errorMessage = details.errorMessage;
}
        if (details.refundId !== undefined) {
updates.refundId = details.refundId;
}
        if (details.refundAmount !== undefined) {
updates.refundAmount = details.refundAmount;
}
        if (details.acquirerName !== undefined) {
updates.acquirerName = details.acquirerName;
}
        if (details.paymentMethodId !== undefined) {
updates.paymentMethodId = details.paymentMethodId;
}
        if (details.statementDescriptor !== undefined) {
updates.statementDescriptor = details.statementDescriptor;
}
      }

      // Limpar campos de erro se o status for bem-sucedido
      if (
        status === 'AUTHORIZED' ||
        status === 'CAPTURED'
      ) {
        updates.errorCode = null;
        updates.errorMessage = null;
      }

      return this.updateCreditCardPayment(paymentId, updates);
    } catch (error) {
      logger.error(
        `Erro ao atualizar status do pagamento por cartão de crédito ${paymentId}: ${error}`,
      );
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao atualizar status do pagamento por cartão de crédito: ${error}`,
      );
    }
  }

  /**
   * Autoriza um pagamento por cartão de crédito (primeiro passo no processamento)
   * @param creditCardPaymentId ID do pagamento por cartão de crédito
   * @param transactionId ID da transação
   * @param authorizationCode Código de autorização
   * @returns Pagamento por cartão de crédito atualizado
   */
  async authorizeCreditCardPayment(
    creditCardPaymentId: string,
    transactionId: string,
    authorizationCode: string,
  ): Promise<CreditCardPayment> {
    try {
      const payment = await this.getCreditCardPaymentById(creditCardPaymentId);

      if (!payment) {
        throw createError(ErrorCodes.NOT_FOUND, 'Pagamento por cartão de crédito não encontrado');
      }

      if (payment.status !== 'PENDING') {
        logger.warn(
          `Apenas pagamentos de cartão de crédito pendentes podem ser autorizados. Status atual: ${payment.status}`,
        );
        throw createError(ErrorCodes.CONFLICT, 'Pagamento não está pendente para autorização');
      }

      const updated = await this.updateCreditCardPaymentStatus(creditCardPaymentId, 'AUTHORIZED', {
        transactionId,
        authorizationCode,
      });
      if (!updated) throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Falha ao autorizar pagamento');
      return updated;
    } catch (error) {
      logger.error(`Erro ao autorizar pagamento por cartão de crédito ${creditCardPaymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao autorizar pagamento por cartão de crédito: ${error}`,
      );
    }
  }

  /**
   * Captura um pagamento por cartão de crédito previamente autorizado (segundo passo)
   * @param creditCardPaymentId ID do pagamento por cartão de crédito
   * @param transactionId ID da transação
   * @returns Pagamento por cartão de crédito atualizado
   */
  async captureCreditCardPayment(
    creditCardPaymentId: string,
    transactionId: string,
  ): Promise<CreditCardPayment> {
    try {
      const payment = await this.getCreditCardPaymentById(creditCardPaymentId);

      if (!payment) {
        throw createError(ErrorCodes.NOT_FOUND, 'Pagamento por cartão de crédito não encontrado');
      }

      if (payment.status !== 'AUTHORIZED') {
        logger.warn(
          `Apenas pagamentos de cartão de crédito autorizados podem ser capturados. Status atual: ${payment.status}`,
        );
        throw createError(ErrorCodes.CONFLICT, 'Pagamento não está autorizado para captura');
      }

      const updatedCCPayment = await this.updateCreditCardPaymentStatus(
        creditCardPaymentId,
        'CAPTURED',
        {
          transactionId,
        },
      );
      if (!updatedCCPayment) throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Falha ao capturar pagamento');

      // Atualizar o pagamento principal para aprovado
      if (updatedCCPayment && this.paymentService) {
        try {
          const mainPayment = await this.paymentService.getPaymentById(payment.paymentId);
          if (mainPayment && mainPayment.status === PaymentStatus.PENDING) {
            await this.paymentService.updatePayment(payment.paymentId, {
              status: PaymentStatus.APPROVED,
              paidAt: new Date(),
              externalId: updatedCCPayment.transactionId || undefined,
              transactionData: {
                ...(mainPayment.transactionData || {}),
                creditCardCapture: updatedCCPayment.gatewayResponse,
              },
            });
          }
        } catch (error) {
          logger.error(
            `Erro ao atualizar pagamento principal após captura do cartão de crédito: ${error}`,
          );
        }
      }

      return updatedCCPayment;
    } catch (error) {
      logger.error(`Erro ao capturar pagamento por cartão de crédito ${creditCardPaymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao capturar pagamento por cartão de crédito: ${error}`,
      );
    }
  }

  /**
   * Rejeita um pagamento por cartão de crédito
   * @param creditCardPaymentId ID do pagamento por cartão de crédito
   * @param errorCode Código de erro
   * @param errorMessage Mensagem de erro
   * @returns Pagamento por cartão de crédito atualizado
   */
  async rejectCreditCardPayment(
    creditCardPaymentId: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<CreditCardPayment> {
    try {
      const payment = await this.getCreditCardPaymentById(creditCardPaymentId);

      if (!payment) {
        throw createError(ErrorCodes.NOT_FOUND, 'Pagamento por cartão de crédito não encontrado');
      }

      if (
        payment.status !== 'PENDING' &&
        payment.status !== 'AUTHORIZED'
      ) {
        logger.warn(
          `Apenas pagamentos pendentes ou autorizados podem ser rejeitados. Status atual: ${payment.status}`,
        );
        throw createError(ErrorCodes.CONFLICT, 'Pagamento não está pendente/autorizado para rejeição');
      }

      const updatedCCPayment = await this.updateCreditCardPaymentStatus(
        creditCardPaymentId,
        'REJECTED',
        {
          errorCode,
          errorMessage,
        },
      );
      if (!updatedCCPayment) throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Falha ao rejeitar pagamento');

      // Atualizar o pagamento principal para rejeitado
      if (updatedCCPayment && this.paymentService) {
        try {
          const mainPayment = await this.paymentService.getPaymentById(payment.paymentId);
          if (mainPayment && mainPayment.status === PaymentStatus.PENDING) {
            await this.paymentService.updatePayment(payment.paymentId, {
              status: PaymentStatus.REJECTED,
              failureReason: errorMessage,
              transactionData: {
                ...(mainPayment.transactionData || {}),
                creditCardRejection: {
                  errorCode,
                  errorMessage,
                },
              },
            });
          }
        } catch (error) {
          logger.error(
            `Erro ao atualizar pagamento principal após rejeição do cartão de crédito: ${error}`,
          );
        }
      }

      return updatedCCPayment;
    } catch (error) {
      logger.error(`Erro ao rejeitar pagamento por cartão de crédito ${creditCardPaymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao rejeitar pagamento por cartão de crédito: ${error}`,
      );
    }
  }

  /**
   * Reembolsa um pagamento por cartão de crédito
   * @param paymentId ID do pagamento por cartão de crédito
   * @param refundId ID do reembolso
   * @param refundAmount Valor do reembolso (opcional)
   * @param gatewayResponse Resposta do gateway (opcional)
   * @returns Pagamento por cartão de crédito atualizado ou null
   */
  async refundCreditCardPayment(
    paymentId: string,
    refundId: string,
    refundAmount?: number,
    gatewayResponse?: Record<string, any>,
  ): Promise<CreditCardPayment | null> {
    try {
      const payment = await this.getCreditCardPaymentById(paymentId);

      if (!payment) {
        return null;
      }

      if (payment.status !== 'CAPTURED') {
        logger.warn(
          `Apenas pagamentos capturados podem ser reembolsados. Status atual: ${payment.status}`,
        );
        return null;
      }

      const updatedCCPayment = await this.updateCreditCardPaymentStatus(
        paymentId,
        'REFUNDED',
        {
          refundId,
          refundAmount,
          gatewayResponse,
        },
      );

      // Atualizar o pagamento principal para reembolsado
      if (updatedCCPayment && this.paymentService) {
        try {
          const mainPayment = await this.paymentService.getPaymentById(payment.paymentId);
          if (mainPayment && mainPayment.status === PaymentStatus.APPROVED) {
            await this.paymentService.updatePayment(payment.paymentId, {
              status: PaymentStatus.REFUNDED,
              refundReason: 'Reembolso solicitado',
              refundedAt: new Date(),
              refundTransactionId: refundId,
              transactionData: {
                ...(mainPayment.transactionData || {}),
                creditCardRefund: {
                  refundId,
                  refundAmount,
                  refundDate: new Date(),
                  gatewayResponse,
                },
              },
            });
          }
        } catch (error) {
          logger.error(
            `Erro ao atualizar pagamento principal após reembolso do cartão de crédito: ${error}`,
          );
        }
      }

      return updatedCCPayment;
    } catch (error) {
      logger.error(`Erro ao reembolsar pagamento por cartão de crédito ${paymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao reembolsar pagamento por cartão de crédito: ${error}`,
      );
    }
  }

  /**
   * Cancela um pagamento por cartão de crédito
   * @param paymentId ID do pagamento por cartão de crédito
   * @param reason Motivo do cancelamento (opcional)
   * @param gatewayResponse Resposta do gateway (opcional)
   * @returns Pagamento por cartão de crédito atualizado ou null
   */
  async cancelCreditCardPayment(
    paymentId: string,
    reason?: string,
    gatewayResponse?: Record<string, any>,
  ): Promise<CreditCardPayment | null> {
    try {
      const payment = await this.getCreditCardPaymentById(paymentId);

      if (!payment) {
        return null;
      }

      if (
        payment.status !== 'PENDING' &&
        payment.status !== 'AUTHORIZED'
      ) {
        logger.warn(
          `Apenas pagamentos pendentes ou autorizados podem ser cancelados. Status atual: ${payment.status}`,
        );
        return null;
      }

      const updatedCCPayment = await this.updateCreditCardPaymentStatus(
        paymentId,
        'CANCELLED',
        {
          errorMessage: reason || 'Cancelado pelo usuário ou sistema',
          gatewayResponse,
        },
      );

      // Atualizar o pagamento principal para cancelado
      if (updatedCCPayment && this.paymentService) {
        try {
          const mainPayment = await this.paymentService.getPaymentById(payment.paymentId);
          if (
            mainPayment &&
            (mainPayment.status === PaymentStatus.PENDING ||
              mainPayment.status === PaymentStatus.APPROVED)
          ) {
            await this.paymentService.updatePayment(payment.paymentId, {
              status: PaymentStatus.CANCELLED,
              cancelledAt: new Date(),
              cancellationReason: reason || 'Pagamento por cartão de crédito cancelado',
              transactionData: {
                ...(mainPayment.transactionData || {}),
                creditCardCancellation: {
                  reason,
                  cancelledAt: new Date(),
                  gatewayResponse,
                },
              },
            });
          }
        } catch (error) {
          logger.error(
            `Erro ao atualizar pagamento principal após cancelamento do cartão de crédito: ${error}`,
          );
        }
      }

      return updatedCCPayment;
    } catch (error) {
      logger.error(`Erro ao cancelar pagamento por cartão de crédito ${paymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao cancelar pagamento por cartão de crédito: ${error}`,
      );
    }
  }

  /**
   * Marca um pagamento por cartão de crédito como chargeback
   * @param paymentId ID do pagamento por cartão de crédito
   * @param reason Motivo do chargeback
   * @param gatewayResponse Resposta do gateway (opcional)
   * @returns Pagamento por cartão de crédito atualizado ou null
   */
  async markCreditCardPaymentAsChargeback(
    paymentId: string,
    reason: string,
    gatewayResponse?: Record<string, any>,
  ): Promise<CreditCardPayment | null> {
    try {
      const payment = await this.getCreditCardPaymentById(paymentId);

      if (!payment) {
        return null;
      }

      if (
        payment.status !== 'CAPTURED' &&
        payment.status !== 'AUTHORIZED'
      ) {
        logger.warn(
          `Apenas pagamentos capturados ou autorizados podem ter chargeback. Status atual: ${payment.status}`,
        );
        return null;
      }

      const updatedCCPayment = await this.updateCreditCardPaymentStatus(
        paymentId,
        'CHARGEBACK',
        {
          errorMessage: reason,
          gatewayResponse,
        },
      );

      // Atualizar o pagamento principal para chargeback
      if (updatedCCPayment && this.paymentService) {
        try {
          const mainPayment = await this.paymentService.getPaymentById(payment.paymentId);
          if (mainPayment && mainPayment.status === PaymentStatus.APPROVED) {
            await this.paymentService.updatePayment(payment.paymentId, {
              status: PaymentStatus.CHARGEBACK,
              chargebackReason: reason,
              chargebackAt: new Date(),
              transactionData: {
                ...(mainPayment.transactionData || {}),
                creditCardChargeback: {
                  reason,
                  chargebackAt: new Date(),
                  gatewayResponse,
                },
              },
            });
          }
        } catch (error) {
          logger.error(
            `Erro ao atualizar pagamento principal após chargeback do cartão de crédito: ${error}`,
          );
        }
      }

      return updatedCCPayment;
    } catch (error) {
      logger.error(
        `Erro ao marcar pagamento por cartão de crédito como chargeback ${paymentId}: ${error}`,
      );
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao marcar pagamento por cartão de crédito como chargeback: ${error}`,
      );
    }
  }

  // Implementação mínima para processCreditCardPayment exigida pela interface
  async processCreditCardPayment(): Promise<import('../types').PaymentProcessResult> {
    throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, 'processCreditCardPayment não implementado');
  }
}
