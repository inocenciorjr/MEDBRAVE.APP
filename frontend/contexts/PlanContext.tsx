'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserPlan, FeatureAccessResult, LimitUsageResult, PlanFeature, PlanLimit } from '@/types/plan';
import { planService } from '@/services/planService';

interface PlanContextValue {
  userPlan: UserPlan | null;
  loading: boolean;
  error: string | null;
  
  // Métodos
  refreshPlan: () => Promise<void>;
  checkFeature: (feature: PlanFeature) => Promise<FeatureAccessResult>;
  checkLimit: (limit: PlanLimit, currentUsage: number) => Promise<LimitUsageResult>;
  upgradePlan: (planId: string) => Promise<void>;
  cancelPlan: (reason?: string) => Promise<void>;
  
  // Helpers
  isExpiringSoon: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

interface PlanProviderProps {
  children: React.ReactNode;
  token?: string; // Token de autenticação
}

export function PlanProvider({ children, token: tokenProp }: PlanProviderProps) {
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Buscar token do localStorage se não for passado como prop
  const [token, setToken] = useState<string | null>(tokenProp || null);
  
  useEffect(() => {
    if (!tokenProp && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('authToken');
      setToken(storedToken);
    }
  }, [tokenProp]);

  /**
   * Carrega o plano do usuário
   */
  const loadUserPlan = useCallback(async () => {
    if (!token) {
      setUserPlan(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const plan = await planService.getUserPlan(token);
      setUserPlan(plan);
    } catch (err: any) {
      console.error('[PlanContext] Erro ao carregar plano:', err);
      setError(err.message || 'Erro ao carregar plano');
      setUserPlan(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Atualiza o plano (força reload)
   */
  const refreshPlan = useCallback(async () => {
    planService.clearCache();
    await loadUserPlan();
  }, [loadUserPlan]);

  /**
   * Verifica acesso a uma feature
   */
  const checkFeature = useCallback(
    async (feature: PlanFeature): Promise<FeatureAccessResult> => {
      if (!token) {
        return {
          hasAccess: false,
          reason: 'Usuário não autenticado',
          upgradeRequired: true,
        };
      }

      return planService.checkFeatureAccess(token, feature);
    },
    [token]
  );

  /**
   * Verifica uso de um limite
   */
  const checkLimit = useCallback(
    async (limit: PlanLimit, currentUsage: number): Promise<LimitUsageResult> => {
      if (!token) {
        return {
          allowed: false,
          current: currentUsage,
          limit: 0,
          remaining: 0,
          percentage: 100,
          reason: 'Usuário não autenticado',
        };
      }

      return planService.checkLimitUsage(token, limit, currentUsage);
    },
    [token]
  );

  /**
   * Faz upgrade do plano
   */
  const upgradePlan = useCallback(
    async (planId: string) => {
      if (!token) throw new Error('Usuário não autenticado');

      try {
        setLoading(true);
        const newPlan = await planService.upgradePlan(token, planId);
        setUserPlan(newPlan);
      } catch (err: any) {
        console.error('Erro ao fazer upgrade:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  /**
   * Cancela o plano
   */
  const cancelPlan = useCallback(
    async (reason?: string) => {
      if (!token) throw new Error('Usuário não autenticado');

      try {
        setLoading(true);
        await planService.cancelPlan(token, reason);
        await refreshPlan();
      } catch (err: any) {
        console.error('Erro ao cancelar plano:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token, refreshPlan]
  );

  /**
   * Calcula dias restantes
   */
  const daysRemaining = React.useMemo(() => {
    if (!userPlan?.endDate) return null;

    const endDate = new Date(userPlan.endDate);
    const now = new Date();
    const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return Math.max(0, days);
  }, [userPlan]);

  /**
   * Verifica se está expirando em breve
   */
  const isExpiringSoon = React.useMemo(() => {
    if (!userPlan) return false;
    return planService.isExpiringSoon(userPlan);
  }, [userPlan]);

  /**
   * Verifica se expirou
   */
  const isExpired = React.useMemo(() => {
    if (!userPlan) return false;
    return planService.isExpired(userPlan);
  }, [userPlan]);

  // Carrega plano ao montar ou quando token mudar
  useEffect(() => {
    loadUserPlan();
  }, [loadUserPlan]);

  // Polling desabilitado - plano só é carregado ao montar ou quando refreshPlan() é chamado
  // Se precisar de polling, descomente o código abaixo:
  /*
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      loadUserPlan();
    }, 300000); // 5 minutos

    return () => clearInterval(interval);
  }, [token, loadUserPlan]);
  */

  const value: PlanContextValue = {
    userPlan,
    loading,
    error,
    refreshPlan,
    checkFeature,
    checkLimit,
    upgradePlan,
    cancelPlan,
    isExpiringSoon,
    isExpired,
    daysRemaining,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

/**
 * Hook para acessar o contexto de planos
 */
export function usePlanContext() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlanContext must be used within a PlanProvider');
  }
  return context;
}
