import { SupabaseClient } from '@supabase/supabase-js';
import { INotificationService } from '../../../domain/notifications/interfaces/INotificationService';
import {
  CreateNotificationPayload,
  Notification,
  NotificationPriority,
  NotificationType,
  ListNotificationsOptions,
  PaginatedNotificationsResult,
  UpdateNotificationPayload,
} from '../../../domain/notifications/types';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../config/supabase';

/**
 * Serviço de gerenciamento de notificações
 * Implementação usando Supabase
 */
export class SupabaseNotificationService implements INotificationService {
  private tableName = 'notifications';
  private serviceName = 'SupabaseNotificationService';

  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Cria uma nova notificação
   */
  async createNotification(
    data: CreateNotificationPayload,
  ): Promise<Notification> {
    try {
      const now = new Date();
      const notification = {
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type || NotificationType.GENERAL,
        priority: data.priority || NotificationPriority.NORMAL,
        read: false,
        data: data.data || {},
        expires_at: data.expires_at?.toISOString() || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      const { data: createdNotification, error } = await this.client
        .from(this.tableName)
        .insert(notification)
        .select()
        .single();

      if (error) {
        logger.error(`${this.serviceName}: Erro ao criar notificação`, {
          error: error.message,
          data,
        });
        throw new Error(`Erro ao criar notificação: ${error.message}`);
      }

      return this.mapFromDatabase(createdNotification);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no createNotification`, {
        error,
        data,
      });
      throw error;
    }
  }

  /**
   * Busca uma notificação pelo ID
   */
  async getNotificationById(
    notificationId: string,
  ): Promise<Notification | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', notificationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Erro ao buscar notificação: ${error.message}`);
      }

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no getNotificationById`, {
        error,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Busca notificações por ID de usuário com opções de filtro
   */
  async getUserNotifications(
    userId: string,
    options: ListNotificationsOptions = {},
  ): Promise<PaginatedNotificationsResult> {
    try {
      const {
        limit = 20,
        page = 1,
        is_read,
        type,
        priority,
        order_by_created_at = 'desc',
        include_expired = false,
      } = options;

      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Aplicar filtros
      if (typeof is_read === 'boolean') {
        query = query.eq('read', is_read);
      }
      if (type) {
        query = query.eq('type', type);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }
      if (!include_expired) {
        query = query.or(
          'expires_at.is.null,expires_at.gt.' + new Date().toISOString(),
        );
      }

      // Aplicar ordenação
      query = query.order('created_at', {
        ascending: order_by_created_at === 'asc',
      });

      // Aplicar paginação
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(
          `Erro ao buscar notificações do usuário: ${error.message}`,
        );
      }

      const notifications =
        data?.map((notification) => this.mapFromDatabase(notification)) || [];
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        notifications,
        total,
        page,
        limit,
        total_pages: totalPages,
      };
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no getUserNotifications`, {
        error,
        userId,
        options,
      });
      throw error;
    }
  }

  /**
   * Marca uma notificação como lida
   */
  async markNotificationAsRead(
    notificationId: string,
  ): Promise<Notification | null> {
    try {
      const now = new Date();
      const { data: updatedNotification, error } = await this.client
        .from(this.tableName)
        .update({
          read: true,
          read_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(
          `Erro ao marcar notificação como lida: ${error.message}`,
        );
      }

      return this.mapFromDatabase(updatedNotification);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no markNotificationAsRead`, {
        error,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Marca todas as notificações de um usuário como lidas
   */
  async markAllNotificationsAsRead(userId: string): Promise<number> {
    try {
      const now = new Date();
      const { data, error } = await this.client
        .from(this.tableName)
        .update({
          read: true,
          read_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', userId)
        .eq('read', false)
        .select('id');

      if (error) {
        throw new Error(
          `Erro ao marcar todas as notificações como lidas: ${error.message}`,
        );
      }

      return data?.length || 0;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no markAllNotificationsAsRead`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Atualiza uma notificação existente
   */
  async updateNotification(
    notificationId: string,
    updates: UpdateNotificationPayload,
  ): Promise<Notification | null> {
    try {
      const updateData = {
        ...this.mapToDatabase(updates),
        updated_at: new Date().toISOString(),
      };

      const { data: updatedNotification, error } = await this.client
        .from(this.tableName)
        .update(updateData)
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Erro ao atualizar notificação: ${error.message}`);
      }

      return this.mapFromDatabase(updatedNotification);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no updateNotification`, {
        error,
        notificationId,
        updates,
      });
      throw error;
    }
  }

  /**
   * Remove uma notificação
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', notificationId);

      if (error) {
        throw new Error(`Erro ao deletar notificação: ${error.message}`);
      }
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no deleteNotification`, {
        error,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Remove todas as notificações de um usuário
   */
  async deleteAllUserNotifications(userId: string): Promise<number> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('user_id', userId)
        .select('id');

      if (error) {
        throw new Error(
          `Erro ao deletar notificações do usuário: ${error.message}`,
        );
      }

      return data?.length || 0;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no deleteAllUserNotifications`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Remove notificações expiradas
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await this.client
        .from(this.tableName)
        .delete()
        .not('expires_at', 'is', null)
        .lt('expires_at', now)
        .select('id');

      if (error) {
        throw new Error(
          `Erro ao limpar notificações expiradas: ${error.message}`,
        );
      }

      return data?.length || 0;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no cleanupExpiredNotifications`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Envia notificação para múltiplos usuários
   */
  async sendNotificationToMultipleUsers(
    userIds: string[],
    notificationData: Omit<CreateNotificationPayload, 'userId'>,
  ): Promise<number> {
    try {
      if (userIds.length === 0) {
        return 0;
      }

      const now = new Date();
      const notifications = userIds.map((userId) => ({
        user_id: userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || NotificationType.GENERAL,
        priority: notificationData.priority || NotificationPriority.NORMAL,
        read: false,
        data: notificationData.data || {},
        expires_at: notificationData.expires_at?.toISOString() || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      }));

      const { data, error } = await this.client
        .from(this.tableName)
        .insert(notifications)
        .select('id');

      if (error) {
        throw new Error(
          `Erro ao enviar notificações para múltiplos usuários: ${error.message}`,
        );
      }

      return data?.length || 0;
    } catch (error) {
      logger.error(
        `${this.serviceName}: Erro no sendNotificationToMultipleUsers`,
        { error, userIds, notificationData },
      );
      throw error;
    }
  }

  /**
   * Conta notificações não lidas de um usuário
   */
  async countUnreadNotifications(userId: string): Promise<number> {
    try {
      const { count, error } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      if (error) {
        throw new Error(
          `Erro ao contar notificações não lidas: ${error.message}`,
        );
      }

      return count || 0;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no countUnreadNotifications`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Busca notificações não lidas por tipo e prioridade
   */
  async getUnreadNotificationsByTypeAndPriority(
    userId: string,
    type: NotificationType,
    priority: NotificationPriority,
    limit = 5,
  ): Promise<Notification[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('type', type)
        .eq('priority', priority)
        .eq('read', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(
          `Erro ao buscar notificações por tipo e prioridade: ${error.message}`,
        );
      }

      return (
        data?.map((notification) => this.mapFromDatabase(notification)) || []
      );
    } catch (error) {
      logger.error(
        `${this.serviceName}: Erro no getUnreadNotificationsByTypeAndPriority`,
        {
          error,
          userId,
          type,
          priority,
          limit,
        },
      );
      throw error;
    }
  }

  /**
   * Mapeia dados do banco para o modelo de domínio
   */
  private mapFromDatabase(data: any): Notification {
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority,
      read: data.read,
      data: data.data || {},
      read_at: data.read_at ? new Date(data.read_at) : null,
      expires_at: data.expires_at ? new Date(data.expires_at) : null,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Mapeia dados do modelo de domínio para o banco
   */
  private mapToDatabase(data: Partial<UpdateNotificationPayload>): any {
    const mapped: any = {};

    if (data.title) {
      mapped.title = data.title;
    }
    if (data.message) {
      mapped.message = data.message;
    }
    if (data.type) {
      mapped.type = data.type;
    }
    if (data.priority) {
      mapped.priority = data.priority;
    }
    if (typeof data.read === 'boolean') {
      mapped.read = data.read;
    }
    if (data.data) {
      mapped.data = data.data;
    }
    if (data.expires_at !== undefined) {
      mapped.expires_at = data.expires_at ? data.expires_at.toISOString() : null;
    }

    return mapped;
  }
}
