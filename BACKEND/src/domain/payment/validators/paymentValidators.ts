import { body, param, query } from 'express-validator';
import { PaymentMethod, PaymentStatus } from '../types';

/**
 * Validadores para as rotas de pagamento
 */
export const paymentValidators = {
  /**
   * Validador para criação de pagamento
   */
  createPayment: [
    body('planId').notEmpty().withMessage('ID do plano é obrigatório'),
    body('amount')
      .isNumeric()
      .withMessage('Valor deve ser numérico')
      .isFloat({ min: 0.01 })
      .withMessage('Valor deve ser maior que zero'),
    body('paymentMethod')
      .notEmpty()
      .withMessage('Método de pagamento é obrigatório')
      .isIn(Object.values(PaymentMethod))
      .withMessage(
        `Método de pagamento inválido. Valores permitidos: ${Object.values(PaymentMethod).join(', ')}`,
      ),
    body('originalAmount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Valor original deve ser maior que zero'),
    body('discountAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Valor de desconto deve ser não-negativo'),
  ],

  /**
   * Validador para obter pagamento por ID
   */
  getPaymentById: [
    param('paymentId').notEmpty().withMessage('ID do pagamento é obrigatório'),
  ],

  /**
   * Validador para listar pagamentos
   */
  listPayments: [
    query('userId')
      .optional()
      .isString()
      .withMessage('ID do usuário deve ser uma string'),
    query('planId')
      .optional()
      .isString()
      .withMessage('ID do plano deve ser uma string'),
    query('status')
      .optional()
      .isIn(Object.values(PaymentStatus))
      .withMessage(
        `Status inválido. Valores permitidos: ${Object.values(PaymentStatus).join(', ')}`,
      ),
    query('paymentMethod')
      .optional()
      .isIn(Object.values(PaymentMethod))
      .withMessage(
        `Método de pagamento inválido. Valores permitidos: ${Object.values(PaymentMethod).join(', ')}`,
      ),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Data inicial deve estar no formato ISO8601'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Data final deve estar no formato ISO8601'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite deve ser um número inteiro entre 1 e 100'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página deve ser um número inteiro maior que zero'),
  ],

  /**
   * Validador para processar pagamento
   */
  processPayment: [
    param('paymentId').notEmpty().withMessage('ID do pagamento é obrigatório'),
  ],

  /**
   * Validador para cancelar pagamento
   */
  cancelPayment: [
    param('paymentId').notEmpty().withMessage('ID do pagamento é obrigatório'),
    body('reason')
      .notEmpty()
      .withMessage('Motivo do cancelamento é obrigatório')
      .isLength({ min: 3, max: 500 })
      .withMessage('Motivo deve ter entre 3 e 500 caracteres'),
  ],

  /**
   * Validador para reembolsar pagamento
   */
  refundPayment: [
    param('paymentId').notEmpty().withMessage('ID do pagamento é obrigatório'),
    body('reason')
      .notEmpty()
      .withMessage('Motivo do reembolso é obrigatório')
      .isLength({ min: 3, max: 500 })
      .withMessage('Motivo deve ter entre 3 e 500 caracteres'),
  ],

  /**
   * Validador para webhook de pagamento
   */
  webhookHandler: [
    body('gateway').notEmpty().withMessage('Gateway é obrigatório'),
    body('event').notEmpty().withMessage('Evento é obrigatório'),
    body('data')
      .notEmpty()
      .withMessage('Dados são obrigatórios')
      .isObject()
      .withMessage('Dados devem ser um objeto'),
  ],
};
