import { Router, Request, Response, NextFunction } from 'express';
import { InvoiceController } from '../controllers/InvoiceController';
import { invoiceValidators } from '../validators/invoiceValidators';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { validationResult } from 'express-validator';

// Adapta middlewares async para Express
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Cria as rotas de faturas
 * @param controller Controlador de faturas
 * @returns Rotas de faturas
 */
export const createInvoiceRoutes = (controller: InvoiceController): Router => {
  const router = Router();

  // Rota para obter uma fatura pelo ID
  router.get(
    '/:invoiceId',
    asyncHandler(authMiddleware),
    invoiceValidators.getInvoiceById,
    validateRequest,
    controller.getInvoiceById,
  );

  // Rota para obter uma fatura pelo ID de pagamento
  router.get(
    '/payment/:paymentId',
    asyncHandler(authMiddleware),
    invoiceValidators.getInvoiceByPaymentId,
    validateRequest,
    controller.getInvoiceByPaymentId,
  );

  // Rota para listar faturas do usuário autenticado
  router.get(
    '/',
    asyncHandler(authMiddleware),
    invoiceValidators.listUserInvoices,
    validateRequest,
    controller.listUserInvoices,
  );

  // Rota para listar faturas de um usuário específico (apenas admin)
  router.get(
    '/user/:userId',
    asyncHandler(authMiddleware),
    invoiceValidators.listUserInvoices,
    validateRequest,
    controller.listUserInvoices,
  );

  // Rota para gerar uma fatura para um pagamento (apenas admin)
  router.post(
    '/generate/:paymentId',
    asyncHandler(authMiddleware),
    invoiceValidators.generateInvoice,
    validateRequest,
    controller.generateInvoice,
  );

  return router;
};

// Middleware para tratar erros de validação do express-validator
function validateRequest(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}
