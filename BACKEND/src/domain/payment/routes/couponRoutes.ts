import { Router } from 'express';
import { CouponController } from '../controllers/CouponController';
import { couponValidators } from '../validators/couponValidators';
import { authMiddleware } from '../../auth/middleware/auth.middleware';

/**
 * Cria as rotas de cupons
 * @param controller Controlador de cupons
 * @returns Rotas de cupons
 */
export const createCouponRoutes = (controller: CouponController): Router => {
  const router = Router();

  // Rota para criar um novo cupom (apenas admin)
  router.post(
    '/',
    authMiddleware,
    couponValidators.createCoupon,
    validateRequest,
    controller.createCoupon,
  );

  // Rota para obter um cupom pelo ID (apenas admin)
  router.get(
    '/:couponId',
    authMiddleware,
    couponValidators.getCouponById,
    validateRequest,
    controller.getCouponById,
  );

  // Rota para listar cupons (apenas admin)
  router.get(
    '/',
    authMiddleware,
    couponValidators.listCoupons,
    validateRequest,
    controller.listCoupons,
  );

  // Rota para atualizar um cupom (apenas admin)
  router.put(
    '/:couponId',
    authMiddleware,
    couponValidators.updateCoupon,
    validateRequest,
    controller.updateCoupon,
  );

  // Rota para remover um cupom (apenas admin)
  router.delete(
    '/:couponId',
    authMiddleware,
    couponValidators.deleteCoupon,
    validateRequest,
    controller.deleteCoupon,
  );

  // Rota para validar um cupom (disponível para todos os usuários autenticados)
  router.post(
    '/validate',
    authMiddleware,
    couponValidators.validateCoupon,
    validateRequest,
    controller.validateCoupon,
  );

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
