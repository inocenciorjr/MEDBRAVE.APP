import {
  Device,
  RegisterDevicePayload,
  ListDevicesOptions,
  PaginatedDevicesResult,
} from '../types';

/**
 * Interface do serviço de gerenciamento de dispositivos
 */
export interface IDeviceService {
  /**
   * Registra um novo dispositivo ou atualiza um existente
   * @param data Dados do dispositivo
   */
  registerDevice(data: RegisterDevicePayload): Promise<Device>;

  /**
   * Busca um dispositivo pelo ID
   * @param deviceId ID do dispositivo
   */
  getDeviceById(deviceId: string): Promise<Device | null>;

  /**
   * Lista dispositivos com opções de filtros e paginação
   * @param options Opções de listagem
   */
  getDevices(options?: ListDevicesOptions): Promise<PaginatedDevicesResult>;

  /**
   * Atualiza informações de um dispositivo
   * @param deviceId ID do dispositivo
   * @param data Dados para atualização
   */
  updateDevice(
    deviceId: string,
    data: Partial<Omit<Device, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Device>;

  /**
   * Atualiza o timestamp de última atividade de um dispositivo
   * @param deviceId ID do dispositivo
   */
  updateDeviceLastActive(deviceId: string): Promise<Device>;

  /**
   * Atualiza o push token de um dispositivo
   * @param deviceId ID do dispositivo
   * @param pushToken Novo push token
   */
  updateDevicePushToken(deviceId: string, pushToken: string): Promise<Device>;

  /**
   * Atualiza o FCM token de um dispositivo
   * @param deviceId ID do dispositivo
   * @param fcmToken Novo FCM token
   */
  updateDeviceFcmToken(deviceId: string, fcmToken: string): Promise<Device>;

  /**
   * Desativa um dispositivo
   * @param deviceId ID do dispositivo
   */
  deactivateDevice(deviceId: string): Promise<Device>;

  /**
   * Exclui um dispositivo
   * @param deviceId ID do dispositivo
   */
  deleteDevice(deviceId: string): Promise<boolean>;

  /**
   * Busca dispositivos ativos de um usuário
   * @param userId ID do usuário
   */
  getUserActiveDevices(userId: string): Promise<Device[]>;

  /**
   * Desativa todos os dispositivos de um usuário
   * @param userId ID do usuário
   */
  deactivateAllUserDevices(userId: string): Promise<number>;

  /**
   * Remove push tokens inválidos
   * @param invalidTokens Lista de tokens inválidos
   */
  cleanupInvalidPushTokens(invalidTokens: string[]): Promise<number>;

  /**
   * Remove FCM tokens inválidos
   * @param invalidTokens Lista de tokens inválidos
   */
  cleanupInvalidFcmTokens(invalidTokens: string[]): Promise<number>;
}
