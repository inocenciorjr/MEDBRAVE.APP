'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PlanRequired403 } from '../errors/PlanRequired403';
import { usePlan } from '@/hooks/usePlan';

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
  const { userPlan, loading, isExpired, refreshPlan } = usePlan();
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

    // Verifica se o usuário está autenticado
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const hasCookie = typeof document !== 'undefined' && document.cookie.includes('sb-access-token');
    const isAuthenticated = !!(authToken || hasCookie);

    // Se não está autenticado, não mostra 403 (deixa o AuthContext redirecionar para login)
    if (!isAuthenticated) {
      setShow403(false);
      setRetryCount(0);
      hasTriedRefreshRef.current = false;
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
      
      console.log(`[PagePlanGuard] Plano não encontrado, tentativa ${retryCount + 1}/${maxRetries} em ${delay}ms`);
      
      retryTimeoutRef.current = setTimeout(() => {
        // Verificar novamente se tem token (pode ter aparecido)
        const currentToken = localStorage.getItem('authToken');
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
  }, [userPlan, loading, isExpired, requireActivePlan, customMessage, retryCount, tryRefreshPlan]);

  // Reset quando o componente é desmontado e remontado
  useEffect(() => {
    return () => {
      hasTriedRefreshRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Enquanto carrega ou está tentando, mostra loading
  if (loading || (retryCount > 0 && retryCount < maxRetries && !userPlan)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
