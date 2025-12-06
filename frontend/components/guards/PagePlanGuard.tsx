'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PlanRequired403 } from '../errors/PlanRequired403';
import { usePlan } from '@/hooks/usePlan';
import { useAuth } from '@/lib/contexts/AuthContext';

interface PagePlanGuardProps {
  children: React.ReactNode;
  requireActivePlan?: boolean;
  customMessage?: string;
}

export function PagePlanGuard({
  children,
  requireActivePlan = true,
  customMessage,
}: PagePlanGuardProps) {
  const { userPlan, loading: planLoading, isExpired, refreshPlan } = usePlan();
  const { loading: authLoading, isAuthenticated: authIsAuthenticated, authFailed } = useAuth();
  
  const [show403, setShow403] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(customMessage);
  const [retryCount, setRetryCount] = useState(0);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const maxRetries = 5;
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriedRefreshRef = useRef(false);

  // Efeito separado para controlar redirecionamento para login
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const currentPath = window.location.pathname;
    
    // Ignorar páginas de auth
    if (currentPath.startsWith('/auth/') || currentPath === '/login') {
      return;
    }

    // Limpar timeout anterior
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // Se authFailed é true, redirecionar IMEDIATAMENTE
    if (authFailed) {
      console.log('[PagePlanGuard] authFailed=true, redirecionando para login...');
      const returnUrl = encodeURIComponent(currentPath);
      window.location.href = `/login?returnUrl=${returnUrl}`;
      return;
    }

    // Se já está autenticado, não precisa redirecionar
    if (authIsAuthenticated) {
      return;
    }

    // Se ainda está carregando, aguardar
    if (authLoading) {
      return;
    }

    // Não autenticado e não está carregando - verificar credenciais
    const hasToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const hasCookie = document.cookie.includes('sb-access-token');

    if (hasToken || hasCookie) {
      // Tem credenciais mas não autenticou ainda - dar mais tempo, mas com limite
      console.log('[PagePlanGuard] Credenciais encontradas, aguardando autenticação (max 5s)...');
      redirectTimeoutRef.current = setTimeout(() => {
        // Verificar novamente
        const stillHasToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!stillHasToken) {
          console.log('[PagePlanGuard] Timeout - credenciais perdidas, redirecionando...');
          const returnUrl = encodeURIComponent(window.location.pathname);
          window.location.href = `/login?returnUrl=${returnUrl}`;
        } else {
          // Ainda tem token mas não autenticou - forçar reload para tentar novamente
          console.log('[PagePlanGuard] Timeout - forçando reload...');
          window.location.reload();
        }
      }, 5000);
    } else {
      // Sem credenciais - redirecionar após pequeno delay
      console.log('[PagePlanGuard] Sem credenciais, redirecionando em 1.5s...');
      redirectTimeoutRef.current = setTimeout(() => {
        const nowHasToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const nowHasCookie = document.cookie.includes('sb-access-token');
        if (!nowHasToken && !nowHasCookie) {
          console.log('[PagePlanGuard] Confirmado sem credenciais, redirecionando...');
          const returnUrl = encodeURIComponent(window.location.pathname);
          window.location.href = `/login?returnUrl=${returnUrl}`;
        }
      }, 1500);
    }

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [authFailed, authIsAuthenticated, authLoading]);

  // Função para tentar recarregar o plano
  const tryRefreshPlan = useCallback(async () => {
    if (hasTriedRefreshRef.current) return;
    hasTriedRefreshRef.current = true;
    
    console.log('[PagePlanGuard] Tentando recarregar plano...');
    try {
      await refreshPlan();
    } catch (err) {
      console.error('[PagePlanGuard] Erro ao recarregar plano:', err);
    }
  }, [refreshPlan]);

  // Efeito para verificar plano
  useEffect(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Se não requer plano, permite acesso
    if (!requireActivePlan) {
      setShow403(false);
      return;
    }

    // Se não está autenticado, o outro useEffect cuida do redirect
    if (!authIsAuthenticated) {
      setShow403(false);
      return;
    }

    // Se tem plano, verifica status
    if (userPlan) {
      setRetryCount(0);
      hasTriedRefreshRef.current = false;

      if (userPlan.status === 'ACTIVE' || userPlan.status === 'TRIAL') {
        setShow403(false);
        return;
      }

      if (isExpired && userPlan.planName !== 'FREE') {
        setShow403(true);
        setErrorMessage(customMessage || 'Seu plano expirou. Renove para continuar.');
        return;
      }

      if (userPlan.status === 'CANCELLED') {
        setShow403(true);
        setErrorMessage(customMessage || 'Seu plano foi cancelado. Adquira um novo plano para continuar.');
        return;
      }

      if (userPlan.status === 'SUSPENDED') {
        setShow403(true);
        setErrorMessage(customMessage || 'Seu plano está suspenso. Entre em contato com o suporte.');
        return;
      }

      setShow403(false);
      return;
    }

    // Autenticado mas sem plano - retry
    if (!planLoading && retryCount < maxRetries) {
      const delay = Math.min(1000 * (retryCount + 1), 3000);
      retryTimeoutRef.current = setTimeout(() => {
        const currentToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (currentToken) {
          tryRefreshPlan();
        }
        setRetryCount(prev => prev + 1);
      }, delay);
      return;
    }

    // Esgotou tentativas
    if (retryCount >= maxRetries) {
      console.log('[PagePlanGuard] Tentativas esgotadas, mostrando 403');
      setShow403(true);
      setErrorMessage(customMessage || 'Não identificamos um plano ativo na sua conta.');
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [userPlan, planLoading, isExpired, requireActivePlan, customMessage, retryCount, tryRefreshPlan, authIsAuthenticated]);

  // Cleanup
  useEffect(() => {
    return () => {
      hasTriedRefreshRef.current = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  // Se está carregando auth OU não está autenticado, mostrar loading (não o conteúdo!)
  // O redirect será feito pelo useEffect quando authLoading=false e !authIsAuthenticated
  if (authLoading || !authIsAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700" />
      </div>
    );
  }

  // Loading state para plano (só se autenticado)
  const isLoadingPlan = planLoading || (retryCount > 0 && retryCount < maxRetries && !userPlan);
  
  if (isLoadingPlan) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700" />
      </div>
    );
  }

  if (show403) {
    return <PlanRequired403 message={errorMessage} />;
  }

  return <>{children}</>;
}
