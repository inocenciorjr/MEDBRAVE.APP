import { SupabaseClient } from '@supabase/supabase-js';
import {
  Device,
  RegisterDevicePayload,
  ListDevicesOptions,
  PaginatedDevicesResult,
} from '../../../domain/notifications/types';
import { IDeviceService } from '../../../domain/notifications/interfaces/IDeviceService';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../config/supabase';

/**
 * Serviço de gerenciamento de dispositivos
 * Implementação usando Supabase
 */
export class SupabaseDeviceService implements IDeviceService {
  private tableName = 'devices';
  private serviceName = 'SupabaseDeviceService';

  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Registra um novo dispositivo ou atualiza um existente
   */
  async registerDevice(data: RegisterDevicePayload): Promise<Device> {
    try {
      // Verificar se já existe um dispositivo com o mesmo pushToken ou fcmToken
      let existingDevice: Device | null = null;

      if (data.push_token) {
        const { data: pushTokenDevice } = await this.client
          .from(this.tableName)
          .select('*')
          .eq('push_token', data.push_token)
          .single();

        if (pushTokenDevice) {
          existingDevice = this.mapFromDatabase(pushTokenDevice);
        }
      }

      if (!existingDevice && data.fcm_token) {
        const { data: fcmTokenDevice } = await this.client
          .from(this.tableName)
          .select('*')
          .eq('fcm_token', data.fcm_token)
          .single();

        if (fcmTokenDevice) {
          existingDevice = this.mapFromDatabase(fcmTokenDevice);
        }
      }

      const now = new Date();
      const deviceData = {
        user_id: data.user_id,
        device_type: data.device_type,
        device_model: data.device_model,
        device_name: data.device_name,
        os_version: data.os_version,
        app_version: data.app_version,
        push_token: data.push_token,
        fcm_token: data.fcm_token,
        last_login_at: now.toISOString(),
        last_active_at: now.toISOString(),
        is_active: true,
        metadata: data.metadata || {},
        updated_at: now.toISOString(),
      };

      if (existingDevice) {
        // Atualizar dispositivo existente
        const { data: updatedDevice, error } = await this.client
          .from(this.tableName)
          .update(deviceData)
          .eq('id', existingDevice.id)
          .select()
          .single();

        if (error) {
          logger.error(`${this.serviceName}: Erro ao atualizar dispositivo`, {
            error: error.message,
            deviceId: existingDevice.id,
          });
          throw new Error(`Erro ao atualizar dispositivo: ${error.message}`);
        }

        return this.mapFromDatabase(updatedDevice);
      } else {
        // Criar novo dispositivo
        const { data: newDevice, error } = await this.client
          .from(this.tableName)
          .insert({ ...deviceData, created_at: now.toISOString() })
          .select()
          .single();

        if (error) {
          logger.error(`${this.serviceName}: Erro ao criar dispositivo`, {
            error: error.message,
            data,
          });
          throw new Error(`Erro ao criar dispositivo: ${error.message}`);
        }

        return this.mapFromDatabase(newDevice);
      }
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no registerDevice`, {
        error,
        data,
      });
      throw error;
    }
  }

  /**
   * Busca um dispositivo pelo ID
   */
  async getDeviceById(deviceId: string): Promise<Device | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', deviceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Erro ao buscar dispositivo: ${error.message}`);
      }

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no getDeviceById`, {
        error,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Lista dispositivos com opções de filtros e paginação
   */
  async getDevices(
    options: ListDevicesOptions = {},
  ): Promise<PaginatedDevicesResult> {
    try {
      const {
        user_id,
        device_type,
        is_active,
        has_push_token,
        has_fcm_token,
        order_by = 'created_at',
        order_direction = 'desc',
        limit = 20,
        page = 1,
      } = options;

      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (user_id) {
        query = query.eq('user_id', user_id);
      }
      if (device_type) {
        query = query.eq('device_type', device_type);
      }
      if (typeof is_active === 'boolean') {
        query = query.eq('is_active', is_active);
      }
      if (typeof has_push_token === 'boolean') {
        query = has_push_token
          ? query.not('push_token', 'is', null)
          : query.is('push_token', null);
      }
      if (typeof has_fcm_token === 'boolean') {
        query = has_fcm_token
          ? query.not('fcm_token', 'is', null)
          : query.is('fcm_token', null);
      }

      // Aplicar ordenação
      const dbOrderBy = this.mapOrderByToDatabase(order_by as keyof Device);
      query = query.order(dbOrderBy, { ascending: order_direction === 'asc' });

      // Aplicar paginação
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Erro ao listar dispositivos: ${error.message}`);
      }

      const devices = data?.map((device) => this.mapFromDatabase(device)) || [];
      const total = count || 0;
      const total_pages = Math.ceil(total / limit);

      return {
        devices,
        total,
        page,
        limit,
        total_pages,
      };
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no getDevices`, {
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * Atualiza informações de um dispositivo
   */
  async updateDevice(
    deviceId: string,
    data: Partial<Omit<Device, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<Device> {
    try {
      const updateData = {
        ...this.mapToDatabase(data),
        updated_at: new Date().toISOString(),
      };

      const { data: updatedDevice, error } = await this.client
        .from(this.tableName)
        .update(updateData)
        .eq('id', deviceId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar dispositivo: ${error.message}`);
      }

      return this.mapFromDatabase(updatedDevice);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no updateDevice`, {
        error,
        deviceId,
        data,
      });
      throw error;
    }
  }

  /**
   * Atualiza o timestamp de última atividade de um dispositivo
   */
  async updateDeviceLastActive(deviceId: string): Promise<Device> {
    try {
      const now = new Date().toISOString();
      const { data: updatedDevice, error } = await this.client
        .from(this.tableName)
        .update({ last_active_at: now, updated_at: now })
        .eq('id', deviceId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar última atividade: ${error.message}`);
      }

      return this.mapFromDatabase(updatedDevice);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no updateDeviceLastActive`, {
        error,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Atualiza o push token de um dispositivo
   */
  async updateDevicePushToken(
    deviceId: string,
    pushToken: string,
  ): Promise<Device> {
    try {
      const { data: updatedDevice, error } = await this.client
        .from(this.tableName)
        .update({ push_token: pushToken, updated_at: new Date().toISOString() })
        .eq('id', deviceId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar push token: ${error.message}`);
      }

      return this.mapFromDatabase(updatedDevice);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no updateDevicePushToken`, {
        error,
        deviceId,
        pushToken,
      });
      throw error;
    }
  }

  /**
   * Atualiza o FCM token de um dispositivo
   */
  async updateDeviceFcmToken(
    deviceId: string,
    fcmToken: string,
  ): Promise<Device> {
    try {
      const { data: updatedDevice, error } = await this.client
        .from(this.tableName)
        .update({ fcm_token: fcmToken, updated_at: new Date().toISOString() })
        .eq('id', deviceId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar FCM token: ${error.message}`);
      }

      return this.mapFromDatabase(updatedDevice);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no updateDeviceFcmToken`, {
        error,
        deviceId,
        fcmToken,
      });
      throw error;
    }
  }

  /**
   * Desativa um dispositivo
   */
  async deactivateDevice(deviceId: string): Promise<Device> {
    try {
      const { data: updatedDevice, error } = await this.client
        .from(this.tableName)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', deviceId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao desativar dispositivo: ${error.message}`);
      }

      return this.mapFromDatabase(updatedDevice);
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no deactivateDevice`, {
        error,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Remove um dispositivo
   */
  async deleteDevice(deviceId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', deviceId);

      if (error) {
        throw new Error(`Erro ao deletar dispositivo: ${error.message}`);
      }

      return true;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no deleteDevice`, {
        error,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Busca dispositivos ativos de um usuário
   */
  async getUserActiveDevices(userId: string): Promise<Device[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_active_at', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar dispositivos ativos: ${error.message}`);
      }

      return data?.map((device) => this.mapFromDatabase(device)) || [];
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no getUserActiveDevices`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Desativa todos os dispositivos de um usuário
   */
  async deactivateAllUserDevices(userId: string): Promise<number> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_active', true)
        .select('id');

      if (error) {
        throw new Error(
          `Erro ao desativar dispositivos do usuário: ${error.message}`,
        );
      }

      return data?.length || 0;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no deactivateAllUserDevices`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Remove push tokens inválidos
   */
  async cleanupInvalidPushTokens(invalidTokens: string[]): Promise<number> {
    try {
      if (invalidTokens.length === 0) {
        return 0;
      }

      const { data, error } = await this.client
        .from(this.tableName)
        .update({ push_token: null, updated_at: new Date().toISOString() })
        .in('push_token', invalidTokens)
        .select('id');

      if (error) {
        throw new Error(
          `Erro ao limpar push tokens inválidos: ${error.message}`,
        );
      }

      return data?.length || 0;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no cleanupInvalidPushTokens`, {
        error,
        invalidTokens,
      });
      throw error;
    }
  }

  /**
   * Remove FCM tokens inválidos
   */
  async cleanupInvalidFcmTokens(invalidTokens: string[]): Promise<number> {
    try {
      if (invalidTokens.length === 0) {
        return 0;
      }

      const { data, error } = await this.client
        .from(this.tableName)
        .update({ fcm_token: null, updated_at: new Date().toISOString() })
        .in('fcm_token', invalidTokens)
        .select('id');

      if (error) {
        throw new Error(
          `Erro ao limpar FCM tokens inválidos: ${error.message}`,
        );
      }

      return data?.length || 0;
    } catch (error) {
      logger.error(`${this.serviceName}: Erro no cleanupInvalidFcmTokens`, {
        error,
        invalidTokens,
      });
      throw error;
    }
  }

  /**
   * Mapeia dados do banco para o modelo de domínio
   */
  private mapFromDatabase(data: any): Device {
    return {
      id: data.id,
      user_id: data.user_id,
      device_type: data.device_type,
      device_model: data.device_model,
      device_name: data.device_name,
      os_version: data.os_version,
      app_version: data.app_version,
      push_token: data.push_token,
      fcm_token: data.fcm_token,
      last_login_at: new Date(data.last_login_at),
      last_active_at: new Date(data.last_active_at),
      is_active: data.is_active,
      metadata: data.metadata,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Mapeia dados do modelo de domínio para o banco
   */
  private mapToDatabase(data: Partial<Device>): any {
    const mapped: any = {};

    if (data.user_id) {
      mapped.user_id = data.user_id;
    }
    if (data.device_type) {
      mapped.device_type = data.device_type;
    }
    if (data.device_model) {
      mapped.device_model = data.device_model;
    }
    if (data.device_name) {
      mapped.device_name = data.device_name;
    }
    if (data.os_version) {
      mapped.os_version = data.os_version;
    }
    if (data.app_version) {
      mapped.app_version = data.app_version;
    }
    if (data.push_token) {
      mapped.push_token = data.push_token;
    }
    if (data.fcm_token) {
      mapped.fcm_token = data.fcm_token;
    }
    if (typeof data.is_active === 'boolean') {
      mapped.is_active = data.is_active;
    }
    if (data.metadata) {
      mapped.metadata = data.metadata;
    }

    return mapped;
  }

  /**
   * Mapeia campos de ordenação para o banco
   */
  private mapOrderByToDatabase(orderBy: keyof Device): string {
    const mapping: Record<string, string> = {
      id: 'id',
      user_id: 'user_id',
      device_type: 'device_type',
      device_model: 'device_model',
      device_name: 'device_name',
      os_version: 'os_version',
      app_version: 'app_version',
      push_token: 'push_token',
      fcm_token: 'fcm_token',
      last_login_at: 'last_login_at',
      last_active_at: 'last_active_at',
      is_active: 'is_active',
      created_at: 'created_at',
      updated_at: 'updated_at',
    };

    return mapping[orderBy as string] || 'created_at';
  }
}
