import { SupabaseClient } from '@supabase/supabase-js';
import {
  PixPayment,
  PaymentStatus,
  CreatePixPaymentPayload,
  PaymentProcessResult,
} from '../../../domain/payment/types';
import { IPixPaymentService } from '../../../domain/payment/interfaces/IPixPaymentService';
import { IPaymentService } from '../../../domain/payment/interfaces/IPaymentService';
import logger from '../../../utils/logger';
import { ErrorCodes, createError } from '../../../utils/errors';

/**
 * Implementação do serviço de pagamentos PIX utilizando Supabase
 */
export class SupabasePixPaymentService implements IPixPaymentService {
  private paymentService: IPaymentService | null = null;

  /**
   * Construtor da classe SupabasePixPaymentService
   * @param supabase Cliente Supabase
   * @param paymentService Serviço de pagamentos (opcional)
   */
  constructor(
    private supabase: SupabaseClient,
    paymentService?: IPaymentService,
  ) {
    if (paymentService) {
      this.paymentService = paymentService;
    }
  }

  /**
   * Cria um novo pagamento PIX
   * @param paymentData Dados do pagamento PIX
   * @returns Pagamento PIX criado
   */
  async createPixPayment(
    paymentData: CreatePixPaymentPayload,
  ): Promise<PixPayment> {
    try {
      const now = new Date();

      // Validação básica de dados
      if (!paymentData.paymentId) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'ID do pagamento principal é obrigatório',
        );
      }

      // Gerar expirationDate a partir de expirationHours ou usar data atual
      let expirationDate = new Date();
      if (
        paymentData.expirationHours &&
        typeof paymentData.expirationHours === 'number'
      ) {
        expirationDate = new Date();
        expirationDate.setHours(
          expirationDate.getHours() + paymentData.expirationHours,
        );
      }

      // Gerar campos obrigatórios do PixPayment
      const newPixPayment = {
        payment_id: paymentData.paymentId,
        txid: '', // Gerar ou obter de integração real
        qr_code: '', // Gerar ou obter de integração real
        qr_code_url: '', // Gerar ou obter de integração real
        copy_paste_text: '', // Gerar ou obter de integração real
        expiration_date: expirationDate,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await this.supabase
        .from('pix_payments')
        .insert(newPixPayment)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create PIX payment: ${error.message}`);
      }

      const createdPixPayment = this.mapToEntity(data);
      logger.info(
        `Pagamento PIX criado com sucesso: ${createdPixPayment.id} para o pagamento ${paymentData.paymentId}`,
      );

      // Atualizar o pagamento principal
      if (this.paymentService) {
        try {
          await this.paymentService.updatePayment(paymentData.paymentId, {
            pixCode: '', // Gerar ou obter de integração real
            pixExpirationDate: undefined, // Gerar ou obter de integração real
          });
        } catch (error) {
          logger.error(
            `Erro ao atualizar pagamento principal com dados PIX: ${error}`,
          );
        }
      }

      return createdPixPayment;
    } catch (error) {
      logger.error(`Erro ao criar pagamento PIX: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao criar pagamento PIX: ${error}`,
      );
    }
  }

  /**
   * Obtém um pagamento PIX pelo seu ID
   * @param paymentId ID do pagamento PIX
   * @returns Pagamento PIX encontrado ou null
   */
  async getPixPaymentById(paymentId: string): Promise<PixPayment | null> {
    try {
      const { data, error } = await this.supabase
        .from('pix_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get PIX payment: ${error.message}`);
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(`Erro ao buscar pagamento PIX ${paymentId}: ${error}`);
      throw error;
    }
  }

  /**
   * Obtém um pagamento PIX pelo ID do pagamento principal
   * @param paymentId ID do pagamento principal
   * @returns Pagamento PIX encontrado ou null
   */
  async getPixPaymentByPaymentId(
    paymentId: string,
  ): Promise<PixPayment | null> {
    try {
      const { data, error } = await this.supabase
        .from('pix_payments')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(
          `Failed to get PIX payment by payment ID: ${error.message}`,
        );
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(
        `Erro ao buscar pagamento PIX pelo ID do pagamento ${paymentId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Atualiza um pagamento PIX
   * @param paymentId ID do pagamento PIX
   * @param updates Dados a serem atualizados
   * @returns Pagamento PIX atualizado ou null se não encontrado
   */
  async updatePixPayment(
    paymentId: string,
    updates: Partial<Omit<PixPayment, 'id' | 'createdAt'>>,
  ): Promise<PixPayment | null> {
    try {
      const updateData = {
        ...this.mapToDatabase(updates),
        updated_at: new Date(),
      };

      // Remove campos que não devem ser atualizados
      delete updateData.id;
      delete updateData.created_at;

      const { data, error } = await this.supabase
        .from('pix_payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to update PIX payment: ${error.message}`);
      }

      const updatedPayment = this.mapToEntity(data);
      logger.info(`Pagamento PIX ${paymentId} atualizado com sucesso.`);
      return updatedPayment;
    } catch (error) {
      logger.error(`Erro ao atualizar pagamento PIX ${paymentId}: ${error}`);
      throw error;
    }
  }

  /**
   * Verifica se um pagamento PIX está expirado
   * @param payment Pagamento PIX
   * @returns true se expirado, false caso contrário
   */
  isPixPaymentExpired(payment: PixPayment): boolean {
    const now = new Date();
    return payment.expirationDate < now;
  }

  /**
   * Verifica e marca um pagamento PIX como expirado se necessário
   * @param paymentId ID do pagamento PIX
   * @returns true se foi marcado como expirado, false caso contrário
   */
  async checkAndMarkPixPaymentAsExpired(paymentId: string): Promise<boolean> {
    try {
      const pixPayment = await this.getPixPaymentById(paymentId);
      if (!pixPayment) {
        return false;
      }

      if (
        this.isPixPaymentExpired(pixPayment) &&
        pixPayment.status === 'ACTIVE'
      ) {
        await this.updatePixPayment(paymentId, {
          status: 'EXPIRED',
        });

        // Atualizar o pagamento principal
        if (this.paymentService) {
          try {
            await this.paymentService.updatePayment(pixPayment.paymentId, {
              status: PaymentStatus.CANCELLED,
            });
          } catch (error) {
            logger.error(
              `Erro ao atualizar status do pagamento principal: ${error}`,
            );
          }
        }

        logger.info(`Pagamento PIX ${paymentId} marcado como expirado.`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(
        `Erro ao verificar expiração do pagamento PIX ${paymentId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Aprova um pagamento PIX
   * @param paymentId ID do pagamento PIX
   * @param transactionId ID da transação
   * @param endToEndId ID end-to-end (opcional)
   * @returns Pagamento PIX aprovado
   */
  async approvePixPayment(
    paymentId: string,
    transactionId: string,
    endToEndId?: string,
  ): Promise<PixPayment> {
    try {
      const updateData = {
        status: 'PAID',
        updated_at: new Date(),
      };
      // Persistir campos extras somente se existirem na tabela
      (updateData as any).transaction_id = transactionId;
      (updateData as any).end_to_end_id = endToEndId || null;

      const { data, error } = await this.supabase
        .from('pix_payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to approve PIX payment: ${error.message}`);
      }

      const approvedPayment = this.mapToEntity(data);

      // Atualizar o pagamento principal
      if (this.paymentService) {
        try {
          await this.paymentService.updatePayment(approvedPayment.paymentId, {
            status: PaymentStatus.APPROVED,
            paidAt: new Date(),
          });
        } catch (error) {
          logger.error(
            `Erro ao atualizar status do pagamento principal: ${error}`,
          );
        }
      }

      logger.info(`Pagamento PIX ${paymentId} aprovado com sucesso.`);
      return approvedPayment;
    } catch (error) {
      logger.error(`Erro ao aprovar pagamento PIX ${paymentId}: ${error}`);
      throw error;
    }
  }

  /**
   * Cancela um pagamento PIX
   * @param paymentId ID do pagamento PIX
   * @returns Pagamento PIX cancelado ou null se não encontrado
   */
  async cancelPixPayment(paymentId: string): Promise<PixPayment | null> {
    try {
      const updateData = {
        status: 'CANCELLED',
        updated_at: new Date(),
      };

      const { data, error } = await this.supabase
        .from('pix_payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to cancel PIX payment: ${error.message}`);
      }

      const cancelledPayment = this.mapToEntity(data);

      // Atualizar o pagamento principal
      if (this.paymentService) {
        try {
          await this.paymentService.updatePayment(cancelledPayment.paymentId, {
            status: PaymentStatus.CANCELLED,
            cancelledAt: new Date(),
          });
        } catch (error) {
          logger.error(
            `Erro ao atualizar status do pagamento principal: ${error}`,
          );
        }
      }

      logger.info(`Pagamento PIX ${paymentId} cancelado com sucesso.`);
      return cancelledPayment;
    } catch (error) {
      logger.error(`Erro ao cancelar pagamento PIX ${paymentId}: ${error}`);
      throw error;
    }
  }

  /**
   * Verifica e atualiza pagamentos PIX expirados
   * @returns Número de pagamentos atualizados
   */
  async checkAndUpdateExpiredPixPayments(): Promise<number> {
    try {
      const now = new Date();

      const { data, error } = await this.supabase
        .from('pix_payments')
        .update({
          status: 'EXPIRED',
          updated_at: now,
        })
        .lt('expiration_date', now.toISOString())
        .eq('status', 'ACTIVE')
        .select();

      if (error) {
        throw new Error(
          `Failed to update expired PIX payments: ${error.message}`,
        );
      }

      const updatedCount = data.length;
      logger.info(
        `${updatedCount} pagamentos PIX expirados foram atualizados.`,
      );

      // Atualizar os pagamentos principais correspondentes
      if (this.paymentService && updatedCount > 0) {
        for (const pixPayment of data) {
          try {
            await this.paymentService.updatePayment(pixPayment.payment_id, {
              status: PaymentStatus.CANCELLED,
            });
          } catch (error) {
            logger.error(
              `Erro ao atualizar status do pagamento principal ${pixPayment.payment_id}: ${error}`,
            );
          }
        }
      }

      return updatedCount;
    } catch (error) {
      logger.error(
        `Erro ao verificar e atualizar pagamentos PIX expirados: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Gera QR Code PIX
   * @returns Resultado do processamento
   */
  async generatePixQrCode(): Promise<PaymentProcessResult> {
    // Implementação específica da geração de QR Code PIX
    throw new Error('Método não implementado');
  }

  private mapToEntity(data: any): PixPayment {
    return {
      id: data.id,
      paymentId: data.payment_id,
      txid: data.txid,
      qrCode: data.qr_code,
      qrCodeUrl: data.qr_code_url,
      copyPasteText: data.copy_paste_text,
      expirationDate: new Date(data.expiration_date),
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToDatabase(entity: Partial<PixPayment>): any {
    const data: any = {};

    if (entity.paymentId !== undefined) {
data.payment_id = entity.paymentId;
}
    if (entity.txid !== undefined) {
data.txid = entity.txid;
}
    if (entity.qrCode !== undefined) {
data.qr_code = entity.qrCode;
}
    if (entity.qrCodeUrl !== undefined) {
data.qr_code_url = entity.qrCodeUrl;
}
    if (entity.copyPasteText !== undefined) {
      data.copy_paste_text = entity.copyPasteText;
    }
    if (entity.expirationDate !== undefined) {
      data.expiration_date = entity.expirationDate;
    }
    if (entity.status !== undefined) {
      data.status = entity.status;
    }

    return data;
  }
}
