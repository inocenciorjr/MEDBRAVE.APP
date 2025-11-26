import rateLimit from 'express-rate-limit';
import { PAYMENT_CONSTANTS } from '../domain/payment/constants';

/**
 * Rate limiter para rotas públicas de planos
 */
export const publicPlansRateLimiter = rateLimit({
  windowMs: PAYMENT_CONSTANTS.RATE_LIMIT.PUBLIC_PLANS.windowMs,
  max: PAYMENT_CONSTANTS.RATE_LIMIT.PUBLIC_PLANS.max,
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em alguns instantes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para criação de planos
 */
export const createPlanRateLimiter = rateLimit({
  windowMs: PAYMENT_CONSTANTS.RATE_LIMIT.CREATE_PLAN.windowMs,
  max: PAYMENT_CONSTANTS.RATE_LIMIT.CREATE_PLAN.max,
  message: {
    success: false,
    error: 'Muitas tentativas de criação. Tente novamente em alguns instantes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para atualização de planos
 */
export const updatePlanRateLimiter = rateLimit({
  windowMs: PAYMENT_CONSTANTS.RATE_LIMIT.UPDATE_PLAN.windowMs,
  max: PAYMENT_CONSTANTS.RATE_LIMIT.UPDATE_PLAN.max,
  message: {
    success: false,
    error: 'Muitas tentativas de atualização. Tente novamente em alguns instantes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
