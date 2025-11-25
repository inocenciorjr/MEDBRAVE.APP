import { supabase } from '../../../config/supabase';
import {
  Invoice,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  InvoiceItem,
  InvoiceStatus,
  PaymentStatus,
} from '../../../domain/payment/types';
import { IInvoiceService } from '../../../domain/payment/interfaces/IInvoiceService';
import { IPaymentService } from '../../../domain/payment/interfaces/IPaymentService';
import logger from '../../../utils/logger';
import { AppError, ErrorCodes } from '../../../utils/errors';

/**
 * Tabela do Supabase para faturas
 */
const INVOICES_TABLE = 'invoices';

/**
 * Implementação do serviço de faturas utilizando Supabase
 */
export class SupabaseInvoiceService implements IInvoiceService {
  private paymentService: IPaymentService | null = null;

  /**
   * Construtor da classe SupabaseInvoiceService
   * @param paymentService Serviço de pagamentos (opcional)
   */
  constructor(paymentService?: IPaymentService) {
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
        throw new AppError(
          400,
          'ID do usuário é obrigatório',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      if (!invoiceData.items || invoiceData.items.length === 0) {
        throw new AppError(
          400,
          'É necessário incluir pelo menos um item na fatura',
          ErrorCodes.VALIDATION_ERROR,
        );
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

      const now = new Date();

      // Criar a fatura
      const newInvoiceData = {
        invoice_number: invoiceData.invoiceNumber || `INV-${Date.now()}`,
        user_id: invoiceData.userId,
        user_plan_id: invoiceData.userPlanId || null,
        status: invoiceData.status || InvoiceStatus.PENDING,
        items: JSON.stringify(items),
        total_amount: totalAmount,
        discount_amount: discountAmount,
        discount_reason: invoiceData.discountReason || null,
        net_amount: netAmount,
        tax_amount: invoiceData.taxAmount || 0,
        issue_date: invoiceData.issueDate || now,
        due_date: invoiceData.dueDate || null,
        paid_at: null,
        paid_amount: 0,
        payment_id: null,
        notes: invoiceData.notes || null,
        metadata: invoiceData.metadata
          ? JSON.stringify(invoiceData.metadata)
          : null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from(INVOICES_TABLE)
        .insert(newInvoiceData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const invoice = this.mapDatabaseToInvoice(data);
      logger.info(
        `Fatura ${invoice.invoiceNumber} (ID: ${invoice.id}) criada com sucesso para o usuário ${invoiceData.userId}.`,
      );
      return invoice;
    } catch (error) {
      logger.error(`Erro ao criar fatura: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        500,
        `Erro ao criar fatura: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtém uma fatura pelo seu ID
   * @param invoiceId ID da fatura
   * @returns Fatura encontrada ou null
   */
  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from(INVOICES_TABLE)
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(error.message);
      }

      return this.mapDatabaseToInvoice(data);
    } catch (error) {
      logger.error(`Erro ao buscar fatura por ID ${invoiceId}: ${error}`);
      throw new AppError(
        500,
        `Erro ao buscar fatura: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtém uma fatura pelo seu número
   * @param invoiceNumber Número da fatura
   * @returns Fatura encontrada ou null
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from(INVOICES_TABLE)
        .select('*')
        .eq('invoice_number', invoiceNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(error.message);
      }

      return this.mapDatabaseToInvoice(data);
    } catch (error) {
      logger.error(
        `Erro ao buscar fatura pelo número ${invoiceNumber}: ${error}`,
      );
      throw new AppError(
        500,
        `Erro ao buscar fatura por número: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtém faturas por ID de usuário
   * @param userId ID do usuário
   * @returns Lista de faturas encontradas
   */
  async getInvoicesByUserId(userId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from(INVOICES_TABLE)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }

      return data.map((item) => this.mapDatabaseToInvoice(item));
    } catch (error) {
      logger.error(`Erro ao buscar faturas do usuário ${userId}: ${error}`);
      throw new AppError(
        500,
        `Erro ao buscar faturas do usuário: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Atualiza uma fatura existente
   * @param invoiceId ID da fatura
   * @param updates Dados a serem atualizados
   * @returns Fatura atualizada ou null
   */
  async updateInvoice(
    invoiceId: string,
    updates: UpdateInvoicePayload,
  ): Promise<Invoice | null> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);

      if (!invoice) {
        return null;
      }

      // Validar status da fatura para atualizações
      if (invoice.status === InvoiceStatus.PAID) {
        throw new AppError(
          409,
          'Não é possível atualizar uma fatura que já foi paga',
          'INVALID_OPERATION',
        );
      }

      const updateData: Record<string, any> = {
        updated_at: new Date(),
      };

      // Mapear campos de atualização
      // Campos não presentes no UpdateInvoicePayload removidos
      if (updates.status !== undefined) {
        updateData.status = updates.status;
      }
      if (updates.discountReason !== undefined) {
        updateData.discount_reason = updates.discountReason;
      }
      if (updates.taxAmount !== undefined) {
        updateData.tax_amount = updates.taxAmount;
      }
      if (updates.issueDate !== undefined) {
        updateData.issue_date = updates.issueDate;
      }
      if (updates.dueDate !== undefined) {
        updateData.due_date = updates.dueDate;
      }
      if (updates.paidAt !== undefined) {
        updateData.paid_at = updates.paidAt;
      }
      if (updates.paidAmount !== undefined) {
        updateData.paid_amount = updates.paidAmount;
      }
      if (updates.paymentId !== undefined) {
        updateData.payment_id = updates.paymentId;
      }
      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }
      if (updates.metadata !== undefined) {
        updateData.metadata = updates.metadata
          ? JSON.stringify(updates.metadata)
          : null;
      }

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

        updateData.items = JSON.stringify(items);
        updateData.total_amount = totalAmount;

        // Recalcular valor líquido com base no desconto existente ou fornecido
        const discountAmount =
          updates.discountAmount !== undefined
            ? updates.discountAmount
            : invoice.discountAmount || 0;

        updateData.discount_amount = discountAmount;
        updateData.net_amount = totalAmount - discountAmount;
      } else if (updates.discountAmount !== undefined) {
        // Se apenas o desconto foi alterado, recalcular valor líquido
        updateData.discount_amount = updates.discountAmount;
        updateData.net_amount = invoice.totalAmount - updates.discountAmount;
      }

      const { data, error } = await supabase
        .from(INVOICES_TABLE)
        .update(updateData)
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return this.mapDatabaseToInvoice(data);
    } catch (error) {
      logger.error(`Erro ao atualizar fatura ${invoiceId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        500,
        `Erro ao atualizar fatura: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
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
          throw new AppError(
            404,
            `Pagamento (ID: ${paymentId}) não encontrado`,
            ErrorCodes.NOT_FOUND,
          );
        }

        if (payment.status !== PaymentStatus.APPROVED) {
          throw new AppError(
            409,
            `Pagamento (ID: ${paymentId}) não está aprovado. Status atual: ${payment.status}`,
            'INVALID_OPERATION',
          );
        }
      }

      const actualPaidAmount =
        paidAmount !== undefined ? paidAmount : invoice.netAmount;
      const actualPaidAt = paidAt || new Date();

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
      throw new AppError(
        500,
        `Erro ao marcar fatura como paga: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Marca uma fatura como cancelada
   * @param invoiceId ID da fatura
   * @param reason Motivo do cancelamento
   * @returns Fatura atualizada ou null
   */
  async cancelInvoice(
    invoiceId: string,
    reason?: string,
  ): Promise<Invoice | null> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);

      if (!invoice) {
        return null;
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new AppError(
          409,
          'Não é possível cancelar uma fatura que já foi paga. Realize um reembolso.',
          'INVALID_OPERATION',
        );
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
      throw new AppError(
        500,
        `Erro ao cancelar fatura: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
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

  /**
   * Mapeia dados do banco para a entidade Invoice
   * @param data Dados do banco
   * @returns Entidade Invoice
   */
  private mapDatabaseToInvoice(data: any): Invoice {
    return {
      id: data.id,
      invoiceNumber: data.invoice_number,
      userId: data.user_id,
      userPlanId: data.user_plan_id,
      status: data.status,
      items: JSON.parse(data.items || '[]'),
      totalAmount: data.total_amount,
      discountAmount: data.discount_amount,
      discountReason: data.discount_reason,
      netAmount: data.net_amount,
      taxAmount: data.tax_amount,
      issueDate: new Date(data.issue_date),
      dueDate: data.due_date ? new Date(data.due_date) : null,
      paidAt: data.paid_at ? new Date(data.paid_at) : null,
      paidAmount: data.paid_amount,
      paymentId: data.payment_id,
      notes: data.notes,
      metadata: data.metadata ? JSON.parse(data.metadata) : null,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
