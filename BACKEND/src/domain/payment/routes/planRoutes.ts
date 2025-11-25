import { Router } from 'express';
import { PlanController } from '../controllers/PlanController';
import { planValidators } from '../validators/planValidators';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';

/**
 * Cria as rotas de planos
 * @param controller Controlador de planos
 * @returns Rotas de planos
 */
export const createPlanRoutes = (controller: PlanController): Router => {
  const router = Router();

  // Rota para criar um novo plano (apenas admin)
  router.post(
    '/',
    authMiddleware,
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

  // Rota para listar planos públicos ativos
  router.get('/public', controller.listPublicPlans);

  // Rota para listar todos os planos (apenas admin)
  router.get(
    '/',
    authMiddleware,
    planValidators.listPlans,
    validateRequest,
    controller.listAllPlans,
  );

  // Rota para atualizar um plano (apenas admin)
  router.put(
    '/:planId',
    authMiddleware,
    planValidators.updatePlan,
    validateRequest,
    controller.updatePlan,
  );

  // Rota para remover um plano (apenas admin)
  router.delete(
    '/:planId',
    authMiddleware,
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
