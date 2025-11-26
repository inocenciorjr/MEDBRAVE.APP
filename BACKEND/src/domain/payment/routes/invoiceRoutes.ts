import { Router, Request, Response, NextFunction } from 'express';
import { InvoiceController } from '../controllers/InvoiceController';
import { invoiceValidators } from '../validators/invoiceValidators';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { validationResult } from 'express-validator';

/**
 * Cria as rotas de faturas
 * @param controller Controlador de faturas
 * @returns Rotas de faturas
 */
export const createInvoiceRoutes = (controller: InvoiceController): Router => {
  const router = Router();

  // Aplicar middleware de autenticação + plano em todas as rotas
  router.use(enhancedAuthMiddleware);

  // Rota para obter uma fatura pelo ID
  router.get(
    '/:invoiceId',
    invoiceValidators.getInvoiceById,
    validateRequest,
    controller.getInvoiceById,
  );

  // Rota para obter uma fatura pelo ID de pagamento
  router.get(
    '/payment/:paymentId',
    invoiceValidators.getInvoiceByPaymentId,
    validateRequest,
    controller.getInvoiceByPaymentId,
  );

  // Rota para listar faturas do usuário autenticado
  router.get(
    '/',
    invoiceValidators.listUserInvoices,
    validateRequest,
    controller.listUserInvoices,
  );

  // Rota para listar faturas de um usuário específico (apenas admin)
  router.get(
    '/user/:userId',
    invoiceValidators.listUserInvoices,
    validateRequest,
    controller.listUserInvoices,
  );

  // Rota para gerar uma fatura para um pagamento (apenas admin)
  router.post(
    '/generate/:paymentId',
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
