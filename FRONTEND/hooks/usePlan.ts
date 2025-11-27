'use client';

import { usePlanContext } from '@/contexts/PlanContext';
import type { PlanFeature, PlanLimit } from '@/types/plan';

/**
 * Hook principal para verificação de planos
 * 
 * ⚠️ IMPORTANTE: Este hook é apenas para UX!
 * A segurança real está no backend com enhancedAuthMiddleware
 * 
 * Use este hook para:
 * - Mostrar/ocultar botões
 * - Exibir avisos de limite
 * - Direcionar para upgrade
 * 
 * NÃO use para:
 * - Segurança (sempre valide no backend)
 * - Decisões críticas de negócio
 */
export function usePlan() {
  const context = usePlanContext();

  /**
   * Verifica se tem acesso a uma feature (UX only)
   * Backend sempre valida novamente!
   */
  const hasFeature = (feature: PlanFeature): boolean => {
    if (!context.userPlan) return false;
    return context.userPlan.limits[feature] === true;
  };

  /**
   * Verifica se atingiu um limite (UX only)
   * Backend sempre valida novamente!
   */
  const checkLimit = (limit: PlanLimit, currentUsage: number) => {
    if (!context.userPlan) {
      return {
        allowed: false,
        remaining: 0,
        percentage: 100,
        isUnlimited: false,
      };
    }

    const limitValue = context.userPlan.limits[limit];

    // null = ilimitado
    if (limitValue === null) {
      return {
        allowed: true,
        remaining: null,
        percentage: 0,
        isUnlimited: true,
      };
    }

    const allowed = currentUsage < limitValue;
    const remaining = Math.max(0, limitValue - currentUsage);
    const percentage = (currentUsage / limitValue) * 100;

    return {
      allowed,
      remaining,
      percentage,
      isUnlimited: false,
      limit: limitValue,
      current: currentUsage,
    };
  };

  /**
   * Verifica se está próximo do limite (> 80%)
   */
  const isNearLimit = (limit: PlanLimit, currentUsage: number): boolean => {
    const result = checkLimit(limit, currentUsage);
    return !result.isUnlimited && result.percentage >= 80;
  };

  /**
   * Obtém mensagem de upgrade personalizada
   */
  const getUpgradeMessage = (feature?: PlanFeature, limit?: PlanLimit): string => {
    if (feature) {
      const featureNames: Record<PlanFeature, string> = {
        canExportData: 'exportar dados',
        canCreateCustomLists: 'criar listas customizadas',
        canAccessAdvancedStatistics: 'acessar estatísticas avançadas',
        canUseErrorNotebook: 'usar caderno de erros',
        canAccessMentorship: 'acessar mentoria',
        canUseOfflineMode: 'usar modo offline',
        canCustomizeInterface: 'customizar interface',
      };

      return `Faça upgrade para ${featureNames[feature]}`;
    }

    if (limit) {
      const limitNames: Record<PlanLimit, string> = {
        maxQuestionsPerDay: 'mais questões por dia',
        maxQuestionListsPerDay: 'mais listas por dia',
        maxSimulatedExamsPerMonth: 'mais simulados por mês',
        maxFlashcardsCreated: 'mais flashcards',
        maxFlashcardDecks: 'mais decks',
        maxReviewsPerDay: 'mais revisões por dia',
        maxFSRSCards: 'mais cards FSRS',
        maxPulseAIQueriesPerDay: 'mais consultas de IA por dia',
        maxQuestionExplanationsPerDay: 'mais explicações por dia',
        maxContentGenerationPerMonth: 'mais geração de conteúdo',
        maxSupportTicketsPerMonth: 'mais tickets de suporte',
      };

      return `Faça upgrade para ter ${limitNames[limit]}`;
    }

    return 'Faça upgrade para desbloquear mais recursos';
  };

  return {
    // Estado
    userPlan: context.userPlan,
    loading: context.loading,
    error: context.error,
    isExpiringSoon: context.isExpiringSoon,
    isExpired: context.isExpired,
    daysRemaining: context.daysRemaining,

    // Métodos de verificação (UX only)
    hasFeature,
    checkLimit,
    isNearLimit,
    getUpgradeMessage,

    // Métodos de ação (chamam backend)
    refreshPlan: context.refreshPlan,
    upgradePlan: context.upgradePlan,
    cancelPlan: context.cancelPlan,

    // Helpers
    planName: context.userPlan?.planName || 'NONE',
    isFree: context.userPlan?.planName === 'FREE',
    isTrial: context.userPlan?.planName?.includes('TRIAL'),
    isPro: context.userPlan?.planName === 'PRO',
    isPremium: context.userPlan?.planName === 'PREMIUM',
  };
}
