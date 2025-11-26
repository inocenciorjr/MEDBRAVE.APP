import { Router } from 'express';
import { PlanController } from '../controllers/PlanController';
import { planValidators } from '../validators/planValidators';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import {
  publicPlansRateLimiter,
  createPlanRateLimiter,
  updatePlanRateLimiter,
} from '../../../middleware/rateLimiter';

/**
 * Cria as rotas de planos
 * @param controller Controlador de planos
 * @returns Rotas de planos
 */
export const createPlanRoutes = (controller: PlanController): Router => {
  const router = Router();

  // Rota para listar planos públicos ativos (com rate limit) - SEM autenticação
  router.get('/public', publicPlansRateLimiter, controller.listPublicPlans);

  // Aplicar middleware de autenticação + plano nas demais rotas
  router.use(enhancedAuthMiddleware);

  // Rota para criar um novo plano (apenas admin, com rate limit)
  router.post(
    '/',
    createPlanRateLimiter,
    planValidators.createPlan,
    validateRequest,
    controller.createPlan,
  );

  // Rota para obter um plano pelo ID
  router.get(
    '/:planId',
    planValidators.getPlanById,
    validateRequest,
    controller.getPlanById,
  );

  // Rota para listar todos os planos (apenas admin)
  router.get(
    '/',
    planValidators.listPlans,
    validateRequest,
    controller.listAllPlans,
  );

  // Rota para atualizar um plano (apenas admin, com rate limit)
  router.put(
    '/:planId',
    updatePlanRateLimiter,
    planValidators.updatePlan,
    validateRequest,
    controller.updatePlan,
  );

  // Rota para remover um plano (apenas admin)
  router.delete(
    '/:planId',
    planValidators.deletePlan,
    validateRequest,
    controller.deletePlan,
  );

  return router;
};

// Middleware para tratar erros de validação do express-validator
function validateRequest(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction,
) {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}
