import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { paymentValidators } from '../validators/paymentValidators';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';

/**
 * Cria as rotas de pagamento
 * @param controller Controlador de pagamento
 * @returns Rotas de pagamento
 */
export const createPaymentRoutes = (controller: PaymentController): Router => {
  const router = Router();

  // Rota para receber webhooks de pagamento (sem autenticação) - DEVE VIR PRIMEIRO
  router.post(
    '/webhook',
    paymentValidators.webhookHandler,
    validateRequest,
    controller.webhookHandler,
  );

  // Aplicar middleware de autenticação + plano nas demais rotas
  router.use(enhancedAuthMiddleware);

  // Rota para criar um novo pagamento
  router.post(
    '/',
    paymentValidators.createPayment,
    validateRequest,
    controller.createPayment,
  );

  // Rota para obter um pagamento pelo ID
  router.get(
    '/:paymentId',
    paymentValidators.getPaymentById,
    validateRequest,
    controller.getPaymentById,
  );

  // Rota para listar pagamentos do usuário autenticado
  router.get(
    '/',
    paymentValidators.listPayments,
    validateRequest,
    controller.listUserPayments,
  );

  // Rota para listar pagamentos de um usuário específico (apenas admin)
  router.get(
    '/user/:userId',
    paymentValidators.listPayments,
    validateRequest,
    controller.listUserPayments,
  );

  // Rota para processar um pagamento
  router.post(
    '/:paymentId/process',
    paymentValidators.processPayment,
    validateRequest,
    controller.processPayment,
  );

  // Rota para cancelar um pagamento
  router.post(
    '/:paymentId/cancel',
    paymentValidators.cancelPayment,
    validateRequest,
    controller.cancelPayment,
  );

  // Rota para reembolsar um pagamento (apenas admin)
  router.post(
    '/:paymentId/refund',
    paymentValidators.refundPayment,
    validateRequest,
    controller.refundPayment,
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
