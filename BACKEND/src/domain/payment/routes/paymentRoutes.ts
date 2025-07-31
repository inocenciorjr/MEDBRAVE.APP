import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { paymentValidators } from '../validators/paymentValidators';
import { authMiddleware } from '../../auth/middleware/auth.middleware';

/**
 * Cria as rotas de pagamento
 * @param controller Controlador de pagamento
 * @returns Rotas de pagamento
 */
export const createPaymentRoutes = (controller: PaymentController): Router => {
  const router = Router();

  // Rota para criar um novo pagamento
  router.post(
    '/',
    authMiddleware,
    paymentValidators.createPayment,
    validateRequest,
    controller.createPayment,
  );

  // Rota para obter um pagamento pelo ID
  router.get(
    '/:paymentId',
    authMiddleware,
    paymentValidators.getPaymentById,
    validateRequest,
    controller.getPaymentById,
  );

  // Rota para listar pagamentos do usuário autenticado
  router.get(
    '/',
    authMiddleware,
    paymentValidators.listPayments,
    validateRequest,
    controller.listUserPayments,
  );

  // Rota para listar pagamentos de um usuário específico (apenas admin)
  router.get(
    '/user/:userId',
    authMiddleware,
    paymentValidators.listPayments,
    validateRequest,
    controller.listUserPayments,
  );

  // Rota para processar um pagamento
  router.post(
    '/:paymentId/process',
    authMiddleware,
    paymentValidators.processPayment,
    validateRequest,
    controller.processPayment,
  );

  // Rota para cancelar um pagamento
  router.post(
    '/:paymentId/cancel',
    authMiddleware,
    paymentValidators.cancelPayment,
    validateRequest,
    controller.cancelPayment,
  );

  // Rota para reembolsar um pagamento (apenas admin)
  router.post(
    '/:paymentId/refund',
    authMiddleware,
    paymentValidators.refundPayment,
    validateRequest,
    controller.refundPayment,
  );

  // Rota para receber webhooks de pagamento (sem autenticação)
  router.post(
    '/webhook',
    paymentValidators.webhookHandler,
    validateRequest,
    controller.webhookHandler,
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
