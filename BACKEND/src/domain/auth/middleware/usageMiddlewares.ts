import { PlanAuthenticatedRequest } from './planCheck.middleware';
import { checkLimit } from './enhancedAuth.middleware';
import { usageTrackingService } from '../../payment/services/UsageTrackingService';

/**
 * Middleware para verificar limite de questões por dia
 */
export const checkQuestionsPerDayLimit = checkLimit(
  'maxQuestionsPerDay',
  async (req: PlanAuthenticatedRequest) => {
    if (!req.user?.id) return 0;
    return await usageTrackingService.getQuestionsAnsweredToday(req.user.id);
  },
);

/**
 * Middleware para verificar limite de listas de questões por dia
 */
export const checkQuestionListsPerDayLimit = checkLimit(
  'maxQuestionListsPerDay',
  async (req: PlanAuthenticatedRequest) => {
    if (!req.user?.id) return 0;
    return await usageTrackingService.getQuestionListsCreatedToday(req.user.id);
  },
);

/**
 * Middleware para verificar limite de simulados por mês
 */
export const checkSimulatedExamsPerMonthLimit = checkLimit(
  'maxSimulatedExamsPerMonth',
  async (req: PlanAuthenticatedRequest) => {
    if (!req.user?.id) return 0;
    return await usageTrackingService.getSimulatedExamsThisMonth(req.user.id);
  },
);

/**
 * Middleware para verificar limite de flashcards criados
 */
export const checkFlashcardsCreatedLimit = checkLimit(
  'maxFlashcardsCreated',
  async (req: PlanAuthenticatedRequest) => {
    if (!req.user?.id) return 0;
    return await usageTrackingService.getFlashcardsCreated(req.user.id);
  },
);

/**
 * Middleware para verificar limite de decks de flashcards
 */
export const checkFlashcardDecksLimit = checkLimit(
  'maxFlashcardDecks',
  async (req: PlanAuthenticatedRequest) => {
    if (!req.user?.id) return 0;
    return await usageTrackingService.getFlashcardDecks(req.user.id);
  },
);

/**
 * Middleware para verificar limite de revisões por dia
 */
export const checkReviewsPerDayLimit = checkLimit(
  'maxReviewsPerDay',
  async (req: PlanAuthenticatedRequest) => {
    if (!req.user?.id) return 0;
    return await usageTrackingService.getReviewsToday(req.user.id);
  },
);

/**
 * Middleware para verificar limite de cards FSRS
 */
export const checkFSRSCardsLimit = checkLimit(
  'maxFSRSCards',
  async (req: PlanAuthenticatedRequest) => {
    if (!req.user?.id) return 0;
    return await usageTrackingService.getFSRSCards(req.user.id);
  },
);
