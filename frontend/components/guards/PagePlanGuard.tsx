'use client';

import React, { useEffect, useState } from 'react';
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
  const { userPlan, loading, isExpired } = usePlan();
  const [show403, setShow403] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(customMessage);

  // Verifica se tem plano ativo
  useEffect(() => {
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
    const isAuthenticated = typeof window !== 'undefined' &&
      (localStorage.getItem('authToken') || document.cookie.includes('sb-access-token'));

    // Se não está autenticado, não mostra 403 (deixa o AuthContext redirecionar para login)
    if (!isAuthenticated) {
      setShow403(false);
      return;
    }

    // Se tem plano, verifica o status
    if (userPlan) {
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
    // Aguarda 2 segundos antes de mostrar erro (tempo para o plano carregar)
    // Se após 2s ainda não tem plano, mostra 403
    const timer = setTimeout(() => {
      if (!userPlan && !loading) {
        setShow403(true);
        setErrorMessage(
          customMessage ||
          'Não identificamos um plano ativo na sua conta.'
        );
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [userPlan, loading, isExpired, requireActivePlan, customMessage]);

  // Removido interceptor de fetch que causava o "piscar" do 403

  // Enquanto carrega, mostra loading
  if (loading) {
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
