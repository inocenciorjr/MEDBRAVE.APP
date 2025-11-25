import { supabase } from '../../../config/supabase';
import {
  PaymentNotification,
  CreatePaymentNotificationPayload,
} from '../../../domain/payment/types';
import logger from '../../../utils/logger';
import { AppError, ErrorCodes } from '../../../utils/errors';

/**
 * Tabela do Supabase para notificações de pagamento
 */
const PAYMENT_NOTIFICATIONS_TABLE = 'payment_notifications';

/**
 * Implementação do serviço de notificações de pagamento utilizando Supabase
 */
export class SupabasePaymentNotificationService {
  /**
   * Construtor da classe SupabasePaymentNotificationService
   */
  constructor() {}

  /**
   * Cria uma nova notificação de pagamento
   * @param notificationData Dados da notificação
   * @returns Notificação criada
   */
  async createPaymentNotification(
    notificationData: CreatePaymentNotificationPayload,
  ): Promise<PaymentNotification> {
    try {
      // Validação básica de dados
      if (!notificationData.userId) {
        throw new AppError(
          400,
          'ID do usuário é obrigatório',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      if (!notificationData.type) {
        throw new AppError(
          400,
          'Tipo de notificação é obrigatório',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      if (!notificationData.title) {
        throw new AppError(
          400,
          'Título da notificação é obrigatório',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      if (!notificationData.message) {
        throw new AppError(
          400,
          'Mensagem da notificação é obrigatória',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      const now = new Date();

      const newNotificationData = {
        user_id: notificationData.userId,
        payment_id: notificationData.paymentId || null,
        related_id: notificationData.relatedId || null,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        metadata: notificationData.metadata
          ? JSON.stringify(notificationData.metadata)
          : null,
        is_read: false,
        read_at: null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from(PAYMENT_NOTIFICATIONS_TABLE)
        .insert(newNotificationData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const notification = this.mapDatabaseToNotification(data);
      logger.info(
        `Notificação de pagamento criada com sucesso: ${notification.id} para o usuário ${notificationData.userId}`,
      );

      return notification;
    } catch (error) {
      logger.error(`Erro ao criar notificação de pagamento: ${error}`);
      throw new AppError(
        500,
        `Erro ao criar notificação de pagamento: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtém uma notificação de pagamento pelo seu ID
   * @param notificationId ID da notificação
   * @returns Notificação encontrada ou null
   */
  async getPaymentNotificationById(
    notificationId: string,
  ): Promise<PaymentNotification | null> {
    try {
      const { data, error } = await supabase
        .from(PAYMENT_NOTIFICATIONS_TABLE)
        .select('*')
        .eq('id', notificationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(error.message);
      }

      return this.mapDatabaseToNotification(data);
    } catch (error) {
      logger.error(
        `Erro ao buscar notificação de pagamento por ID ${notificationId}: ${error}`,
      );
      throw new AppError(
        500,
        `Erro ao buscar notificação de pagamento: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtém notificações de pagamento por ID de usuário
   * @param userId ID do usuário
   * @param options Opções de filtragem e ordenação
   * @returns Lista de notificações do usuário
   */
  async getPaymentNotificationsByUserId(
    userId: string,
    options: {
      isRead?: boolean;
      limit?: number;
      orderByCreatedAt?: 'asc' | 'desc';
    } = {},
  ): Promise<PaymentNotification[]> {
    try {
      let query = supabase
        .from(PAYMENT_NOTIFICATIONS_TABLE)
        .select('*')
        .eq('user_id', userId);

      if (options.isRead !== undefined) {
        query = query.eq('is_read', options.isRead);
      }

      const orderDirection = options.orderByCreatedAt || 'desc';
      query = query.order('created_at', {
        ascending: orderDirection === 'asc',
      });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data.map((item) => this.mapDatabaseToNotification(item));
    } catch (error) {
      logger.error(
        `Erro ao buscar notificações de pagamento para o usuário ${userId}: ${error}`,
      );
      throw new AppError(
        500,
        `Erro ao buscar notificações de pagamento por usuário: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtém notificações de pagamento por ID de pagamento
   * @param paymentId ID do pagamento
   * @returns Lista de notificações do pagamento
   */
  async getPaymentNotificationsByPaymentId(
    paymentId: string,
  ): Promise<PaymentNotification[]> {
    try {
      const { data, error } = await supabase
        .from(PAYMENT_NOTIFICATIONS_TABLE)
        .select('*')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data.map((item) => this.mapDatabaseToNotification(item));
    } catch (error) {
      logger.error(
        `Erro ao buscar notificações para o pagamento ${paymentId}: ${error}`,
      );
      throw new AppError(
        500,
        `Erro ao buscar notificações por pagamento: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Marca uma notificação de pagamento como lida
   * @param notificationId ID da notificação
   * @returns Notificação atualizada ou null
   */
  async markPaymentNotificationAsRead(
    notificationId: string,
  ): Promise<PaymentNotification | null> {
    try {
      const now = new Date();

      const { data, error } = await supabase
        .from(PAYMENT_NOTIFICATIONS_TABLE)
        .update({
          is_read: true,
          read_at: now,
          updated_at: now,
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(error.message);
      }

      return this.mapDatabaseToNotification(data);
    } catch (error) {
      logger.error(
        `Erro ao marcar notificação ${notificationId} como lida: ${error}`,
      );
      throw new AppError(
        500,
        `Erro ao marcar notificação como lida: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Marca todas as notificações de pagamento de um usuário como lidas
   * @param userId ID do usuário
   * @returns Número de notificações atualizadas
   */
  async markAllPaymentNotificationsAsRead(userId: string): Promise<number> {
    try {
      const now = new Date();

      const { data, error } = await supabase
        .from(PAYMENT_NOTIFICATIONS_TABLE)
        .update({
          is_read: true,
          read_at: now,
          updated_at: now,
        })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select('id');

      if (error) {
        throw new Error(error.message);
      }

      const updatedCount = data.length;
      logger.info(
        `${updatedCount} notificações marcadas como lidas para o usuário ${userId}`,
      );

      return updatedCount;
    } catch (error) {
      logger.error(
        `Erro ao marcar todas as notificações como lidas para o usuário ${userId}: ${error}`,
      );
      throw new AppError(
        500,
        `Erro ao marcar notificações como lidas: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Atualiza uma notificação de pagamento
   * @param notificationId ID da notificação
   * @param updates Dados a serem atualizados
   * @returns Notificação atualizada ou null
   */
  async updatePaymentNotification(
    notificationId: string,
    updates: Partial<Omit<PaymentNotification, 'id' | 'createdAt'>>,
  ): Promise<PaymentNotification | null> {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date(),
      };

      // Mapear campos de atualização
      if (updates.userId !== undefined) {
        updateData.user_id = updates.userId;
      }
      if (updates.paymentId !== undefined) {
        updateData.payment_id = updates.paymentId;
      }
      if (updates.relatedId !== undefined) {
        updateData.related_id = updates.relatedId;
      }
      if (updates.type !== undefined) {
        updateData.type = updates.type;
      }
      if (updates.title !== undefined) {
        updateData.title = updates.title;
      }
      if (updates.message !== undefined) {
        updateData.message = updates.message;
      }
      if (updates.metadata !== undefined) {
        updateData.metadata = updates.metadata
          ? JSON.stringify(updates.metadata)
          : null;
      }
      if (updates.isRead !== undefined) {
        updateData.is_read = updates.isRead;
      }
      if (updates.readAt !== undefined) {
        updateData.read_at = updates.readAt;
      }

      const { data, error } = await supabase
        .from(PAYMENT_NOTIFICATIONS_TABLE)
        .update(updateData)
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(error.message);
      }

      return this.mapDatabaseToNotification(data);
    } catch (error) {
      logger.error(`Erro ao atualizar notificação ${notificationId}: ${error}`);
      throw new AppError(
        500,
        `Erro ao atualizar notificação: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Exclui uma notificação de pagamento
   * @param notificationId ID da notificação
   */
  async deletePaymentNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(PAYMENT_NOTIFICATIONS_TABLE)
        .delete()
        .eq('id', notificationId);

      if (error) {
        throw new Error(error.message);
      }

      logger.info(`Notificação ${notificationId} excluída com sucesso`);
    } catch (error) {
      logger.error(`Erro ao excluir notificação ${notificationId}: ${error}`);
      throw new AppError(
        500,
        `Erro ao excluir notificação: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Processa notificação de webhook de pagamento
   * @param webhookData Dados do webhook
   * @param paymentId ID do pagamento (opcional)
   * @returns Notificação criada ou null
   */
  async processPaymentWebhook(
    webhookData: any,
    paymentId?: string,
  ): Promise<PaymentNotification | null> {
    try {
      // Extrair informações do webhook
      const webhookType = webhookData.type || webhookData.event || 'unknown';
      const userId = webhookData.userId || webhookData.user_id;

      if (!userId) {
        logger.error(
          'Webhook de pagamento não contém ID de usuário:',
          webhookData,
        );
        return null;
      }

      // Determinar título e mensagem com base no tipo de webhook
      let title = 'Atualização de Pagamento';
      let message = 'Seu pagamento foi atualizado.';
      let notificationType = webhookData.notificationType;

      if (!notificationType) {
        // Inferir tipo de notificação se não foi especificado
        switch (webhookType.toLowerCase()) {
          case 'payment.created':
          case 'payment_created':
            title = 'Novo Pagamento';
            message = 'Um novo pagamento foi criado.';
            notificationType = 'PAYMENT_PENDING';
            break;
          case 'payment.approved':
          case 'payment_approved':
            title = 'Pagamento Aprovado';
            message = 'Seu pagamento foi aprovado com sucesso!';
            notificationType = 'PAYMENT_APPROVED';
            break;
          case 'payment.rejected':
          case 'payment_rejected':
            title = 'Pagamento Rejeitado';
            message =
              'Seu pagamento foi rejeitado. Por favor, tente novamente.';
            notificationType = 'PAYMENT_REJECTED';
            break;
          case 'payment.refunded':
          case 'payment_refunded':
            title = 'Pagamento Reembolsado';
            message = 'Seu pagamento foi reembolsado.';
            notificationType = 'PAYMENT_REFUNDED';
            break;
          case 'payment.cancelled':
          case 'payment_cancelled':
            title = 'Pagamento Cancelado';
            message = 'Seu pagamento foi cancelado.';
            notificationType = 'PAYMENT_CANCELLED';
            break;
          case 'payment.chargeback':
          case 'payment_chargeback':
            title = 'Chargeback Detectado';
            message = 'Um chargeback foi registrado para seu pagamento.';
            notificationType = 'PAYMENT_CHARGEBACK';
            break;
          case 'pix.expired':
          case 'pix_expired':
            title = 'PIX Expirado';
            message = 'Seu código PIX expirou. Por favor, gere um novo.';
            notificationType = 'PAYMENT_REJECTED';
            break;
          case 'subscription.created':
          case 'subscription_created':
            title = 'Nova Assinatura';
            message = 'Sua assinatura foi criada com sucesso.';
            notificationType = 'SUBSCRIPTION_CREATED';
            break;
          case 'subscription.cancelled':
          case 'subscription_cancelled':
            title = 'Assinatura Cancelada';
            message = 'Sua assinatura foi cancelada.';
            notificationType = 'SUBSCRIPTION_CANCELLED';
            break;
          case 'subscription.renewed':
          case 'subscription_renewed':
            title = 'Assinatura Renovada';
            message = 'Sua assinatura foi renovada com sucesso.';
            notificationType = 'SUBSCRIPTION_RENEWED';
            break;
          case 'subscription.expiring':
          case 'subscription_expiring':
            title = 'Assinatura Expirando';
            message = 'Sua assinatura irá expirar em breve.';
            notificationType = 'SUBSCRIPTION_EXPIRING';
            break;
          default:
            title = 'Notificação de Pagamento';
            message = `Atualização de pagamento: ${webhookType}`;
            notificationType = 'PAYMENT_STATUS_UPDATED';
        }
      }

      // Criar a notificação
      return this.createPaymentNotification({
        userId,
        paymentId: paymentId || webhookData.paymentId || null,
        type: notificationType,
        title,
        message,
        metadata: webhookData,
      });
    } catch (error) {
      logger.error(`Erro ao processar webhook de pagamento: ${error}`);
      throw new AppError(
        500,
        `Erro ao processar webhook de pagamento: ${error}`,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Mapeia dados do banco para a entidade PaymentNotification
   * @param data Dados do banco
   * @returns Entidade PaymentNotification
   */
  private mapDatabaseToNotification(data: any): PaymentNotification {
    return {
      id: data.id,
      userId: data.user_id,
      paymentId: data.payment_id,
      relatedId: data.related_id,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata ? JSON.parse(data.metadata) : null,
      isRead: data.is_read,
      readAt: data.read_at ? new Date(data.read_at) : null,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}


