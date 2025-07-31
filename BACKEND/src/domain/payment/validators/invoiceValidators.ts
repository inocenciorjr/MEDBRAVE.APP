import { param, query } from 'express-validator';

/**
 * Validadores para as rotas de faturas
 */
export const invoiceValidators = {
  /**
   * Validador para obter fatura por ID
   */
  getInvoiceById: [param('invoiceId').notEmpty().withMessage('ID da fatura é obrigatório')],

  /**
   * Validador para obter fatura por ID de pagamento
   */
  getInvoiceByPaymentId: [
    param('paymentId').notEmpty().withMessage('ID do pagamento é obrigatório'),
  ],

  /**
   * Validador para listar faturas do usuário
   */
  listUserInvoices: [
    query('userId').optional().isString().withMessage('ID do usuário deve ser uma string'),
  ],

  /**
   * Validador para gerar fatura
   */
  generateInvoice: [param('paymentId').notEmpty().withMessage('ID do pagamento é obrigatório')],
};
