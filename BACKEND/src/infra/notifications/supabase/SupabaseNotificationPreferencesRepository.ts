import { SupabaseClient } from '@supabase/supabase-js';
import { INotificationPreferencesRepository } from '../../../domain/notifications/interfaces/INotificationPreferencesRepository';
import { NotificationPreferences } from '../../../domain/notifications/types';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../config/supabase';

/**
 * Repositório de preferências de notificação
 * Implementação usando Supabase
 */
export class SupabaseNotificationPreferencesRepository
implements INotificationPreferencesRepository {
  private tableName = 'notification_preferences';
  private serviceName = 'SupabaseNotificationPreferencesRepository';

  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Salva as preferências de notificação do usuário
   */
  async savePreferences(
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    try {
      const now = new Date();
      const { id, ...preferencesData } = preferences;

      if (!id || id === '') {
        // Criar novas preferências
        const newPreferences = {
          ...this.mapToDatabase(preferencesData),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };

        const { data, error } = await this.client
          .from(this.tableName)
          .insert(newPreferences)
          .select()
          .single();

        if (error) {
          logger.error(`${this.serviceName}: Erro ao criar preferências`, {
            error: error.message,
            preferences,
          });
          throw new Error(`Erro ao criar preferências: ${error.message}`);
        }

        return this.mapFromDatabase(data);
      } else {
        // Atualizar preferências existentes
        const updateData = {
          ...this.mapToDatabase(preferencesData),
          updated_at: now.toISOString(),
        };

        const { data, error } = await this.client
          .from(this.tableName)
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          logger.error(`${this.serviceName}: Erro ao atualizar preferências`, {
            error: error.message,
            preferences,
          });
          throw new Error(`Erro ao atualizar preferências: ${error.message}`);
        }

        return this.mapFromDatabase(data);
      }
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no savePreferences`, {
        error,
        preferences,
      });
      throw error;
    }
  }

  /**
   * Busca as preferências de notificação por ID do usuário
   */
  async getPreferencesByUserId(
    userId: string,
  ): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Erro ao buscar preferências: ${error.message}`);
      }

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no getPreferencesByUserId`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Remove as preferências de notificação do usuário
   */
  async deletePreferences(userId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error(`${this.serviceName}: Erro ao deletar preferências`, {
          error: error.message,
          userId,
        });
        throw new Error(`Erro ao deletar preferências: ${error.message}`);
      }
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no deletePreferences`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Verifica se o usuário possui preferências configuradas
   */
  async hasPreferences(userId: string): Promise<boolean> {
    try {
      const { count, error } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Erro ao verificar preferências: ${error.message}`);
      }

      return (count || 0) > 0;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no hasPreferences`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Mapeia dados do modelo de domínio para o banco
   */
  private mapToDatabase(preferences: Partial<NotificationPreferences>): any {
    return {
      user_id: preferences.user_id,
      channels: preferences.channels,
      do_not_disturb: preferences.do_not_disturb,
    };
  }

  /**
   * Mapeia dados do banco para o modelo de domínio
   */
  private mapFromDatabase(data: any): NotificationPreferences {
    return {
      id: data.id,
      user_id: data.user_id,
      channels: data.channels || {},
      do_not_disturb: data.do_not_disturb || { enabled: false },
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    } as any;
  }
}
