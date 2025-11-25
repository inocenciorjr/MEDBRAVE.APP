import { SupabaseClient } from '@supabase/supabase-js';
import { INotificationRepository } from '../../../domain/notifications/interfaces/INotificationRepository';
import {
  CreateNotificationPayload,
  Notification,
  NotificationPriority,
  NotificationType,
} from '../../../domain/notifications/types';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../config/supabase';

/**
 * Repositório de notificações
 * Implementação usando Supabase
 */
export class SupabaseNotificationRepository implements INotificationRepository {
  private tableName = 'notifications';
  private serviceName = 'SupabaseNotificationRepository';

  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Cria uma nova notificação
   */
  async create(notification: Notification): Promise<Notification> {
    try {
      const notificationData = this.mapToDatabase(notification);

      const { data, error } = await this.client
        .from(this.tableName)
        .insert(notificationData)
        .select()
        .single();

      if (error) {
        logger.error(`${this.serviceName}: Erro ao criar notificação`, {
          error: error.message,
          notification,
        });
        throw new Error(`Erro ao criar notificação: ${error.message}`);
      }

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no create`, {
        error,
        notification,
      });
      throw error;
    }
  }

  /**
   * Busca uma notificação pelo ID
   */
  async findById(id: string): Promise<Notification | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Erro ao buscar notificação: ${error.message}`);
      }

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no findById`, { error, id });
      throw error;
    }
  }

  /**
   * Busca notificações por ID do usuário com paginação
   */
  async findByUserId(
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<Notification[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(
          `Erro ao buscar notificações do usuário: ${error.message}`,
        );
      }

      return (
        data?.map((notification) => this.mapFromDatabase(notification)) || []
      );
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no findByUserId`, {
        error,
        userId,
        limit,
        offset,
      });
      throw error;
    }
  }

  /**
   * Atualiza uma notificação
   */
  async update(notification: Notification): Promise<Notification> {
    try {
      const updateData = {
        ...this.mapToDatabase(notification),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.client
        .from(this.tableName)
        .update(updateData)
        .eq('id', notification.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar notificação: ${error.message}`);
      }

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no update`, {
        error,
        notification,
      });
      throw error;
    }
  }

  /**
   * Remove uma notificação
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao deletar notificação: ${error.message}`);
      }
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no delete`, { error, id });
      throw error;
    }
  }

  /**
   * Remove todas as notificações de um usuário
   */
  async deleteAll(userId: string): Promise<number> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('user_id', userId)
        .select('id');

      if (error) {
        throw new Error(
          `Erro ao deletar todas as notificações: ${error.message}`,
        );
      }

      return data?.length || 0;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no deleteAll`, { error, userId });
      throw error;
    }
  }

  /**
   * Remove notificações expiradas
   */
  async deleteExpired(): Promise<number> {
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
          `Erro ao deletar notificações expiradas: ${error.message}`,
        );
      }

      return data?.length || 0;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no deleteExpired`, { error });
      throw error;
    }
  }

  /**
   * Marca todas as notificações de um usuário como lidas
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const now = new Date();
      const { error } = await this.client
        .from(this.tableName)
        .update({
          read: true,
          read_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        throw new Error(
          `Erro ao marcar todas as notificações como lidas: ${error.message}`,
        );
      }
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no markAllAsRead`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Conta notificações não lidas de um usuário
   */
  async getUnreadCount(userId: string): Promise<number> {
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
      logger.error(`${this.serviceName}: Erro no getUnreadCount`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Busca notificações não lidas por tipo e prioridade
   */
  async findUnreadByTypeAndPriority(
    userId: string,
    type: NotificationType,
    priority: NotificationPriority,
    limit: number = 5,
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
      logger.error(`${this.serviceName}: Erro no findUnreadByTypeAndPriority`, {
        error,
        userId,
        type,
        priority,
        limit,
      });
      throw error;
    }
  }

  /**
   * Cria múltiplas notificações para diferentes usuários
   */
  async createMultiple(
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
          `Erro ao criar múltiplas notificações: ${error.message}`,
        );
      }

      return data?.length || 0;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no createMultiple`, {
        error,
        userIds,
        notificationData,
      });
      throw error;
    }
  }

  /**
   * Mapeia dados do modelo de domínio para o banco
   */
  private mapToDatabase(notification: Notification): any {
    return {
      id: notification.id,
      user_id: notification.user_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      read: notification.read,
      data: notification.data,
      read_at: notification.read_at?.toISOString() || null,
      expires_at: notification.expires_at?.toISOString() || null,
      created_at: notification.created_at.toISOString(),
      updated_at: notification.updated_at.toISOString(),
    };
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
}
