import { Router } from 'express';
import { UserPlanController } from '../controllers/UserPlanController';
import { userPlanValidators } from '../validators/userPlanValidators';
import { authMiddleware } from '../../auth/middleware/auth.middleware';

/**
 * Cria as rotas de planos de usuário
 * @param controller Controlador de planos de usuário
 * @returns Rotas de planos de usuário
 */
export const createUserPlanRoutes = (controller: UserPlanController): Router => {
  const router = Router();

  // Rota para criar um novo plano de usuário (apenas admin)
  router.post(
    '/',
    authMiddleware,
    userPlanValidators.createUserPlan,
    validateRequest,
    controller.createUserPlan,
  );

  // Rota para obter um plano de usuário pelo ID
  router.get(
    '/:userPlanId',
    authMiddleware,
    userPlanValidators.getUserPlanById,
    validateRequest,
    controller.getUserPlanById,
  );

  // Rota para listar planos de um usuário
  router.get(
    '/user/:userId',
    authMiddleware,
    userPlanValidators.listUserPlans,
    validateRequest,
    controller.listUserPlans,
  );

  // Rota para listar planos ativos de um usuário
  router.get(
    '/user/:userId/active',
    authMiddleware,
    userPlanValidators.listUserPlans,
    validateRequest,
    controller.listActiveUserPlans,
  );

  // Rota para listar todos os planos de usuário (apenas admin)
  router.get(
    '/',
    authMiddleware,
    userPlanValidators.listUserPlans,
    validateRequest,
    controller.listAllUserPlans,
  );

  // Rota para cancelar um plano de usuário
  router.post(
    '/:userPlanId/cancel',
    authMiddleware,
    userPlanValidators.cancelUserPlan,
    validateRequest,
    controller.cancelUserPlan,
  );

  // Rota para renovar um plano de usuário (apenas admin)
  router.post(
    '/:userPlanId/renew',
    authMiddleware,
    userPlanValidators.renewUserPlan,
    validateRequest,
    controller.renewUserPlan,
  );

  // Rota para atualizar o status de um plano de usuário (apenas admin)
  router.patch(
    '/:userPlanId/status',
    authMiddleware,
    userPlanValidators.updateUserPlanStatus,
    validateRequest,
    controller.updateUserPlanStatus,
  );

  // Rota para atualizar os metadados de um plano de usuário (apenas admin)
  router.patch(
    '/:userPlanId/metadata',
    authMiddleware,
    userPlanValidators.updateUserPlanMetadata,
    validateRequest,
    controller.updateUserPlanMetadata,
  );

  // Rota para executar a verificação de planos expirados (apenas admin)
  router.post('/check-expired', authMiddleware, controller.checkExpiredPlans);

  return router;
};

// Middleware para tratar erros de validação do express-validator
function validateRequest(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}
