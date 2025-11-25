import {
  CreatePixPaymentPayload,
  PaymentProcessResult,
  PixPayment,
} from '../types';

/**
 * Interface para o serviço de pagamentos PIX
 */
export interface IPixPaymentService {
  /**
   * Cria um pagamento PIX
   * @param data Dados do pagamento PIX
   * @returns Pagamento PIX criado
   */
  createPixPayment(data: CreatePixPaymentPayload): Promise<PixPayment>;

  /**
   * Obtém um pagamento PIX pelo ID
   * @param pixPaymentId ID do pagamento PIX
   * @returns Pagamento PIX encontrado ou null
   */
  getPixPaymentById(pixPaymentId: string): Promise<PixPayment | null>;

  /**
   * Obtém um pagamento PIX pelo ID do pagamento principal
   * @param paymentId ID do pagamento principal
   * @returns Pagamento PIX encontrado ou null
   */
  getPixPaymentByPaymentId(paymentId: string): Promise<PixPayment | null>;

  /**
   * Aprova um pagamento PIX
   * @param pixPaymentId ID do pagamento PIX
   * @param transactionId ID da transação
   * @param endToEndId ID end-to-end da transação PIX
   * @returns Pagamento PIX atualizado
   */
  approvePixPayment(
    pixPaymentId: string,
    transactionId: string,
    endToEndId?: string,
  ): Promise<PixPayment>;

  /**
   * Gera um novo QR Code PIX para um pagamento
   * @param paymentId ID do pagamento
   * @returns Resultado do processamento
   */
  generatePixQrCode(paymentId: string): Promise<PaymentProcessResult>;
}
