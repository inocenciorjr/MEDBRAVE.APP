import { firestore } from '../../../config/firebaseAdmin';
import { PixPayment, PaymentStatus, CreatePixPaymentPayload, PaymentProcessResult } from '../types';
import { IPixPaymentService } from '../interfaces/IPixPaymentService';
import { IPaymentService } from '../interfaces/IPaymentService';
import logger from '../../../utils/logger';
import { ErrorCodes, createError } from '../../../utils/errors';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Coleção do Firestore para pagamentos PIX
 */
const PIX_PAYMENTS_COLLECTION = 'pixPayments';

/**
 * Implementação do serviço de pagamentos PIX utilizando Firebase
 */
export class FirebasePixPaymentService implements IPixPaymentService {
  private pixPaymentsCollection;
  private paymentService: IPaymentService | null = null;

  /**
   * Construtor da classe FirebasePixPaymentService
   * @param paymentService Serviço de pagamentos (opcional)
   */
  constructor(paymentService?: IPaymentService) {
    this.pixPaymentsCollection = firestore.collection(PIX_PAYMENTS_COLLECTION);

    if (paymentService) {
      this.paymentService = paymentService;
    }
  }

  /**
   * Cria um novo pagamento PIX
   * @param paymentData Dados do pagamento PIX
   * @returns Pagamento PIX criado
   */
  async createPixPayment(paymentData: CreatePixPaymentPayload): Promise<PixPayment> {
    try {
      const pixPaymentRef = this.pixPaymentsCollection.doc();
      const now = Timestamp.now();

      // Validação básica de dados
      if (!paymentData.paymentId) {
        throw createError(ErrorCodes.VALIDATION_ERROR, 'ID do pagamento principal é obrigatório');
      }

      // Gerar expirationDate a partir de expirationHours ou usar Timestamp.now()
      let expirationDate = Timestamp.now();
      if (paymentData.expirationHours && typeof paymentData.expirationHours === 'number') {
        const now = new Date();
        now.setHours(now.getHours() + paymentData.expirationHours);
        expirationDate = Timestamp.fromDate(now);
      }

      // Gerar campos obrigatórios do PixPayment
      const newPixPayment: PixPayment = {
        id: pixPaymentRef.id,
        paymentId: paymentData.paymentId,
        txid: '', // Gerar ou obter de integração real
        qrCode: '', // Gerar ou obter de integração real
        qrCodeUrl: '', // Gerar ou obter de integração real
        copyPasteText: '', // Gerar ou obter de integração real
        expirationDate: expirationDate,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };

      await pixPaymentRef.set(newPixPayment);
      logger.info(
        `Pagamento PIX criado com sucesso: ${newPixPayment.id} para o pagamento ${paymentData.paymentId}`,
      );

      // Atualizar o pagamento principal
      if (this.paymentService) {
        try {
          await this.paymentService.updatePayment(paymentData.paymentId, {
            pixCode: '', // Gerar ou obter de integração real
            pixExpirationDate: undefined, // Gerar ou obter de integração real
          });
        } catch (error) {
          logger.error(`Erro ao atualizar pagamento principal com dados PIX: ${error}`);
        }
      }

      return newPixPayment;
    } catch (error) {
      logger.error(`Erro ao criar pagamento PIX: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao criar pagamento PIX: ${error}`);
    }
  }

  /**
   * Obtém um pagamento PIX pelo seu ID
   * @param paymentId ID do pagamento PIX
   * @returns Pagamento PIX encontrado ou null
   */
  async getPixPaymentById(paymentId: string): Promise<PixPayment | null> {
    try {
      const pixPaymentDoc = await this.pixPaymentsCollection.doc(paymentId).get();

      if (!pixPaymentDoc.exists) {
        return null;
      }

      return pixPaymentDoc.data() as PixPayment;
    } catch (error) {
      logger.error(`Erro ao buscar pagamento PIX por ID ${paymentId}: ${error}`);
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao buscar pagamento PIX: ${error}`);
    }
  }

  /**
   * Obtém um pagamento PIX pelo ID do pagamento principal
   * @param paymentId ID do pagamento principal
   * @returns Pagamento PIX encontrado ou null
   */
  async getPixPaymentByPaymentId(paymentId: string): Promise<PixPayment | null> {
    try {
      const snapshot = await this.pixPaymentsCollection
        .where('paymentId', '==', paymentId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as PixPayment;
    } catch (error) {
      logger.error(`Erro ao buscar pagamento PIX por PaymentId ${paymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao buscar pagamento PIX por PaymentId: ${error}`,
      );
    }
  }

  /**
   * Atualiza um pagamento PIX existente
   * @param paymentId ID do pagamento PIX
   * @param updates Dados a serem atualizados
   * @returns Pagamento PIX atualizado ou null
   */
  async updatePixPayment(
    paymentId: string,
    updates: Partial<Omit<PixPayment, 'id' | 'createdAt'>>,
  ): Promise<PixPayment | null> {
    try {
      const pixPaymentRef = this.pixPaymentsCollection.doc(paymentId);
      const pixPaymentDoc = await pixPaymentRef.get();

      if (!pixPaymentDoc.exists) {
        return null;
      }

      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Converter Date para Timestamp se presente
      if (updates.expirationDate instanceof Date) {
        updateData.expirationDate = Timestamp.fromDate(updates.expirationDate);
      }

      await pixPaymentRef.update(updateData);

      const updatedPixPaymentDoc = await pixPaymentRef.get();
      return updatedPixPaymentDoc.data() as PixPayment;
    } catch (error) {
      logger.error(`Erro ao atualizar pagamento PIX ${paymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao atualizar pagamento PIX: ${error}`,
      );
    }
  }

  /**
   * Verifica se um pagamento PIX está expirado
   * @param payment Pagamento PIX a ser verificado
   * @returns true se o pagamento estiver expirado, false caso contrário
   */
  isPixPaymentExpired(payment: PixPayment): boolean {
    if (payment.status !== 'ACTIVE') {
      return payment.status === 'EXPIRED';
    }

    try {
      const expDate = payment.expirationDate.toDate();
      return !isNaN(expDate.getTime()) && expDate < new Date();
    } catch (error) {
      logger.error(`Erro ao verificar expiração do PIX para ID ${payment.id}: ${error}`);
      return true; // Assume expirado em caso de erro
    }
  }

  /**
   * Verifica e marca um pagamento PIX como expirado se necessário
   * @param paymentId ID do pagamento PIX
   * @returns true se o pagamento foi marcado como expirado, false caso contrário
   */
  async checkAndMarkPixPaymentAsExpired(paymentId: string): Promise<boolean> {
    try {
      const payment = await this.getPixPaymentById(paymentId);

      if (!payment) {
        return false;
      }

      if (payment.status === 'ACTIVE' && this.isPixPaymentExpired(payment)) {
        await this.updatePixPayment(paymentId, { status: 'EXPIRED' });

        // Atualizar o pagamento principal
        if (this.paymentService) {
          try {
            const mainPayment = await this.paymentService.getPaymentById(payment.paymentId);
            if (mainPayment && mainPayment.status === PaymentStatus.PENDING) {
              await this.paymentService.updatePayment(payment.paymentId, {
                status: PaymentStatus.REJECTED,
                failureReason: 'PIX Expirado',
              });
            }
          } catch (error) {
            logger.error(`Erro ao atualizar pagamento principal após expiração do PIX: ${error}`);
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Erro ao verificar e marcar PIX como expirado ${paymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao verificar expiração de PIX: ${error}`,
      );
    }
  }

  /**
   * Aprova um pagamento PIX
   * @param paymentId ID do pagamento PIX
   * @param transactionId ID da transação
   * @param endToEndId ID end-to-end (opcional)
   * @returns Pagamento PIX aprovado ou null
   */
  async approvePixPayment(
    paymentId: string,
    transactionId: string,
    endToEndId?: string,
  ): Promise<PixPayment> {
    try {
      const payment = await this.getPixPaymentById(paymentId);

      if (!payment) {
        throw createError(ErrorCodes.NOT_FOUND, `Pagamento PIX ${paymentId} não encontrado`);
      }

      if (payment.status !== 'ACTIVE') {
        logger.warn(
          `Apenas pagamentos PIX ativos podem ser aprovados. Status atual: ${payment.status}`,
        );
        await this.checkAndMarkPixPaymentAsExpired(paymentId);
        throw createError(ErrorCodes.VALIDATION_ERROR, 'Pagamento PIX expirado');
      }

      const updates: Partial<PixPayment> = {
        status: 'COMPLETED',
      };

      const updatedPixPayment = await this.updatePixPayment(paymentId, updates);

      // Atualizar o pagamento principal
      if (updatedPixPayment && this.paymentService) {
        try {
          const mainPayment = await this.paymentService.getPaymentById(payment.paymentId);
          if (mainPayment && mainPayment.status === PaymentStatus.PENDING) {
            await this.paymentService.updatePayment(payment.paymentId, {
              status: PaymentStatus.APPROVED,
              paidAt: new Date(),
              externalId: transactionId,
              transactionData: {
                ...(mainPayment.transactionData || {}),
                pixEndToEndId: endToEndId,
                pixTransactionId: transactionId,
              },
            });
          }
        } catch (error) {
          logger.error(`Erro ao atualizar pagamento principal após aprovação do PIX: ${error}`);
        }
      }

      if (!updatedPixPayment) throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Erro ao aprovar pagamento PIX');
      return updatedPixPayment;
    } catch (error) {
      logger.error(`Erro ao aprovar pagamento PIX ${paymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao aprovar pagamento PIX: ${error}`,
      );
    }
  }

  /**
   * Cancela um pagamento PIX pendente
   * @param paymentId ID do pagamento PIX
   * @returns Pagamento PIX cancelado ou null
   */
  async cancelPixPayment(paymentId: string): Promise<PixPayment | null> {
    try {
      const payment = await this.getPixPaymentById(paymentId);

      if (!payment) {
        return null;
      }

      if (payment.status !== 'ACTIVE') {
        logger.warn(
          `Apenas pagamentos PIX ativos podem ser cancelados. Status atual: ${payment.status}`,
        );
        return null;
      }

      const updatedPixPayment = await this.updatePixPayment(paymentId, {
        status: 'CANCELLED',
      });

      // Atualizar o pagamento principal
      if (updatedPixPayment && this.paymentService) {
        try {
          const mainPayment = await this.paymentService.getPaymentById(payment.paymentId);
          if (mainPayment && mainPayment.status === PaymentStatus.PENDING) {
            await this.paymentService.updatePayment(payment.paymentId, {
              status: PaymentStatus.CANCELLED,
              cancelledAt: new Date(),
              cancellationReason: 'PIX Cancelado pelo usuário ou sistema',
            });
          }
        } catch (error) {
          logger.error(`Erro ao atualizar pagamento principal após cancelamento do PIX: ${error}`);
        }
      }

      return updatedPixPayment;
    } catch (error) {
      logger.error(`Erro ao cancelar pagamento PIX ${paymentId}: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao cancelar pagamento PIX: ${error}`,
      );
    }
  }

  /**
   * Verifica e atualiza o status de todos os pagamentos PIX pendentes que estão expirados
   * @returns Número de pagamentos PIX atualizados
   */
  async checkAndUpdateExpiredPixPayments(): Promise<number> {
    try {
      const now = Timestamp.now();
      const snapshot = await this.pixPaymentsCollection
        .where('status', '==', 'ACTIVE')
        .where('expirationDate', '<', now)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = firestore.batch();
      const expiredPaymentIds: string[] = [];

      snapshot.forEach(doc => {
        const pixPayment = doc.data() as PixPayment;
        expiredPaymentIds.push(pixPayment.paymentId);

        batch.update(doc.ref, {
          status: 'EXPIRED',
          updatedAt: now,
        });
      });

      await batch.commit();
      logger.info(`${snapshot.size} pagamentos PIX marcados como expirados`);

      // Atualizar os pagamentos principais
      if (this.paymentService) {
        for (const paymentId of expiredPaymentIds) {
          try {
            const mainPayment = await this.paymentService.getPaymentById(paymentId);
            if (mainPayment && mainPayment.status === PaymentStatus.PENDING) {
              await this.paymentService.updatePayment(paymentId, {
                status: PaymentStatus.REJECTED,
                failureReason: 'PIX Expirado',
              });
            }
          } catch (error) {
            logger.error(
              `Erro ao atualizar pagamento principal ${paymentId} após expiração do PIX: ${error}`,
            );
          }
        }
      }

      return snapshot.size;
    } catch (error) {
      logger.error(`Erro ao verificar e atualizar PIXs expirados: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao verificar PIXs expirados: ${error}`,
      );
    }
  }

  // Adicionar método stub para satisfazer a interface
  async generatePixQrCode(): Promise<PaymentProcessResult> {
    return {
      success: false,
      payment: {} as any,
      error: 'Not implemented',
    };
  }
}
