import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateCreditCardPaymentPayload,
  CreditCardPayment,
} from '../../../domain/payment/types';
import { ICreditCardPaymentService } from '../../../domain/payment/interfaces/ICreditCardPaymentService';
import logger from '../../../utils/logger';
import { ErrorCodes, createError } from '../../../utils/errors';

/**
 * Implementação do serviço de pagamentos por cartão de crédito utilizando Supabase
 */
export class SupabaseCreditCardPaymentService
implements ICreditCardPaymentService {

  /**
   * Construtor da classe SupabaseCreditCardPaymentService
   * @param supabase Cliente Supabase
   * @param paymentService Serviço de pagamentos (opcional)
   */
  constructor(
    private supabase: SupabaseClient,
  ) {}

  /**
   * Cria um novo pagamento por cartão de crédito
   * @param paymentData Dados do pagamento por cartão de crédito
   * @returns Pagamento por cartão de crédito criado
   */
  async createCreditCardPayment(
    paymentData: CreateCreditCardPaymentPayload,
  ): Promise<CreditCardPayment> {
    try {
      const now = new Date();

      // Validação básica de dados
      if (!paymentData.paymentId) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'ID do pagamento principal é obrigatório',
        );
      }

      if (!paymentData.cardHolderName) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Nome do titular do cartão é obrigatório',
        );
      }

      if (!paymentData.cardLastFourDigits) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Últimos 4 dígitos do cartão são obrigatórios',
        );
      }

      if (!paymentData.cardBrand) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Bandeira do cartão é obrigatória',
        );
      }

      if (!paymentData.installments || paymentData.installments < 1) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Número de parcelas deve ser maior que zero',
        );
      }

      const newPayment = {
        payment_id: paymentData.paymentId,
        card_holder_name: paymentData.cardHolderName,
        card_last_four_digits: paymentData.cardLastFourDigits,
        card_brand: paymentData.cardBrand,
        installments: paymentData.installments,
        status: 'PENDING',
        transaction_id: null,
        authorization_code: null,
        nsu: null,
        acquirer_name: null,
        payment_method_id: paymentData.paymentMethodId || null,
        statement_descriptor: paymentData.statementDescriptor || null,
        gateway_response: null,
        error_code: null,
        error_message: null,
        refund_id: null,
        refund_amount: null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await this.supabase
        .from('credit_card_payments')
        .insert(newPayment)
        .select()
        .single();

      if (error) {
        throw new Error(
          `Failed to create credit card payment: ${error.message}`,
        );
      }

      const createdPayment = this.mapToEntity(data);
      logger.info(
        `Pagamento por cartão de crédito ${createdPayment.id} criado com sucesso para o pagamento ${paymentData.paymentId}.`,
      );
      return createdPayment;
    } catch (error) {
      logger.error(`Erro ao criar pagamento por cartão de crédito: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao criar pagamento por cartão de crédito',
      );
    }
  }

  /**
   * Busca um pagamento por cartão de crédito pelo ID
   * @param paymentId ID do pagamento por cartão de crédito
   * @returns Pagamento por cartão de crédito encontrado ou null
   */
  async getCreditCardPaymentById(
    paymentId: string,
  ): Promise<CreditCardPayment | null> {
    try {
      const { data, error } = await this.supabase
        .from('credit_card_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get credit card payment: ${error.message}`);
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(
        `Erro ao buscar pagamento por cartão de crédito ${paymentId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Busca um pagamento por cartão de crédito pelo ID do pagamento principal
   * @param paymentId ID do pagamento principal
   * @returns Pagamento por cartão de crédito encontrado ou null
   */
  async getCreditCardPaymentByPaymentId(
    paymentId: string,
  ): Promise<CreditCardPayment | null> {
    try {
      const { data, error } = await this.supabase
        .from('credit_card_payments')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(
          `Failed to get credit card payment by payment ID: ${error.message}`,
        );
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(
        `Erro ao buscar pagamento por cartão de crédito pelo ID do pagamento ${paymentId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Atualiza um pagamento por cartão de crédito
   * @param paymentId ID do pagamento por cartão de crédito
   * @param updates Dados a serem atualizados
   * @returns Pagamento por cartão de crédito atualizado ou null se não encontrado
   */
  async updateCreditCardPayment(
    paymentId: string,
    updates: Partial<Omit<CreditCardPayment, 'id' | 'createdAt'>>,
  ): Promise<CreditCardPayment | null> {
    try {
      const updateData = {
        ...this.mapToDatabase(updates),
        updated_at: new Date(),
      };

      // Remove campos que não devem ser atualizados
      delete updateData.id;
      delete updateData.created_at;

      const { data, error } = await this.supabase
        .from('credit_card_payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(
          `Failed to update credit card payment: ${error.message}`,
        );
      }

      const updatedPayment = this.mapToEntity(data);
      logger.info(
        `Pagamento por cartão de crédito ${paymentId} atualizado com sucesso.`,
      );
      return updatedPayment;
    } catch (error) {
      logger.error(
        `Erro ao atualizar pagamento por cartão de crédito ${paymentId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Atualiza o status de um pagamento por cartão de crédito
   * @param paymentId ID do pagamento por cartão de crédito
   * @param status Novo status
   * @param details Detalhes adicionais (opcional)
   * @returns Pagamento por cartão de crédito atualizado ou null se não encontrado
   */
  async updateCreditCardPaymentStatus(
    paymentId: string,
    status: string,
    details?: Partial<CreditCardPayment>,
  ): Promise<CreditCardPayment | null> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date(),
      };

      if (details) {
        Object.assign(updateData, this.mapToDatabase(details));
      }

      const { data, error } = await this.supabase
        .from('credit_card_payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(
          `Failed to update credit card payment status: ${error.message}`,
        );
      }

      const updatedPayment = this.mapToEntity(data);
      logger.info(
        `Status do pagamento por cartão de crédito ${paymentId} atualizado para ${status}.`,
      );
      return updatedPayment;
    } catch (error) {
      logger.error(
        `Erro ao atualizar status do pagamento por cartão de crédito ${paymentId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Autoriza um pagamento por cartão de crédito
   * @param creditCardPaymentId ID do pagamento por cartão de crédito
   * @param transactionId ID da transação
   * @param authorizationCode Código de autorização
   * @returns Pagamento por cartão de crédito autorizado
   */
  async authorizeCreditCardPayment(
    creditCardPaymentId: string,
    transactionId: string,
    authorizationCode: string,
  ): Promise<CreditCardPayment> {
    try {
      const updateData = {
        status: 'AUTHORIZED',
        transaction_id: transactionId,
        authorization_code: authorizationCode,
        updated_at: new Date(),
      };

      const { data, error } = await this.supabase
        .from('credit_card_payments')
        .update(updateData)
        .eq('id', creditCardPaymentId)
        .select()
        .single();

      if (error) {
        throw new Error(
          `Failed to authorize credit card payment: ${error.message}`,
        );
      }

      const authorizedPayment = this.mapToEntity(data);
      logger.info(
        `Pagamento por cartão de crédito ${creditCardPaymentId} autorizado com sucesso.`,
      );
      return authorizedPayment;
    } catch (error) {
      logger.error(
        `Erro ao autorizar pagamento por cartão de crédito ${creditCardPaymentId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Captura um pagamento por cartão de crédito
   * @param creditCardPaymentId ID do pagamento por cartão de crédito
   * @param transactionId ID da transação
   * @returns Pagamento por cartão de crédito capturado
   */
  async captureCreditCardPayment(
    creditCardPaymentId: string,
    transactionId: string,
  ): Promise<CreditCardPayment> {
    try {
      const updateData = {
        status: 'CAPTURED',
        transaction_id: transactionId,
        updated_at: new Date(),
      };

      const { data, error } = await this.supabase
        .from('credit_card_payments')
        .update(updateData)
        .eq('id', creditCardPaymentId)
        .select()
        .single();

      if (error) {
        throw new Error(
          `Failed to capture credit card payment: ${error.message}`,
        );
      }

      const capturedPayment = this.mapToEntity(data);
      logger.info(
        `Pagamento por cartão de crédito ${creditCardPaymentId} capturado com sucesso.`,
      );
      return capturedPayment;
    } catch (error) {
      logger.error(
        `Erro ao capturar pagamento por cartão de crédito ${creditCardPaymentId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Rejeita um pagamento por cartão de crédito
   * @param creditCardPaymentId ID do pagamento por cartão de crédito
   * @param errorCode Código do erro
   * @param errorMessage Mensagem de erro
   * @returns Pagamento por cartão de crédito rejeitado
   */
  async rejectCreditCardPayment(
    creditCardPaymentId: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<CreditCardPayment> {
    try {
      const updateData = {
        status: 'REJECTED',
        error_code: errorCode,
        error_message: errorMessage,
        updated_at: new Date(),
      };

      const { data, error } = await this.supabase
        .from('credit_card_payments')
        .update(updateData)
        .eq('id', creditCardPaymentId)
        .select()
        .single();

      if (error) {
        throw new Error(
          `Failed to reject credit card payment: ${error.message}`,
        );
      }

      const rejectedPayment = this.mapToEntity(data);
      logger.info(
        `Pagamento por cartão de crédito ${creditCardPaymentId} rejeitado com sucesso.`,
      );
      return rejectedPayment;
    } catch (error) {
      logger.error(
        `Erro ao rejeitar pagamento por cartão de crédito ${creditCardPaymentId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Reembolsa um pagamento por cartão de crédito
   * @param paymentId ID do pagamento por cartão de crédito
   * @param refundId ID do reembolso
   * @param refundAmount Valor do reembolso (opcional)
   * @param gatewayResponse Resposta do gateway (opcional)
   * @returns Pagamento por cartão de crédito reembolsado ou null se não encontrado
   */
  async refundCreditCardPayment(
    paymentId: string,
    refundId: string,
    refundAmount?: number,
    gatewayResponse?: Record<string, any>,
  ): Promise<CreditCardPayment | null> {
    try {
      const updateData = {
        status: 'REFUNDED',
        refund_id: refundId,
        refund_amount: refundAmount || null,
        gateway_response: gatewayResponse || null,
        updated_at: new Date(),
      };

      const { data, error } = await this.supabase
        .from('credit_card_payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(
          `Failed to refund credit card payment: ${error.message}`,
        );
      }

      const refundedPayment = this.mapToEntity(data);
      logger.info(
        `Pagamento por cartão de crédito ${paymentId} reembolsado com sucesso.`,
      );
      return refundedPayment;
    } catch (error) {
      logger.error(
        `Erro ao reembolsar pagamento por cartão de crédito ${paymentId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Cancela um pagamento por cartão de crédito
   * @param paymentId ID do pagamento por cartão de crédito
   * @param reason Motivo do cancelamento (opcional)
   * @param gatewayResponse Resposta do gateway (opcional)
   * @returns Pagamento por cartão de crédito cancelado ou null se não encontrado
   */
  async cancelCreditCardPayment(
    paymentId: string,
    reason?: string,
    gatewayResponse?: Record<string, any>,
  ): Promise<CreditCardPayment | null> {
    try {
      const updateData = {
        status: 'CANCELLED',
        error_message: reason || null,
        gateway_response: gatewayResponse || null,
        updated_at: new Date(),
      };

      const { data, error } = await this.supabase
        .from('credit_card_payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(
          `Failed to cancel credit card payment: ${error.message}`,
        );
      }

      const cancelledPayment = this.mapToEntity(data);
      logger.info(
        `Pagamento por cartão de crédito ${paymentId} cancelado com sucesso.`,
      );
      return cancelledPayment;
    } catch (error) {
      logger.error(
        `Erro ao cancelar pagamento por cartão de crédito ${paymentId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Marca um pagamento por cartão de crédito como chargeback
   * @param paymentId ID do pagamento por cartão de crédito
   * @param reason Motivo do chargeback
   * @param gatewayResponse Resposta do gateway (opcional)
   * @returns Pagamento por cartão de crédito marcado como chargeback ou null se não encontrado
   */
  async markCreditCardPaymentAsChargeback(
    paymentId: string,
    reason: string,
    gatewayResponse?: Record<string, any>,
  ): Promise<CreditCardPayment | null> {
    try {
      const updateData = {
        status: 'CHARGEBACK',
        error_message: reason,
        gateway_response: gatewayResponse || null,
        updated_at: new Date(),
      };

      const { data, error } = await this.supabase
        .from('credit_card_payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(
          `Failed to mark credit card payment as chargeback: ${error.message}`,
        );
      }

      const chargebackPayment = this.mapToEntity(data);
      logger.info(
        `Pagamento por cartão de crédito ${paymentId} marcado como chargeback com sucesso.`,
      );
      return chargebackPayment;
    } catch (error) {
      logger.error(
        `Erro ao marcar pagamento por cartão de crédito ${paymentId} como chargeback: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Processa um pagamento por cartão de crédito
   * @returns Resultado do processamento
   */
  async processCreditCardPayment(): Promise<
    import('../../../domain/payment/types').PaymentProcessResult
    > {
    // Implementação específica do processamento de pagamento por cartão de crédito
    throw new Error('Método não implementado');
  }

  private mapToEntity(data: any): CreditCardPayment {
    return {
      id: data.id,
      paymentId: data.payment_id,
      cardHolderName: data.card_holder_name,
      cardLastFourDigits: data.card_last_four_digits,
      cardBrand: data.card_brand,
      installments: data.installments,
      status: data.status,
      transactionId: data.transaction_id,
      authorizationCode: data.authorization_code,
      nsu: data.nsu,
      acquirerName: data.acquirer_name,
      paymentMethodId: data.payment_method_id,
      statementDescriptor: data.statement_descriptor,
      gatewayResponse: data.gateway_response,
      errorCode: data.error_code,
      errorMessage: data.error_message,
      refundId: data.refund_id,
      refundAmount: data.refund_amount,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToDatabase(entity: Partial<CreditCardPayment>): any {
    const data: any = {};

    if (entity.paymentId !== undefined) {
data.payment_id = entity.paymentId;
}
    if (entity.cardHolderName !== undefined) {
      data.card_holder_name = entity.cardHolderName;
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
    if (entity.status !== undefined) {
      data.status = entity.status;
    }
    if (entity.transactionId !== undefined) {
      data.transaction_id = entity.transactionId;
    }
    if (entity.authorizationCode !== undefined) {
      data.authorization_code = entity.authorizationCode;
    }
    if (entity.nsu !== undefined) {
      data.nsu = entity.nsu;
    }
    if (entity.acquirerName !== undefined) {
      data.acquirer_name = entity.acquirerName;
    }
    if (entity.paymentMethodId !== undefined) {
      data.payment_method_id = entity.paymentMethodId;
    }
    if (entity.statementDescriptor !== undefined) {
      data.statement_descriptor = entity.statementDescriptor;
    }
    if (entity.gatewayResponse !== undefined) {
      data.gateway_response = entity.gatewayResponse;
    }
    if (entity.errorCode !== undefined) {
      data.error_code = entity.errorCode;
    }
    if (entity.errorMessage !== undefined) {
      data.error_message = entity.errorMessage;
    }
    if (entity.refundId !== undefined) {
      data.refund_id = entity.refundId;
    }
    if (entity.refundAmount !== undefined) {
      data.refund_amount = entity.refundAmount;
    }

    return data;
  }
}
