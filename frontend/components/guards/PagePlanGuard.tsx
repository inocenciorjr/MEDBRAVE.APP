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

/**
 * Guard que envolve páginas inteiras
 * 
 * Detecta automaticamente:
 * - Usuário sem plano ativo
 * - Erros 403 do backend
 * - Plano expirado
 * 
 * Mostra componente 403 com leão piscando
 * 
 * @example
 * export default function MyPage() {
 *   return (
 *     <PagePlanGuard>
 *       <MyPageContent />
 *     </PagePlanGuard>
 *   );
 * }
 */
export function PagePlanGuard({
  children,
  requireActivePlan = true,
  customMessage,
}: PagePlanGuardProps) {
  const { userPlan, loading: planLoading, isExpired, refreshPlan } = usePlan();
  const { loading: authLoading, isAuthenticated: authIsAuthenticated } = useAuth();
  
  // Combinar loading states
  const loading = planLoading || authLoading;
  
  const [show403, setShow403] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(customMessage);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5; // Máximo de tentativas antes de mostrar 403
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriedRefreshRef = useRef(false);

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

  // Verifica se tem plano ativo
  useEffect(() => {
    // Limpar timeout anterior
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // NUNCA mostra 403 enquanto está carregando
    if (loading) {
      setShow403(false);
      return;
    }

    // Se não requer plano ativo, sempre permite acesso
    if (!requireActivePlan) {
      setShow403(false);
      return;
    }

    // Se não está autenticado após o loading, redirecionar para login
    if (!authIsAuthenticated) {
      setShow403(false);
      setRetryCount(0);
      hasTriedRefreshRef.current = false;
      
      // Redirecionar para login com um pequeno delay para evitar falsos negativos (Edge Mobile)
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        // Evitar loop de redirecionamento se já estiver no login
        if (!currentPath.startsWith('/auth/')) {
          
          // FIX EDGE MOBILE: Verificar se acabamos de logar (cookie de sessão)
          const justLoggedIn = document.cookie.includes('sb-access-token') || localStorage.getItem('authToken');
          
          if (justLoggedIn) {
             // Se tem indícios de login, não redirecionar ainda, esperar mais um pouco
             console.log('[PagePlanGuard] Indícios de login encontrados, aguardando AuthContext...');
             return;
          }

          console.log('[PagePlanGuard] Usuário não autenticado, redirecionando para login...');
          
          // Adicionar delay de segurança antes de redirecionar
          const redirectTimeout = setTimeout(() => {
             // Verificar novamente antes de ir
             const stillNotAuth = !localStorage.getItem('authToken');
             if (stillNotAuth) {
                const returnUrl = encodeURIComponent(currentPath);
                window.location.href = `/login?returnUrl=${returnUrl}`;
             }
          }, 500); // 500ms de tolerância
          
          return () => clearTimeout(redirectTimeout);
        }
      }
      return;
    }

    // Se tem plano, verifica o status
    if (userPlan) {
      // Reset retry count quando tem plano
      setRetryCount(0);
      hasTriedRefreshRef.current = false;

      // Plano ATIVO ou TRIAL - permite acesso
      if (userPlan.status === 'ACTIVE' || userPlan.status === 'TRIAL') {
        setShow403(false);
        return;
      }

      // Plano expirado (mas FREE nunca expira)
      if (isExpired && userPlan.planName !== 'FREE') {
        setShow403(true);
        setErrorMessage(
          customMessage ||
          'Seu plano expirou. Renove para continuar.'
        );
        return;
      }

      // Plano cancelado
      if (userPlan.status === 'CANCELLED') {
        setShow403(true);
        setErrorMessage(
          customMessage ||
          'Seu plano foi cancelado. Adquira um novo plano para continuar.'
        );
        return;
      }

      // Plano suspenso
      if (userPlan.status === 'SUSPENDED') {
        setShow403(true);
        setErrorMessage(
          customMessage ||
          'Seu plano está suspenso. Entre em contato com o suporte.'
        );
        return;
      }

      // Qualquer outro status, permite acesso
      setShow403(false);
      return;
    }

    // Se chegou aqui: loading=false, authenticated=true, mas userPlan=null
    // Implementar retry progressivo antes de mostrar 403
    
    if (retryCount < maxRetries) {
      // Tentar recarregar o plano após um delay progressivo
      const delay = Math.min(1000 * (retryCount + 1), 3000); // 1s, 2s, 3s, 3s, 3s
      

      
      retryTimeoutRef.current = setTimeout(() => {
        // Verificar novamente se tem token (pode ter aparecido) - com fallback para sessionStorage
        const currentToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (currentToken) {
          tryRefreshPlan();
        }
        setRetryCount(prev => prev + 1);
      }, delay);
      
      return;
    }

    // Após todas as tentativas, mostrar 403
    console.log('[PagePlanGuard] Todas as tentativas esgotadas, mostrando 403');
    setShow403(true);
    setErrorMessage(
      customMessage ||
      'Não identificamos um plano ativo na sua conta.'
    );

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [userPlan, loading, isExpired, requireActivePlan, customMessage, retryCount, tryRefreshPlan, authIsAuthenticated]);

  // Reset quando o componente é desmontado e remontado
  useEffect(() => {
    return () => {
      hasTriedRefreshRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Enquanto carrega ou está tentando, mostra loading (sem min-h-screen para não quebrar layout)
  if (loading || (retryCount > 0 && retryCount < maxRetries && !userPlan)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700" />
      </div>
    );
  }

  // Mostra 403 se necessário
  if (show403) {
    return <PlanRequired403 message={errorMessage} />;
  }

  // Mostra conteúdo normal
  return <>{children}</>;
}
