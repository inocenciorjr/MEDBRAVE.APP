import { body, param, query } from 'express-validator';

/**
 * Validadores para as rotas de cupons
 */
export const couponValidators = {
  /**
   * Validador para criação de cupom
   */
  createCoupon: [
    body('code')
      .notEmpty()
      .withMessage('Código do cupom é obrigatório')
      .isLength({ min: 3, max: 20 })
      .withMessage('Código deve ter entre 3 e 20 caracteres')
      .matches(/^[A-Z0-9_-]+$/)
      .withMessage('Código deve conter apenas letras maiúsculas, números, underscore e hífen'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Descrição deve ter no máximo 500 caracteres'),
    body('discountType')
      .notEmpty()
      .withMessage('Tipo de desconto é obrigatório')
      .isIn(['percentage', 'fixed_amount'])
      .withMessage('Tipo de desconto inválido. Valores permitidos: percentage, fixed_amount'),
    body('discountValue')
      .notEmpty()
      .withMessage('Valor do desconto é obrigatório')
      .isFloat({ min: 0.01 })
      .withMessage('Valor do desconto deve ser maior que zero'),
    body('expirationDate')
      .optional()
      .isISO8601()
      .withMessage('Data de expiração deve estar no formato ISO8601'),
    body('maxUses')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Número máximo de usos deve ser um número inteiro maior que zero'),
    body('isActive').optional().isBoolean().withMessage('isActive deve ser um valor booleano'),
    body('applicablePlanIds')
      .optional()
      .isArray()
      .withMessage('IDs de planos aplicáveis devem ser um array'),
  ],

  /**
   * Validador para obter cupom por ID
   */
  getCouponById: [param('couponId').notEmpty().withMessage('ID do cupom é obrigatório')],

  /**
   * Validador para listar cupons
   */
  listCoupons: [
    query('isActive').optional().isBoolean().withMessage('isActive deve ser um valor booleano'),
    query('createdBy').optional().isString().withMessage('createdBy deve ser uma string'),
    query('applicablePlanId')
      .optional()
      .isString()
      .withMessage('applicablePlanId deve ser uma string'),
  ],

  /**
   * Validador para atualizar cupom
   */
  updateCoupon: [
    param('couponId').notEmpty().withMessage('ID do cupom é obrigatório'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Descrição deve ter no máximo 500 caracteres'),
    body('discountType')
      .optional()
      .isIn(['percentage', 'fixed_amount'])
      .withMessage('Tipo de desconto inválido. Valores permitidos: percentage, fixed_amount'),
    body('discountValue')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Valor do desconto deve ser maior que zero'),
    body('expirationDate')
      .optional()
      .isISO8601()
      .withMessage('Data de expiração deve estar no formato ISO8601'),
    body('maxUses')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Número máximo de usos deve ser um número inteiro maior que zero'),
    body('isActive').optional().isBoolean().withMessage('isActive deve ser um valor booleano'),
    body('applicablePlanIds')
      .optional()
      .isArray()
      .withMessage('IDs de planos aplicáveis devem ser um array'),
  ],

  /**
   * Validador para remover cupom
   */
  deleteCoupon: [param('couponId').notEmpty().withMessage('ID do cupom é obrigatório')],

  /**
   * Validador para validar cupom
   */
  validateCoupon: [
    body('code').notEmpty().withMessage('Código do cupom é obrigatório'),
    body('planId').optional().isString().withMessage('ID do plano deve ser uma string'),
  ],
};
