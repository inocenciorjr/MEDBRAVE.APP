import {
  Payment,
  CreatePaymentPayload,
  UpdatePaymentPayload,
  PaymentProcessResult,
  ListPaymentsOptions,
  PaginatedPaymentsResult
} from '../types';

/**
 * Interface for Payment service implementations
 */
export interface IPaymentService {
  /**
   * Cria um novo pagamento
   * @param paymentData Dados do pagamento
   * @returns Pagamento criado
   */
  createPayment(paymentData: CreatePaymentPayload): Promise<Payment>;

  /**
   * Obtu00e9m um pagamento pelo ID
   * @param paymentId ID do pagamento
   * @returns Pagamento encontrado ou null
   */
  getPaymentById(paymentId: string): Promise<Payment | null>;

  /**
   * Lista pagamentos de um usuu00e1rio
   * @param userId ID do usuu00e1rio
   * @returns Lista de pagamentos
   */
  getPaymentsByUserId(userId: string): Promise<Payment[]>;

  /**
   * Lista pagamentos de um plano de usuu00e1rio
   * @param userPlanId ID do plano de usuu00e1rio
   * @returns Lista de pagamentos
   */
  getPaymentsByUserPlanId(userPlanId: string): Promise<Payment[]>;

  /**
   * Atualiza um pagamento
   * @param paymentId ID do pagamento
   * @param updates Dados de atualização
   * @returns Pagamento atualizado ou null se o pagamento não foi encontrado
   */
  updatePayment(paymentId: string, updates: UpdatePaymentPayload): Promise<Payment | null>;

  /**
   * Aprova um pagamento
   * @param paymentId ID do pagamento
   * @param externalId ID externo (opcional)
   * @param transactionData Dados da transação (opcional)
   * @param receiptUrl URL do recibo (opcional)
   * @returns Pagamento aprovado ou null se o pagamento não foi encontrado
   */
  approvePayment(
    paymentId: string, 
    externalId?: string, 
    transactionData?: Record<string, any>, 
    receiptUrl?: string
  ): Promise<Payment | null>;

  /**
   * Rejeita um pagamento
   * @param paymentId ID do pagamento
   * @param failureReason Motivo da falha
   * @param transactionData Dados da transação (opcional)
   * @returns Pagamento rejeitado ou null se o pagamento não foi encontrado
   */
  rejectPayment(
    paymentId: string, 
    failureReason: string, 
    transactionData?: Record<string, any>
  ): Promise<Payment | null>;

  /**
   * Reembolsa um pagamento
   * @param paymentId ID do pagamento
   * @param refundReason Motivo do reembolso
   * @param gatewayTransactionId ID da transação do gateway (opcional)
   * @param adminUserId ID do usuário administrador (opcional)
   * @returns Pagamento reembolsado ou null se o pagamento não foi encontrado
   */
  refundPayment(
    paymentId: string, 
    refundReason: string, 
    gatewayTransactionId?: string, 
    adminUserId?: string
  ): Promise<Payment | null>;

  /**
   * Cancela um pagamento
   * @param paymentId ID do pagamento
   * @param reason Motivo do cancelamento
   * @returns Pagamento cancelado ou null se o pagamento não foi encontrado
   */
  cancelPayment(paymentId: string, reason: string): Promise<Payment | null>;

  /**
   * Lista pagamentos com base nos filtros
   * @param options Opu00e7u00f5es de filtro e paginau00e7u00e3o
   * @returns Resultado da listagem
   */
  listPayments(options: ListPaymentsOptions): Promise<PaginatedPaymentsResult>;

  /**
   * Obtu00e9m um pagamento pelo ID externo
   * @param externalId ID externo
   * @returns Pagamento encontrado ou null
   */
  getPaymentByExternalId(externalId: string): Promise<Payment | null>;

  /**
   * Processa um pagamento
   * @param paymentId ID do pagamento
   * @returns Resultado do processamento
   */
  processPayment(paymentId: string): Promise<PaymentProcessResult>;

  /**
   * Obtu00e9m informau00e7u00f5es sobre os mu00e9todos de pagamento disponu00edveis
   * Manipula webhooks de pagamento
   * @param provider Provedor do webhook
   * @param eventType Tipo de evento
   * @param data Dados do evento
   * @returns Resultado do processamento do webhook
   */
  handlePaymentWebhook(provider: string, eventType: string, data: any): Promise<any>;
}
