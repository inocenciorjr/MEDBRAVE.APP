import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/supabaseAuth.middleware';
import { SessionService } from '../services/SessionService';

export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService();
  }

  /**
   * Revoga uma sessão específica
   */
  revokeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      if (!sessionId) {
        res.status(400).json({ error: 'sessionId é obrigatório' });
        return;
      }

      await this.sessionService.revokeSession(sessionId);

      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao revogar sessão:', error);
      res.status(500).json({ error: 'Erro ao revogar sessão' });
    }
  };

  /**
   * Revoga todas as sessões exceto a atual
   */
  revokeAllOtherSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const currentSessionId = req.headers['x-session-id'] as string;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const count = await this.sessionService.revokeAllOtherSessions(
        userId,
        currentSessionId
      );

      res.json({ 
        success: true,
        revokedCount: count 
      });
    } catch (error) {
      console.error('Erro ao revogar outras sessões:', error);
      res.status(500).json({ error: 'Erro ao revogar outras sessões' });
    }
  };

  /**
   * Limpa sessões antigas mantendo apenas as N mais recentes
   */
  cleanupOldSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { maxSessions = 2 } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const count = await this.sessionService.cleanupOldSessions(
        userId,
        maxSessions
      );

      res.json({ 
        success: true,
        revokedCount: count 
      });
    } catch (error) {
      console.error('Erro ao limpar sessões antigas:', error);
      res.status(500).json({ error: 'Erro ao limpar sessões antigas' });
    }
  };

  /**
   * Lista todas as sessões do usuário
   */
  listSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const sessions = await this.sessionService.listUserSessions(userId);

      res.json({ sessions });
    } catch (error) {
      console.error('Erro ao listar sessões:', error);
      res.status(500).json({ error: 'Erro ao listar sessões' });
    }
  };

  /**
   * Remove TODAS as sessões antigas de um usuário (admin only)
   */
  purgeAllOldSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      const adminUserId = req.user?.id;

      if (!adminUserId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // Verificar se é admin
      const isAdmin = await this.sessionService.isUserAdmin(adminUserId);
      if (!isAdmin) {
        res.status(403).json({ error: 'Acesso negado' });
        return;
      }

      if (!email) {
        res.status(400).json({ error: 'email é obrigatório' });
        return;
      }

      const count = await this.sessionService.purgeAllUserSessions(email);

      res.json({ 
        success: true,
        revokedCount: count 
      });
    } catch (error) {
      console.error('Erro ao purgar sessões:', error);
      res.status(500).json({ error: 'Erro ao purgar sessões' });
    }
  };
}
