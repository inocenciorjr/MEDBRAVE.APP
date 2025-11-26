import { PAYMENT_CONSTANTS } from '../constants';

/**
 * Schema de validação para PlanLimits
 * Pode ser usado com bibliotecas como Joi, Yup, Zod, etc.
 */
export const PlanLimitsSchema = {
  // Questões
  maxQuestionsPerDay: {
    type: 'number',
    nullable: true,
    min: 0,
    description: 'Máximo de questões por dia (null = ilimitado)',
  },
  maxQuestionListsPerDay: {
    type: 'number',
    nullable: true,
    min: 0,
    description: 'Máximo de listas de questões por dia',
  },
  maxSimulatedExamsPerMonth: {
    type: 'number',
    nullable: true,
    min: 0,
    description: 'Máximo de simulados por mês',
  },

  // FSRS/SRS
  maxFSRSCards: {
    type: 'number',
    nullable: true,
    min: 0,
    description: 'Máximo de cards FSRS',
  },
  maxReviewsPerDay: {
    type: 'number',
    nullable: true,
    min: 0,
    description: 'Máximo de revisões por dia',
  },

  // Flashcards
  maxFlashcardsCreated: {
    type: 'number',
    nullable: true,
    min: 0,
    description: 'Máximo de flashcards criados',
  },
  maxFlashcardDecks: {
    type: 'number',
    nullable: true,
    min: 0,
    description: 'Máximo de decks de flashcards',
  },

  // IA Features
  maxPulseAIQueriesPerDay: {
    type: 'number',
    nullable: true,
    min: 0,
    description: 'Máximo de consultas Pulse AI por dia',
  },
  maxQuestionExplanationsPerDay: {
    type: 'number',
    nullable: true,
    min: 0,
    description: 'Máximo de explicações de questões por dia',
  },
  maxContentGenerationPerMonth: {
    type: 'number',
    nullable: true,
    min: 0,
    description: 'Máximo de gerações de conteúdo por mês',
  },

  // Funcionalidades Premium
  canExportData: {
    type: 'boolean',
    description: 'Permite exportar dados',
  },
  canCreateCustomLists: {
    type: 'boolean',
    description: 'Permite criar listas customizadas',
  },
  canAccessAdvancedStatistics: {
    type: 'boolean',
    description: 'Acesso a estatísticas avançadas',
  },
  canUseErrorNotebook: {
    type: 'boolean',
    description: 'Pode usar caderno de erros',
  },
  canAccessMentorship: {
    type: 'boolean',
    description: 'Acesso a mentoria',
  },
  canUseOfflineMode: {
    type: 'boolean',
    description: 'Pode usar modo offline',
  },
  canCustomizeInterface: {
    type: 'boolean',
    description: 'Pode customizar interface',
  },

  // Suporte
  supportLevel: {
    type: 'string',
    enum: ['basic', 'priority', 'premium'],
    description: 'Nível de suporte',
  },
  maxSupportTicketsPerMonth: {
    type: 'number',
    nullable: true,
    min: 0,
    description: 'Máximo de tickets de suporte por mês',
  },
} as const;

/**
 * Schema de validação para Plan
 */
export const PlanSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: PAYMENT_CONSTANTS.MIN_PLAN_NAME_LENGTH,
    maxLength: PAYMENT_CONSTANTS.MAX_PLAN_NAME_LENGTH,
    description: 'Nome do plano',
  },
  description: {
    type: 'string',
    required: true,
    minLength: PAYMENT_CONSTANTS.MIN_PLAN_DESCRIPTION_LENGTH,
    maxLength: PAYMENT_CONSTANTS.MAX_PLAN_DESCRIPTION_LENGTH,
    description: 'Descrição do plano',
  },
  price: {
    type: 'number',
    required: true,
    min: PAYMENT_CONSTANTS.MIN_PLAN_PRICE,
    max: PAYMENT_CONSTANTS.MAX_PLAN_PRICE,
    description: 'Preço do plano',
  },
  currency: {
    type: 'string',
    enum: PAYMENT_CONSTANTS.ALLOWED_CURRENCIES,
    default: PAYMENT_CONSTANTS.DEFAULT_CURRENCY,
    description: 'Moeda do plano',
  },
  durationDays: {
    type: 'number',
    required: true,
    min: PAYMENT_CONSTANTS.MIN_PLAN_DURATION_DAYS,
    max: PAYMENT_CONSTANTS.MAX_PLAN_DURATION_DAYS,
    description: 'Duração do plano em dias',
  },
  interval: {
    type: 'string',
    enum: ['monthly', 'yearly'],
    default: 'monthly',
    description: 'Intervalo de cobrança',
  },
  isActive: {
    type: 'boolean',
    default: true,
    description: 'Plano está ativo',
  },
  isPublic: {
    type: 'boolean',
    default: true,
    description: 'Plano é público',
  },
  features: {
    type: 'array',
    items: { type: 'string' },
    default: [],
    description: 'Lista de features do plano',
  },
  limits: {
    type: 'object',
    schema: PlanLimitsSchema,
    description: 'Limites do plano',
  },
  badge: {
    type: 'string',
    nullable: true,
    description: 'Badge do plano (ex: POPULAR)',
  },
  highlight: {
    type: 'boolean',
    default: false,
    description: 'Destacar plano na interface',
  },
  displayOrder: {
    type: 'number',
    default: 0,
    min: 0,
    description: 'Ordem de exibição',
  },
} as const;

/**
 * Exemplos de planos válidos
 */
export const PLAN_EXAMPLES = {
  basic: {
    name: 'Básico',
    description: 'Plano básico para iniciantes',
    price: 29.9,
    currency: 'BRL',
    durationDays: 30,
    interval: 'monthly',
    features: ['100 questões por dia', 'Estatísticas básicas'],
    limits: {
      maxQuestionsPerDay: 100,
      maxFlashcardsCreated: 500,
      canExportData: false,
      supportLevel: 'basic',
    },
  },
  premium: {
    name: 'Premium',
    description: 'Plano completo com todos os recursos',
    price: 99.9,
    currency: 'BRL',
    durationDays: 30,
    interval: 'monthly',
    badge: 'POPULAR',
    highlight: true,
    features: [
      'Questões ilimitadas',
      'Estatísticas avançadas',
      'Mentoria',
      'Suporte prioritário',
    ],
    limits: {
      maxQuestionsPerDay: null,
      maxFlashcardsCreated: null,
      canExportData: true,
      canAccessAdvancedStatistics: true,
      canAccessMentorship: true,
      supportLevel: 'premium',
    },
  },
} as const;
