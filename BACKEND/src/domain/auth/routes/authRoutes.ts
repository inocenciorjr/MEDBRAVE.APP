import express, { Router } from 'express';
import { FirebaseAuthRepository } from '../repositories/FirebaseAuthRepository';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { authMiddleware } from '../middleware/auth.middleware';

/**
 * Cria e configura as rotas de autenticação
 * @returns Router configurado com rotas de autenticação
 */
export const createAuthRoutes = (): Router => {
  const router = express.Router();
  
  // Inicializar repositórios, serviços e controladores
  const authRepository = new FirebaseAuthRepository();
  const authService = new AuthService(authRepository);
  const authController = new AuthController(authService);

  // Rotas públicas
  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.post('/refresh-token', authController.refreshToken);
  router.post('/forgot-password', authController.forgotPassword);
  router.post('/reset-password', authController.resetPassword);
  router.post('/verify-email', authController.verifyEmail);
  
  // Rotas protegidas (requerem autenticação)
  router.use(authMiddleware);
  router.post('/sync-user', authController.syncUser);
  router.post('/logout', authController.logout);
  router.post('/change-password', authController.changePassword);
  router.post('/mfa/setup', authController.setupMfa);
  router.post('/mfa/verify', authController.verifyMfa);
  router.post('/mfa/disable', authController.disableMfa);
  
  return router;
};

export default createAuthRoutes; 