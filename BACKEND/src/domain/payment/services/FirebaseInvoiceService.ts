import { firestore } from '../../../config/firebaseAdmin';
import {
  Invoice,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  InvoiceItem,
  InvoiceStatus,
  PaymentStatus,
} from '../types';
import { IInvoiceService } from '../interfaces/IInvoiceService';
import { IPaymentService } from '../interfaces/IPaymentService';
import logger from '../../../utils/logger';
import { AppError, ErrorCodes } from '../../../utils/errors';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Coleção do Firestore para faturas
 */
const INVOICES_COLLECTION = 'invoices';

/**
 * Implementação do serviço de faturas utilizando Firebase
 */
export class FirebaseInvoiceService implements IInvoiceService {
  private invoicesCollection;
  private paymentService: IPaymentService | null = null;

  /**
   * Construtor da classe FirebaseInvoiceService
   * @param paymentService Serviço de pagamentos (opcional)
   */
  constructor(paymentService?: IPaymentService) {
    this.invoicesCollection = firestore.collection(INVOICES_COLLECTION);

    if (paymentService) {
      this.paymentService = paymentService;
    }
  }

  /**
   * Cria uma nova fatura
   * @param invoiceData Dados da fatura
   * @returns Fatura criada
   */
  async createInvoice(invoiceData: CreateInvoicePayload): Promise<Invoice> {
    try {
      // Validação básica de dados
      if (!invoiceData.userId) {
        throw new AppError(400, 'ID do usuário é obrigatório', ErrorCodes.VALIDATION_ERROR);
      }

      if (!invoiceData.items || invoiceData.items.length === 0) {
        throw new AppError(400, 'É necessário incluir pelo menos um item na fatura', ErrorCodes.VALIDATION_ERROR);
      }

      // Calcular valores totais
      let totalAmount = 0;
      const items: InvoiceItem[] = [];

      for (const item of invoiceData.items) {
        const subtotal = item.quantity * item.unitPrice;
        const itemWithSubtotal: InvoiceItem = {
          ...item,
          subtotal,
        };
        items.push(itemWithSubtotal);
        totalAmount += subtotal;
      }

      // Aplicar desconto (se houver)
      let discountAmount = 0;
      if (invoiceData.discountAmount && invoiceData.discountAmount > 0) {
        discountAmount = invoiceData.discountAmount;
        // Garantir que o desconto não seja maior que o valor total
        if (discountAmount > totalAmount) {
          discountAmount = totalAmount;
        }
      }

      // Calcular valor líquido
      const netAmount = totalAmount - discountAmount;

      // Criar referência do documento
      const invoiceRef = this.invoicesCollection.doc();
      const now = Timestamp.now();

      // Converter data de vencimento para timestamp
      const dueDate =
        invoiceData.dueDate instanceof Date
          ? Timestamp.fromDate(invoiceData.dueDate)
          : invoiceData.dueDate || null;

      const issueDate =
        invoiceData.issueDate instanceof Date
          ? Timestamp.fromDate(invoiceData.issueDate)
          : invoiceData.issueDate || now;

      // Criar a fatura
      const newInvoice: Invoice = {
        id: invoiceRef.id,
        invoiceNumber: invoiceData.invoiceNumber || `INV-${Date.now()}`,
        userId: invoiceData.userId,
        userPlanId: invoiceData.userPlanId || null,
        status: invoiceData.status || InvoiceStatus.PENDING,
        items,
        totalAmount,
        discountAmount,
        discountReason: invoiceData.discountReason || null,
        netAmount,
        taxAmount: invoiceData.taxAmount || 0,
        issueDate,
        dueDate,
        paidAt: null,
        paidAmount: 0,
        paymentId: null,
        notes: invoiceData.notes || null,
        metadata: invoiceData.metadata || null,
        createdAt: now,
        updatedAt: now,
      };

      await invoiceRef.set(newInvoice);
      logger.info(
        `Fatura ${newInvoice.invoiceNumber} (ID: ${newInvoice.id}) criada com sucesso para o usuário ${invoiceData.userId}.`,
      );
      return newInvoice;
    } catch (error) {
      logger.error(`Erro ao criar fatura: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, `Erro ao criar fatura: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtém uma fatura pelo seu ID
   * @param invoiceId ID da fatura
   * @returns Fatura encontrada ou null
   */
  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    try {
      const invoiceDoc = await this.invoicesCollection.doc(invoiceId).get();

      if (!invoiceDoc.exists) {
        return null;
      }

      return invoiceDoc.data() as Invoice;
    } catch (error) {
      logger.error(`Erro ao buscar fatura por ID ${invoiceId}: ${error}`);
      throw new AppError(500, `Erro ao buscar fatura: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtém uma fatura pelo seu número
   * @param invoiceNumber Número da fatura
   * @returns Fatura encontrada ou null
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
    try {
      const snapshot = await this.invoicesCollection
        .where('invoiceNumber', '==', invoiceNumber)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as Invoice;
    } catch (error) {
      logger.error(`Erro ao buscar fatura pelo número ${invoiceNumber}: ${error}`);
      throw new AppError(500, `Erro ao buscar fatura por número: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtém faturas por ID de usuário
   * @param userId ID do usuário
   * @returns Lista de faturas encontradas
   */
  async getInvoicesByUserId(userId: string): Promise<Invoice[]> {
    try {
      const snapshot = await this.invoicesCollection.where('userId', '==', userId).get();
      return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as Invoice);
    } catch (error) {
      logger.error(`Erro ao buscar faturas do usuário ${userId}: ${error}`);
      throw new AppError(500, `Erro ao buscar faturas do usuário: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Atualiza uma fatura existente
   * @param invoiceId ID da fatura
   * @param updates Dados a serem atualizados
   * @returns Fatura atualizada ou null
   */
  async updateInvoice(invoiceId: string, updates: UpdateInvoicePayload): Promise<Invoice | null> {
    try {
      const invoiceRef = this.invoicesCollection.doc(invoiceId);
      const invoiceDoc = await invoiceRef.get();

      if (!invoiceDoc.exists) {
        return null;
      }

      const invoice = invoiceDoc.data() as Invoice;

      // Validar status da fatura para atualizações
      if (invoice.status === InvoiceStatus.PAID) {
        throw new AppError(409, 'Não é possível atualizar uma fatura que já foi paga', 'INVALID_OPERATION');
      }

      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Atualizar itens (se fornecidos) e recalcular valores
      if (updates.items) {
        let totalAmount = 0;
        const items: InvoiceItem[] = [];

        for (const item of updates.items) {
          const subtotal = item.quantity * item.unitPrice;
          const itemWithSubtotal: InvoiceItem = {
            ...item,
            subtotal,
          };
          items.push(itemWithSubtotal);
          totalAmount += subtotal;
        }

        updateData.items = items;
        updateData.totalAmount = totalAmount;

        // Recalcular valor líquido com base no desconto existente ou fornecido
        const discountAmount =
          updates.discountAmount !== undefined
            ? updates.discountAmount
            : invoice.discountAmount || 0;

        updateData.discountAmount = discountAmount;
        updateData.netAmount = totalAmount - discountAmount;
      } else if (updates.discountAmount !== undefined) {
        // Se apenas o desconto foi alterado, recalcular valor líquido
        updateData.netAmount = invoice.totalAmount - updates.discountAmount;
      }

      // Converter data de vencimento para timestamp
      if (updates.dueDate instanceof Date) {
        updateData.dueDate = Timestamp.fromDate(updates.dueDate);
      }

      // Converter data de emissão para timestamp
      if (updates.issueDate instanceof Date) {
        updateData.issueDate = Timestamp.fromDate(updates.issueDate);
      }

      // Converter data de pagamento para timestamp
      if (updates.paidAt instanceof Date) {
        updateData.paidAt = Timestamp.fromDate(updates.paidAt);
      } else if (updates.paidAt === null) {
        updateData.paidAt = null;
      }

      await invoiceRef.update(updateData);

      const updatedInvoiceDoc = await invoiceRef.get();
      return updatedInvoiceDoc.data() as Invoice;
    } catch (error) {
      logger.error(`Erro ao atualizar fatura ${invoiceId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, `Erro ao atualizar fatura: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Marca uma fatura como paga
   * @param invoiceId ID da fatura
   * @param paymentId ID do pagamento
   * @param paidAmount Valor pago
   * @param paidAt Data do pagamento
   * @returns Fatura atualizada ou null
   */
  async markInvoiceAsPaid(
    invoiceId: string,
    paymentId: string,
    paidAmount?: number,
    paidAt?: Date,
  ): Promise<Invoice | null> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);

      if (!invoice) {
        return null;
      }

      if (invoice.status === InvoiceStatus.PAID) {
        logger.warn(`Fatura ${invoiceId} já está marcada como paga.`);
        return invoice;
      }

      // Verificar o pagamento associado
      if (this.paymentService) {
        const payment = await this.paymentService.getPaymentById(paymentId);
        if (!payment) {
          throw new AppError(404, `Pagamento (ID: ${paymentId}) não encontrado`, ErrorCodes.NOT_FOUND);
        }

        if (payment.status !== PaymentStatus.APPROVED) {
          throw new AppError(409, `Pagamento (ID: ${paymentId}) não está aprovado. Status atual: ${payment.status}`, 'INVALID_OPERATION');
        }
      }

      const actualPaidAmount = paidAmount !== undefined ? paidAmount : invoice.netAmount;
      const actualPaidAt = paidAt ? Timestamp.fromDate(paidAt) : Timestamp.now();

      const updateData: UpdateInvoicePayload = {
        status: InvoiceStatus.PAID,
        paymentId,
        paidAmount: actualPaidAmount,
        paidAt: actualPaidAt,
      };

      return this.updateInvoice(invoiceId, updateData);
    } catch (error) {
      logger.error(`Erro ao marcar fatura ${invoiceId} como paga: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, `Erro ao marcar fatura como paga: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Marca uma fatura como cancelada
   * @param invoiceId ID da fatura
   * @param reason Motivo do cancelamento
   * @returns Fatura atualizada ou null
   */
  async cancelInvoice(invoiceId: string, reason?: string): Promise<Invoice | null> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);

      if (!invoice) {
        return null;
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new AppError(409, 'Não é possível cancelar uma fatura que já foi paga. Realize um reembolso.', 'INVALID_OPERATION');
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        logger.warn(`Fatura ${invoiceId} já está cancelada.`);
        return invoice;
      }

      const updateData: UpdateInvoicePayload = {
        status: InvoiceStatus.CANCELLED,
        notes: reason
          ? invoice.notes
            ? `${invoice.notes}\nCancelamento: ${reason}`
            : `Cancelamento: ${reason}`
          : invoice.notes || undefined,
      };

      return this.updateInvoice(invoiceId, updateData);
    } catch (error) {
      logger.error(`Erro ao cancelar fatura ${invoiceId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, `Erro ao cancelar fatura: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  // Métodos stub para compatibilidade com a interface IInvoiceService
  async generateOrRetrieveInvoice(): Promise<any> {
    throw new Error('Not implemented');
  }
  async getInvoiceByPaymentId(): Promise<any> {
    throw new Error('Not implemented');
  }
  async updateInvoiceStatus(): Promise<any> {
    throw new Error('Not implemented');
  }
  async generateInvoicePdf(): Promise<any> {
    throw new Error('Not implemented');
  }
}
