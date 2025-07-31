import { CreateCreditCardPaymentPayload, CreditCardPayment, PaymentProcessResult } from '../types';

/**
 * Interface para o serviço de pagamentos com cartão de crédito
 */
export interface ICreditCardPaymentService {
  /**
   * Cria um pagamento com cartão de crédito
   * @param data Dados do pagamento com cartão
   * @returns Pagamento com cartão criado
   */
  createCreditCardPayment(data: CreateCreditCardPaymentPayload): Promise<CreditCardPayment>;

  /**
   * Obtém um pagamento com cartão pelo ID
   * @param creditCardPaymentId ID do pagamento com cartão
   * @returns Pagamento com cartão encontrado ou null
   */
  getCreditCardPaymentById(creditCardPaymentId: string): Promise<CreditCardPayment | null>;

  /**
   * Obtém um pagamento com cartão pelo ID do pagamento principal
   * @param paymentId ID do pagamento principal
   * @returns Pagamento com cartão encontrado ou null
   */
  getCreditCardPaymentByPaymentId(paymentId: string): Promise<CreditCardPayment | null>;

  /**
   * Autoriza um pagamento com cartão
   * @param creditCardPaymentId ID do pagamento com cartão
   * @param transactionId ID da transação
   * @param authorizationCode Código de autorização
   * @returns Pagamento com cartão atualizado
   */
  authorizeCreditCardPayment(
    creditCardPaymentId: string,
    transactionId: string,
    authorizationCode: string,
  ): Promise<CreditCardPayment>;

  /**
   * Captura um pagamento com cartão previamente autorizado
   * @param creditCardPaymentId ID do pagamento com cartão
   * @param transactionId ID da transação de captura
   * @returns Pagamento com cartão atualizado
   */
  captureCreditCardPayment(
    creditCardPaymentId: string,
    transactionId: string,
  ): Promise<CreditCardPayment>;

  /**
   * Rejeita um pagamento com cartão
   * @param creditCardPaymentId ID do pagamento com cartão
   * @param errorCode Código de erro
   * @param errorMessage Mensagem de erro
   * @returns Pagamento com cartão atualizado
   */
  rejectCreditCardPayment(
    creditCardPaymentId: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<CreditCardPayment>;

  /**
   * Processa um pagamento com cartão
   * @param paymentId ID do pagamento
   * @param cardToken Token do cartão ou ID do cartão salvo
   * @param installments Número de parcelas
   * @returns Resultado do processamento
   */
  processCreditCardPayment(
    paymentId: string,
    cardToken: string,
    installments: number,
  ): Promise<PaymentProcessResult>;
}
