/**
 * Constantes do módulo de pagamentos
 */

export const PAYMENT_CONSTANTS = {
  // Paginação
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,

  // Moedas permitidas
  ALLOWED_CURRENCIES: ['BRL', 'USD', 'EUR'] as const,
  DEFAULT_CURRENCY: 'BRL',

  // Limites de planos
  MIN_PLAN_NAME_LENGTH: 3,
  MAX_PLAN_NAME_LENGTH: 100,
  MIN_PLAN_DESCRIPTION_LENGTH: 3,
  MAX_PLAN_DESCRIPTION_LENGTH: 1000,
  MIN_PLAN_DURATION_DAYS: 1,
  MAX_PLAN_DURATION_DAYS: 3650, // ~10 anos

  // Limites de preço
  MIN_PLAN_PRICE: 0,
  MAX_PLAN_PRICE: 999999.99,

  // Cache
  CACHE_TTL_SECONDS: {
    PUBLIC_PLANS: 300, // 5 minutos
    PLAN_BY_ID: 600, // 10 minutos
    USER_PLANS: 60, // 1 minuto
  },

  // Rate limiting
  RATE_LIMIT: {
    PUBLIC_PLANS: {
      windowMs: 60 * 1000, // 1 minuto
      max: 30, // 30 requisições por minuto
    },
    CREATE_PLAN: {
      windowMs: 60 * 1000,
      max: 10,
    },
    UPDATE_PLAN: {
      windowMs: 60 * 1000,
      max: 20,
    },
  },

  // Notificações
  EXPIRATION_WARNING_DAYS: [7, 3, 1], // Avisar 7, 3 e 1 dia antes de expirar
} as const;

export type AllowedCurrency = typeof PAYMENT_CONSTANTS.ALLOWED_CURRENCIES[number];
