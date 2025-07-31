import { Invoice } from '../types';

/**
 * Interface para o serviço de faturas
 */
export interface IInvoiceService {
  /**
   * Gera uma fatura para um pagamento ou recupera uma existente
   * @param paymentId ID do pagamento
   * @returns Fatura gerada ou existente
   */
  generateOrRetrieveInvoice(paymentId: string): Promise<Invoice | null>;

  /**
   * Obtém uma fatura pelo ID
   * @param invoiceId ID da fatura
   * @returns Fatura encontrada ou null
   */
  getInvoiceById(invoiceId: string): Promise<Invoice | null>;

  /**
   * Obtém uma fatura pelo ID do pagamento
   * @param paymentId ID do pagamento
   * @returns Fatura encontrada ou null
   */
  getInvoiceByPaymentId(paymentId: string): Promise<Invoice | null>;

  /**
   * Lista faturas de um usuário
   * @param userId ID do usuário
   * @returns Lista de faturas
   */
  getInvoicesByUserId(userId: string): Promise<Invoice[]>;

  /**
   * Atualiza o status de uma fatura
   * @param invoiceId ID da fatura
   * @param paymentStatus Novo status de pagamento
   * @returns Fatura atualizada
   */
  updateInvoiceStatus(invoiceId: string, paymentStatus: string): Promise<Invoice>;

  /**
   * Gera um PDF da fatura
   * @param invoiceId ID da fatura
   * @returns URL do PDF gerado
   */
  generateInvoicePdf(invoiceId: string): Promise<string>;
}
