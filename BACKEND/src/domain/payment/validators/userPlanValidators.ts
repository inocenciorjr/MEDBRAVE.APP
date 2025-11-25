import { body, param, query } from 'express-validator';
import { PaymentMethod, UserPlanStatus } from '../types';

/**
 * Validadores para as rotas de planos de usuário
 */
export const userPlanValidators = {
  /**
   * Validador para criação de plano de usuário
   */
  createUserPlan: [
    body('userId').notEmpty().withMessage('ID do usuário é obrigatório'),
    body('planId').notEmpty().withMessage('ID do plano é obrigatório'),
    body('startDate')
      .notEmpty()
      .withMessage('Data de início é obrigatória')
      .isISO8601()
      .withMessage('Data de início deve estar no formato ISO8601'),
    body('endDate')
      .notEmpty()
      .withMessage('Data de término é obrigatória')
      .isISO8601()
      .withMessage('Data de término deve estar no formato ISO8601'),
    body('paymentMethod')
      .isIn(Object.values(PaymentMethod))
      .withMessage(
        `Método de pagamento inválido. Valores permitidos: ${Object.values(PaymentMethod).join(', ')}`,
      ),
    body('autoRenew')
      .optional()
      .isBoolean()
      .withMessage('autoRenew deve ser um valor booleano'),
  ],

  /**
   * Validador para obter plano de usuário por ID
   */
  getUserPlanById: [
    param('userPlanId')
      .notEmpty()
      .withMessage('ID do plano de usuário é obrigatório'),
  ],

  /**
   * Validador para listar planos de usuário
   */
  listUserPlans: [
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
      .isIn(Object.values(UserPlanStatus))
      .withMessage(
        `Status inválido. Valores permitidos: ${Object.values(UserPlanStatus).join(', ')}`,
      ),
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
   * Validador para cancelar plano de usuário
   */
  cancelUserPlan: [
    param('userPlanId')
      .notEmpty()
      .withMessage('ID do plano de usuário é obrigatório'),
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Motivo deve ter no máximo 500 caracteres'),
  ],

  /**
   * Validador para renovar plano de usuário
   */
  renewUserPlan: [
    param('userPlanId')
      .notEmpty()
      .withMessage('ID do plano de usuário é obrigatório'),
    body('durationDays')
      .isInt({ min: 1 })
      .withMessage('Duração em dias deve ser um número inteiro maior que zero'),
    body('paymentId')
      .optional()
      .isString()
      .withMessage('ID do pagamento deve ser uma string'),
    body('paymentMethod')
      .optional()
      .isIn(Object.values(PaymentMethod))
      .withMessage(
        `Método de pagamento inválido. Valores permitidos: ${Object.values(PaymentMethod).join(', ')}`,
      ),
  ],

  /**
   * Validador para atualizar status de plano de usuário
   */
  updateUserPlanStatus: [
    param('userPlanId')
      .notEmpty()
      .withMessage('ID do plano de usuário é obrigatório'),
    body('status')
      .notEmpty()
      .withMessage('Status é obrigatório')
      .isIn(Object.values(UserPlanStatus))
      .withMessage(
        `Status inválido. Valores permitidos: ${Object.values(UserPlanStatus).join(', ')}`,
      ),
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Motivo deve ter no máximo 500 caracteres'),
  ],

  /**
   * Validador para atualizar metadados de plano de usuário
   */
  updateUserPlanMetadata: [
    param('userPlanId')
      .notEmpty()
      .withMessage('ID do plano de usuário é obrigatório'),
    body('metadata')
      .notEmpty()
      .withMessage('Metadados são obrigatórios')
      .isObject()
      .withMessage('Metadados devem ser um objeto'),
  ],
};
