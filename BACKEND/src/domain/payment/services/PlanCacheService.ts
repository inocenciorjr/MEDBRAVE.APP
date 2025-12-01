import { Plan } from '../types';
import { PAYMENT_CONSTANTS } from '../constants';
import logger from '../../../utils/logger';

/**
 * Serviço de cache em memória para planos
 * Reduz carga no banco de dados para consultas frequentes
 */
export class PlanCacheService {
  private publicPlansCache: {
    data: Plan[] | null;
    timestamp: number;
  } = {
    data: null,
    timestamp: 0,
  };

  private planByIdCache: Map<
    string,
    {
      data: Plan | null;
      timestamp: number;
    }
  > = new Map();

  /**
   * Obtém planos públicos do cache
   */
  getPublicPlans(): Plan[] | null {
    const now = Date.now();
    const ttl = PAYMENT_CONSTANTS.CACHE_TTL_SECONDS.PUBLIC_PLANS * 1000;

    if (
      this.publicPlansCache.data &&
      now - this.publicPlansCache.timestamp < ttl
    ) {
      return this.publicPlansCache.data;
    }

    return null;
  }

  /**
   * Armazena planos públicos no cache
   */
  setPublicPlans(plans: Plan[]): void {
    this.publicPlansCache = {
      data: plans,
      timestamp: Date.now(),
    };
  }

  /**
   * Obtém plano por ID do cache
   */
  getPlanById(planId: string): Plan | null | undefined {
    const cached = this.planByIdCache.get(planId);
    if (!cached) {
      return undefined;
    }

    const now = Date.now();
    const ttl = PAYMENT_CONSTANTS.CACHE_TTL_SECONDS.PLAN_BY_ID * 1000;

    if (now - cached.timestamp < ttl) {
      return cached.data;
    }

    this.planByIdCache.delete(planId);
    return undefined;
  }

  /**
   * Armazena plano por ID no cache
   */
  setPlanById(planId: string, plan: Plan | null): void {
    this.planByIdCache.set(planId, {
      data: plan,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalida cache de um plano específico
   */
  invalidatePlan(planId: string): void {
    this.planByIdCache.delete(planId);
    this.invalidatePublicPlans();
  }

  /**
   * Invalida cache de planos públicos
   */
  invalidatePublicPlans(): void {
    this.publicPlansCache = {
      data: null,
      timestamp: 0,
    };
  }

  /**
   * Limpa todo o cache
   */
  clearAll(): void {
    this.publicPlansCache = {
      data: null,
      timestamp: 0,
    };
    this.planByIdCache.clear();
    logger.info('Cleared all plan cache');
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): {
    publicPlansCache: { cached: boolean; age: number };
    planByIdCacheSize: number;
  } {
    const now = Date.now();
    return {
      publicPlansCache: {
        cached: this.publicPlansCache.data !== null,
        age: this.publicPlansCache.data
          ? now - this.publicPlansCache.timestamp
          : 0,
      },
      planByIdCacheSize: this.planByIdCache.size,
    };
  }
}

// Singleton instance
export const planCacheService = new PlanCacheService();
