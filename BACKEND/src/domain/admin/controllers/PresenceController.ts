import { Request, Response } from 'express';
import { SocketService } from '../../../services/socketService';
import logger from '../../../utils/logger';

/**
 * Controller para gerenciar presença em tempo real
 */
export class PresenceController {
  constructor(private socketService: SocketService) {}

  /**
   * Obtém todos os usuários online
   */
  async getOnlineUsers(req: Request, res: Response): Promise<void> {
    try {
      const presenceService = this.socketService.getPresenceService();
      const presences = await presenceService.getActivePresences();
      
      res.status(200).json({
        success: true,
        data: presences,
        count: presences.length,
      });
    } catch (error) {
      logger.error('[PresenceController] Error getting online users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get online users',
      });
    }
  }

  /**
   * Obtém presença de um usuário específico
   */
  async getUserPresence(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      const presenceService = this.socketService.getPresenceService();
      const presences = await presenceService.getUserPresence(userId);
      
      res.status(200).json({
        success: true,
        data: presences,
        count: presences.length,
      });
    } catch (error) {
      logger.error('[PresenceController] Error getting user presence:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user presence',
      });
    }
  }

  /**
   * Obtém estatísticas de presença
   */
  async getPresenceStats(req: Request, res: Response): Promise<void> {
    try {
      const presenceService = this.socketService.getPresenceService();
      const onlineCount = await presenceService.getOnlineCount();
      
      res.status(200).json({
        success: true,
        data: {
          onlineCount,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      logger.error('[PresenceController] Error getting presence stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get presence stats',
      });
    }
  }

  /**
   * Força desconexão de um usuário
   */
  async disconnectUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      // Enviar evento de desconexão forçada
      this.socketService.sendToUser(userId, 'force-disconnect', {
        reason: 'Admin action',
        timestamp: Date.now(),
      });
      
      res.status(200).json({
        success: true,
        message: 'User disconnected successfully',
      });
    } catch (error) {
      logger.error('[PresenceController] Error disconnecting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect user',
      });
    }
  }
}
