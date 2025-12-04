'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTokenRef = useRef<string | null>(null);

  // Efeito para sincronizar token com localStorage
  // Usa polling para detectar mudanças (storage event não funciona na mesma aba)
  useEffect(() => {
    if (tokenProp) {
      setToken(tokenProp);
      return;
    }

    if (typeof window === 'undefined') return;

    // Detectar Edge Mobile
    const isEdgeMobile = /Edg|Edge/i.test(navigator.userAgent) && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);

    // Função para verificar e atualizar token (com fallback para sessionStorage - Edge Mobile fix)
    const checkToken = async (isInitial = false) => {
      // No Edge Mobile, NÃO fazer requisições na página de callback
      // A página de destino vai carregar os dados
      if (isEdgeMobile && window.location.pathname.includes('/auth/callback')) {
        console.log('[PlanContext] Edge Mobile: ignorando na página de callback');
        return;
      }
      
      // No Edge Mobile, delay inicial para evitar requisições durante navegação
      if (isEdgeMobile && isInitial) {
        console.log('[PlanContext] Edge Mobile: aguardando navegação estabilizar...');
        await new Promise(r => setTimeout(r, 1000));
      }

      // ✅ EDGE MOBILE FIX: Verificar localStorage e sessionStorage
      let storedToken = localStorage.getItem('authToken');
      if (!storedToken) {
        storedToken = sessionStorage.getItem('authToken');
      }

      // No Edge Mobile com isInitial, SEMPRE carregar o plano se tiver token
      // (não depender do lastTokenRef que pode estar desatualizado)
      const shouldForceLoad = isEdgeMobile && isInitial && storedToken && !userPlan;
      
      // Só atualiza se o token mudou OU se é Edge Mobile inicial
      if (storedToken !== lastTokenRef.current || shouldForceLoad) {
        const hadToken = lastTokenRef.current;
        lastTokenRef.current = storedToken;
        setToken(storedToken);

        // Se o token apareceu OU é Edge Mobile inicial, carregar plano
        if (storedToken && (!hadToken || shouldForceLoad)) {
          console.log('[PlanContext] Carregando plano...', shouldForceLoad ? '(forçado Edge Mobile)' : '');
          planService.clearCache();
          setLoading(true);
          try {
            const plan = await planService.getUserPlan(storedToken);
            console.log('[PlanContext] Plano carregado:', plan?.planName || 'nenhum');
            setUserPlan(plan);
          } catch (err: any) {
            console.error('[PlanContext] Erro ao carregar plano:', err);
            setUserPlan(null);
          } finally {
            setLoading(false);
          }
        } else if (!storedToken) {
          setUserPlan(null);
          setLoading(false);
        }
      }
    };

    // Verificar imediatamente (com flag de inicial para delay no Edge Mobile)
    checkToken(true);

    // ✅ OTIMIZAÇÃO: Polling reduzido para 2s (evento customizado é o principal mecanismo)
    tokenCheckIntervalRef.current = setInterval(checkToken, 2000);

    // Também escutar evento de storage (funciona entre abas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        checkToken();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Escutar evento customizado de atualização de token (disparado pelo callback de auth)
    const handleAuthTokenUpdated = async (e: CustomEvent) => {
      // No Edge Mobile, ignorar evento durante navegação recente para evitar requisições canceladas
      if (isEdgeMobile && performance.now() < 5000) {
        console.log('[PlanContext] Edge Mobile: ignorando evento durante navegação');
        return;
      }
      
      const newToken = e.detail?.token || localStorage.getItem('authToken');
      if (newToken && newToken !== lastTokenRef.current) {
        lastTokenRef.current = newToken;
        setToken(newToken);
        planService.clearCache();

        // Carregar plano diretamente com o novo token
        setLoading(true);
        try {
          const plan = await planService.getUserPlan(newToken);
          setUserPlan(plan);
        } catch (err: any) {
          console.error('[PlanContext] Erro ao carregar plano:', err);
          setUserPlan(null);
        } finally {
          setLoading(false);
        }
      }
    };
    window.addEventListener('auth-token-updated', handleAuthTokenUpdated as unknown as EventListener);

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-token-updated', handleAuthTokenUpdated as unknown as EventListener);
    };
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

  // Carrega plano quando token muda (apenas se já tiver token no state)
  // O carregamento inicial é feito pelo checkToken() ou handleAuthTokenUpdated()
  useEffect(() => {
    // Se já tem token no state e corresponde ao ref, carrega
    // Isso cobre o caso de refresh da página com token já existente
    if (token && token === lastTokenRef.current && !userPlan && !loading) {
      loadUserPlan();
    }
  }, [token, loadUserPlan, userPlan, loading]);

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
