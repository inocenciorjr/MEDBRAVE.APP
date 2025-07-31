import { body, param, query } from 'express-validator';
import { PlanInterval } from '../types';

/**
 * Validadores para as rotas de planos
 */
export const planValidators = {
  /**
   * Validador para criação de plano
   */
  createPlan: [
    body('name')
      .notEmpty()
      .withMessage('Nome é obrigatório')
      .isLength({ min: 3, max: 100 })
      .withMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('description')
      .notEmpty()
      .withMessage('Descrição é obrigatória')
      .isLength({ min: 3, max: 1000 })
      .withMessage('Descrição deve ter entre 3 e 1000 caracteres'),
    body('price')
      .isNumeric()
      .withMessage('Preço deve ser numérico')
      .isFloat({ min: 0 })
      .withMessage('Preço deve ser não-negativo'),
    body('currency')
      .optional()
      .isString()
      .withMessage('Moeda deve ser uma string')
      .isLength({ min: 3, max: 3 })
      .withMessage('Moeda deve ter 3 caracteres'),
    body('durationDays')
      .isInt({ min: 1 })
      .withMessage('Duração em dias deve ser um número inteiro maior que zero'),
    body('isActive').optional().isBoolean().withMessage('isActive deve ser um valor booleano'),
    body('isPublic').optional().isBoolean().withMessage('isPublic deve ser um valor booleano'),
    body('features').optional().isArray().withMessage('Features deve ser um array'),
    body('interval')
      .optional()
      .isIn(Object.values(PlanInterval))
      .withMessage(
        `Intervalo inválido. Valores permitidos: ${Object.values(PlanInterval).join(', ')}`,
      ),
    body('displayOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Ordem de exibição deve ser um número inteiro não-negativo'),
  ],

  /**
   * Validador para obter plano por ID
   */
  getPlanById: [param('planId').notEmpty().withMessage('ID do plano é obrigatório')],

  /**
   * Validador para listar planos
   */
  listPlans: [
    query('isActive').optional().isBoolean().withMessage('isActive deve ser um valor booleano'),
    query('isPublic').optional().isBoolean().withMessage('isPublic deve ser um valor booleano'),
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
   * Validador para atualizar plano
   */
  updatePlan: [
    param('planId').notEmpty().withMessage('ID do plano é obrigatório'),
    body('name')
      .optional()
      .isLength({ min: 3, max: 100 })
      .withMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('description')
      .optional()
      .isLength({ min: 3, max: 1000 })
      .withMessage('Descrição deve ter entre 3 e 1000 caracteres'),
    body('price')
      .optional()
      .isNumeric()
      .withMessage('Preço deve ser numérico')
      .isFloat({ min: 0 })
      .withMessage('Preço deve ser não-negativo'),
    body('currency')
      .optional()
      .isString()
      .withMessage('Moeda deve ser uma string')
      .isLength({ min: 3, max: 3 })
      .withMessage('Moeda deve ter 3 caracteres'),
    body('durationDays')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Duração em dias deve ser um número inteiro maior que zero'),
    body('isActive').optional().isBoolean().withMessage('isActive deve ser um valor booleano'),
    body('isPublic').optional().isBoolean().withMessage('isPublic deve ser um valor booleano'),
    body('features').optional().isArray().withMessage('Features deve ser um array'),
    body('interval')
      .optional()
      .isIn(Object.values(PlanInterval))
      .withMessage(
        `Intervalo inválido. Valores permitidos: ${Object.values(PlanInterval).join(', ')}`,
      ),
    body('displayOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Ordem de exibição deve ser um número inteiro não-negativo'),
  ],

  /**
   * Validador para remover plano
   */
  deletePlan: [param('planId').notEmpty().withMessage('ID do plano é obrigatório')],
};
