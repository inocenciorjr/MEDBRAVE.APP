import { Firestore, Timestamp } from 'firebase-admin/firestore';
import {
  Device,
  RegisterDevicePayload,
  ListDevicesOptions,
  PaginatedDevicesResult,
} from '../types';
import { IDeviceService } from '../interfaces/IDeviceService';
import { logger } from '../../../utils/logger';

/**
 * Serviu00e7o de gerenciamento de dispositivos
 * Implementau00e7u00e3o usando Firebase Firestore
 */
export class FirebaseDeviceService implements IDeviceService {
  private collection = 'devices';
  private serviceName = 'DeviceService';

  constructor(private readonly firestore: Firestore) {}

  /**
   * Registra um novo dispositivo ou atualiza um existente
   */
  async registerDevice(data: RegisterDevicePayload): Promise<Device> {
    try {
      // Verificar se ju00e1 existe um dispositivo com o mesmo pushToken ou fcmToken
      let existingDeviceId: string | null = null;

      if (data.pushToken) {
        const pushTokenSnapshot = await this.firestore
          .collection(this.collection)
          .where('pushToken', '==', data.pushToken)
          .limit(1)
          .get();

        if (!pushTokenSnapshot.empty) {
          existingDeviceId = pushTokenSnapshot.docs[0].id;
        }
      }

      if (!existingDeviceId && data.fcmToken) {
        const fcmTokenSnapshot = await this.firestore
          .collection(this.collection)
          .where('fcmToken', '==', data.fcmToken)
          .limit(1)
          .get();

        if (!fcmTokenSnapshot.empty) {
          existingDeviceId = fcmTokenSnapshot.docs[0].id;
        }
      }

      const now = Timestamp.now();

      // Se encontrou um dispositivo existente, atualiza-o
      if (existingDeviceId) {
        const updateData: Partial<Device> = {
          userId: data.userId,
          deviceType: data.deviceType,
          lastLoginAt: now,
          lastActiveAt: now,
          isActive: true,
          updatedAt: now,
        };

        // Adicionar campos opcionais se fornecidos
        if (data.deviceModel) {
          updateData.deviceModel = data.deviceModel;
        }
        if (data.deviceName) {
          updateData.deviceName = data.deviceName;
        }
        if (data.osVersion) {
          updateData.osVersion = data.osVersion;
        }
        if (data.appVersion) {
          updateData.appVersion = data.appVersion;
        }
        if (data.pushToken) {
          updateData.pushToken = data.pushToken;
        }
        if (data.fcmToken) {
          updateData.fcmToken = data.fcmToken;
        }
        if (data.metadata) {
          updateData.metadata = data.metadata;
        }

        await this.firestore.collection(this.collection).doc(existingDeviceId).update(updateData);

        // Buscar o dispositivo atualizado
        const updatedDoc = await this.firestore
          .collection(this.collection)
          .doc(existingDeviceId)
          .get();
        logger.info(
          this.serviceName,
          'registerDevice',
          `Dispositivo atualizado (ID: ${existingDeviceId}) para o usuu00e1rio ${data.userId}`,
        );

        return {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        } as Device;
      }

      // Caso contru00e1rio, cria um novo dispositivo
      const deviceData: Omit<Device, 'id'> = {
        userId: data.userId,
        deviceType: data.deviceType,
        deviceModel: data.deviceModel || undefined,
        deviceName: data.deviceName || undefined,
        osVersion: data.osVersion || undefined,
        appVersion: data.appVersion || undefined,
        pushToken: data.pushToken || undefined,
        fcmToken: data.fcmToken || undefined,
        lastLoginAt: now,
        lastActiveAt: now,
        isActive: true,
        metadata: data.metadata || undefined,
        createdAt: now,
        updatedAt: now,
      };

      const deviceRef = this.firestore.collection(this.collection).doc();
      await deviceRef.set(deviceData);

      logger.info(
        this.serviceName,
        'registerDevice',
        `Novo dispositivo criado (ID: ${deviceRef.id}) para o usuu00e1rio ${data.userId}`,
      );

      return {
        id: deviceRef.id,
        ...deviceData,
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error(
        this.serviceName,
        'registerDevice',
        'Erro ao registrar dispositivo',
        data.userId,
        errorObj,
      );
      throw error;
    }
  }

  // Implementar os demais mu00e9todos...

  // Mu00e9todos temporu00e1rios para satisfazer a interface
  async getDeviceById(_deviceId: string): Promise<Device | null> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }

  async getDevices(_options?: ListDevicesOptions): Promise<PaginatedDevicesResult> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }

  async updateDevice(
    _deviceId: string,
    _data: Partial<Omit<Device, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Device> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }

  async updateDeviceLastActive(_deviceId: string): Promise<Device> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }

  async updateDevicePushToken(_deviceId: string, _pushToken: string): Promise<Device> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }

  async updateDeviceFcmToken(_deviceId: string, _fcmToken: string): Promise<Device> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }

  async deactivateDevice(_deviceId: string): Promise<Device> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }

  async deleteDevice(_deviceId: string): Promise<boolean> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }

  async getUserActiveDevices(_userId: string): Promise<Device[]> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }

  async deactivateAllUserDevices(_userId: string): Promise<number> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }

  async cleanupInvalidPushTokens(_invalidTokens: string[]): Promise<number> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }

  async cleanupInvalidFcmTokens(_invalidTokens: string[]): Promise<number> {
    throw new Error('Mu00e9todo nu00e3o implementado');
  }
}
