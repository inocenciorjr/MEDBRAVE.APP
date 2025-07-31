import { Request, Response } from 'express';
import { IDeviceService } from '../interfaces/IDeviceService';
import { ListDevicesOptions, RegisterDevicePayload } from '../types';
import { Timestamp } from 'firebase-admin/firestore';

export class DeviceController {
  constructor(private deviceService: IDeviceService) {}

  /**
   * Registra um novo dispositivo para o usuário
   */
  async registerDevice(req: Request, res: Response) {
    try {
      // @ts-ignore - req.user é adicionado pelo middleware de autenticação
      const userId = req.user.id;

      const deviceData: RegisterDevicePayload = {
        ...req.body,
        userId,
      };

      const device = await this.deviceService.registerDevice(deviceData);

      return res.status(201).json({
        success: true,
        data: device,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao registrar dispositivo';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Atualiza um dispositivo existente
   */
  async updateDevice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // @ts-ignore - req.user é adicionado pelo middleware de autenticação
      const userId = req.user.id;

      // Verificar se o dispositivo existe e pertence ao usuário
      const device = await this.deviceService.getDeviceById(id);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Dispositivo não encontrado',
          },
        });
      }

      // Somente o proprietário do dispositivo ou um administrador pode atualizar
      // @ts-ignore - req.user é adicionado pelo middleware de autenticação
      if (device.userId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Você não tem permissão para atualizar este dispositivo',
          },
        });
      }

      const updatedDevice = await this.deviceService.updateDevice(id, req.body);

      return res.json({
        success: true,
        data: updatedDevice,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar dispositivo';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Busca um dispositivo pelo ID
   */
  async getDeviceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const device = await this.deviceService.getDeviceById(id);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Dispositivo não encontrado',
          },
        });
      }

      // Somente o proprietário do dispositivo ou um administrador pode visualizar
      // @ts-ignore - req.user é adicionado pelo middleware de autenticação
      if (device.userId !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Você não tem permissão para visualizar este dispositivo',
          },
        });
      }

      return res.json({
        success: true,
        data: device,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar dispositivo';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Lista os dispositivos do usuário
   */
  async getMyDevices(req: Request, res: Response) {
    try {
      // @ts-ignore - req.user é adicionado pelo middleware de autenticação
      const userId = req.user.id;

      const {
        deviceType,
        isActive,
        hasPushToken,
        hasFcmToken,
        limit,
        page,
        offset,
        orderBy,
        orderDirection,
      } = req.query;

      const options: ListDevicesOptions = {
        userId,
        deviceType: deviceType as any,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        hasPushToken: hasPushToken !== undefined ? hasPushToken === 'true' : undefined,
        hasFcmToken: hasFcmToken !== undefined ? hasFcmToken === 'true' : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        orderBy: orderBy as any,
        orderDirection: orderDirection as 'asc' | 'desc',
      };

      const result = await this.deviceService.getDevices(options);

      return res.json({
        success: true,
        data: result.devices,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao listar dispositivos';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Lista todos os dispositivos (apenas para admin)
   */
  async getAllDevices(req: Request, res: Response) {
    try {
      // Verificar se o usuário é admin
      // @ts-ignore - req.user é adicionado pelo middleware de autenticação
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Apenas administradores podem listar todos os dispositivos',
          },
        });
      }

      const {
        userId,
        deviceType,
        isActive,
        hasPushToken,
        hasFcmToken,
        limit,
        page,
        offset,
        orderBy,
        orderDirection,
      } = req.query;

      const options: ListDevicesOptions = {
        userId: userId as string,
        deviceType: deviceType as any,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        hasPushToken: hasPushToken !== undefined ? hasPushToken === 'true' : undefined,
        hasFcmToken: hasFcmToken !== undefined ? hasFcmToken === 'true' : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        orderBy: orderBy as any,
        orderDirection: orderDirection as 'asc' | 'desc',
      };

      const result = await this.deviceService.getDevices(options);

      return res.json({
        success: true,
        data: result.devices,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao listar todos os dispositivos';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Exclui um dispositivo
   */
  async deleteDevice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // @ts-ignore - req.user é adicionado pelo middleware de autenticação
      const userId = req.user.id;

      // Verificar se o dispositivo existe e pertence ao usuário
      const device = await this.deviceService.getDeviceById(id);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Dispositivo não encontrado',
          },
        });
      }

      // Somente o proprietário do dispositivo ou um administrador pode excluir
      // @ts-ignore - req.user é adicionado pelo middleware de autenticação
      if (device.userId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Você não tem permissão para excluir este dispositivo',
          },
        });
      }

      await this.deviceService.deleteDevice(id);

      return res.json({
        success: true,
        data: {
          message: 'Dispositivo excluído com sucesso',
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir dispositivo';
      return res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Atualiza o token do dispositivo
   */
  async updateDeviceToken(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { fcmToken, pushToken } = req.body;

      // @ts-ignore - req.user é adicionado pelo middleware de autenticação
      const userId = req.user.id;

      // Verificar se o dispositivo existe e pertence ao usuário
      const device = await this.deviceService.getDeviceById(id);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Dispositivo não encontrado',
          },
        });
      }

      // Somente o proprietário do dispositivo ou um administrador pode atualizar
      // @ts-ignore - req.user é adicionado pelo middleware de autenticação
      if (device.userId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Você não tem permissão para atualizar este dispositivo',
          },
        });
      }

      // Verificar se pelo menos um token foi fornecido
      if (!fcmToken && !pushToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'É necessário fornecer pelo menos um token (FCM ou Push)',
          },
        });
      }

      const updatedDevice = await this.deviceService.updateDevice(id, {
        fcmToken,
        pushToken,
        lastActiveAt: Timestamp.fromDate(new Date()),
      });

      return res.json({
        success: true,
        data: updatedDevice,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar token do dispositivo';
      return res.status(500).json({ error: errorMessage });
    }
  }
}
