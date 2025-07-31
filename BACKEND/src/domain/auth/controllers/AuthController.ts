import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { LoginRequest, MFAType, MFAVerifyRequest, RefreshTokenRequest } from '../types/auth.types';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../../../utils/logger';

/**
 * Controlador para manipular as requisições de autenticação
 */
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Registra um novo usuário
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Validação básica
      if (!email || !password) {
        res.status(400).json({ error: 'Email e senha são obrigatórios' });
        return;
      }

      const user = await this.authService.register(email, password);
      res.status(201).json({ user });
    } catch (error: any) {
      logger.error('Erro no registro:', error);
      res.status(error.status || 500).json({ error: error.message || 'Erro interno' });
    }
  };

  /**
   * Faz login de um usuário
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const loginData: LoginRequest = req.body;

      // Validação básica
      if (!loginData.email || !loginData.password) {
        res.status(400).json({ error: 'Email e senha são obrigatórios' });
        return;
      }

      const result = await this.authService.login(loginData);

      if (result.mfaRequired) {
        res.status(200).json({
          mfaRequired: true,
          mfaType: result.mfaType,
          user: { id: result.user.uid, email: result.user.email }
        });
        return;
      }

      res.status(200).json({
        user: { id: result.user.uid, email: result.user.email },
        token: result.token,
        refreshToken: result.refreshToken
      });
    } catch (error: any) {
      logger.error('Erro no login:', error);
      res.status(error.status || 401).json({ error: error.message || 'Credenciais inválidas' });
    }
  };

  /**
   * Verifica um código MFA
   */
  verifyMfa = async (req: Request, res: Response): Promise<void> => {
    try {
      const verifyData: MFAVerifyRequest = req.body;

      // Validação básica
      if (!verifyData.userId || !verifyData.code) {
        res.status(400).json({ error: 'Dados incompletos' });
        return;
      }

      const verified = await this.authService.verifyMfa(verifyData);
      
      if (!verified) {
        res.status(401).json({ error: 'Código inválido' });
        return;
      }

      // Gerar tokens após verificação bem-sucedida
      const token = await this.authService.refreshTokens({ refreshToken: '' });
      
      res.status(200).json({
        verified: true,
        token: token.token,
        refreshToken: token.refreshToken
      });
    } catch (error: any) {
      logger.error('Erro na verificação MFA:', error);
      res.status(error.status || 500).json({ error: error.message || 'Erro na verificação' });
    }
  };

  /**
   * Configura MFA para um usuário
   */
  setupMfa = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, mfaType } = req.body;

      // Validação básica
      if (!userId || !mfaType) {
        res.status(400).json({ error: 'Dados incompletos' });
        return;
      }

      const result = await this.authService.setupMfa(userId, mfaType as MFAType);
      
      res.status(200).json({
        secret: result.secret,
        qrCode: result.qrCode,
        setup: true
      });
    } catch (error: any) {
      logger.error('Erro na configuração do MFA:', error);
      res.status(error.status || 500).json({ error: error.message || 'Erro na configuração' });
    }
  };

  /**
   * Desabilita MFA para um usuário
   */
  disableMfa = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, mfaType } = req.body;

      // Validação básica
      if (!userId || !mfaType) {
        res.status(400).json({ error: 'Dados incompletos' });
        return;
      }

      const result = await this.authService.disableMfa(userId, mfaType as MFAType);
      
      res.status(200).json({ disabled: result });
    } catch (error: any) {
      logger.error('Erro ao desabilitar MFA:', error);
      res.status(error.status || 500).json({ error: error.message || 'Erro ao desabilitar' });
    }
  };

  /**
   * Atualiza a senha do usuário
   */
  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, currentPassword, newPassword } = req.body;

      // Validação básica
      if (!userId || !currentPassword || !newPassword) {
        res.status(400).json({ error: 'Dados incompletos' });
        return;
      }

      const result = await this.authService.changePassword(userId, currentPassword, newPassword);
      
      res.status(200).json({ changed: result });
    } catch (error: any) {
      logger.error('Erro na alteração de senha:', error);
      res.status(error.status || 500).json({ error: error.message || 'Erro na alteração' });
    }
  };

  /**
   * Atualiza tokens com refresh token
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const refreshData: RefreshTokenRequest = req.body;

      // Validação básica
      if (!refreshData.refreshToken) {
        res.status(400).json({ error: 'Refresh token não fornecido' });
        return;
      }

      const tokens = await this.authService.refreshTokens(refreshData);
      
      res.status(200).json({
        token: tokens.token,
        refreshToken: tokens.refreshToken
      });
    } catch (error: any) {
      logger.error('Erro na atualização de tokens:', error);
      res.status(error.status || 401).json({ error: error.message || 'Token inválido' });
    }
  };

  /**
   * Solicita redefinição de senha
   */
  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      // Validação básica
      if (!email) {
        res.status(400).json({ error: 'Email não fornecido' });
        return;
      }

      await this.authService.forgotPassword(email);
      
      // Sempre retorna sucesso para não revelar existência de contas
      res.status(200).json({ message: 'Se o email existir, um link de recuperação será enviado' });
    } catch (error: any) {
      logger.error('Erro na solicitação de redefinição de senha:', error);
      // Sempre retorna sucesso para não revelar existência de contas
      res.status(200).json({ message: 'Se o email existir, um link de recuperação será enviado' });
    }
  };

  /**
   * Redefine a senha com um token
   */
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      // Validação básica
      if (!token || !newPassword) {
        res.status(400).json({ error: 'Dados incompletos' });
        return;
      }

      const result = await this.authService.resetPassword(token, newPassword);
      
      res.status(200).json({ reset: result });
    } catch (error: any) {
      logger.error('Erro na redefinição de senha:', error);
      res.status(error.status || 400).json({ error: error.message || 'Erro na redefinição' });
    }
  };

  /**
   * Verifica o email do usuário
   */
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      // Validação básica
      if (!token) {
        res.status(400).json({ error: 'Token não fornecido' });
        return;
      }

      const result = await this.authService.verifyEmail(token);
      
      res.status(200).json({ verified: result });
    } catch (error: any) {
      logger.error('Erro na verificação de email:', error);
      res.status(error.status || 400).json({ error: error.message || 'Erro na verificação' });
    }
  };

  /**
   * Realiza o logout do usuário
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId; // Obtém do middleware de autenticação

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      await this.authService.logout(userId);
      
      res.status(200).json({ logout: true });
    } catch (error: any) {
      logger.error('Erro no logout:', error);
      res.status(error.status || 500).json({ error: error.message || 'Erro no logout' });
    }
  };

  /**
   * Sincroniza usuário com backend (criação/atualização segura)
   */
  syncUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user; // Usuário do middleware de autenticação

      if (!user || !user.id) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // Usar o auth middleware que já cria o usuário com slug
      // O middleware já fez todo o trabalho, só precisamos confirmar
      const result = await this.authService.syncUser(user.id, user);
      
      res.status(200).json({ 
        synced: true,
        user: result,
        message: 'Usuário sincronizado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro na sincronização do usuário:', error);
      res.status(error.status || 500).json({ error: error.message || 'Erro na sincronização' });
    }
  };
}