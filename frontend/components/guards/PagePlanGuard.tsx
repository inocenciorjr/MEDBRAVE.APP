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
    if (loading) return;

    if (requireActivePlan) {
      // Verifica se o usuário está autenticado
      const isAuthenticated = typeof window !== 'undefined' && 
        (localStorage.getItem('authToken') || document.cookie.includes('sb-access-token'));

      // Se não está autenticado, não mostra 403 (deixa o AuthContext redirecionar para login)
      if (!isAuthenticated) {
        setShow403(false);
        return;
      }

      // Usuário autenticado mas sem plano
      if (!userPlan) {
        setShow403(true);
        setErrorMessage(
          customMessage || 
          'Não identificamos um plano ativo na sua conta.'
        );
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
    }

    setShow403(false);
  }, [userPlan, loading, isExpired, requireActivePlan, customMessage]);

  // Intercepta erros 403 do fetch global
  useEffect(() => {
    const originalFetch = window.fetch;
    let timeoutId: NodeJS.Timeout | null = null;

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // Detecta 403
        if (response.status === 403) {
          const clonedResponse = response.clone();
          
          try {
            const data = await clonedResponse.json();
            
            // Verifica se é erro de plano
            if (
              data.error === 'SUBSCRIPTION_REQUIRED' ||
              data.error === 'FEATURE_NOT_AVAILABLE' ||
              data.error === 'QUOTA_EXCEEDED'
            ) {
              // Aguarda 800ms antes de mostrar o erro para dar tempo do retry do backend
              // Isso evita o "flash" de 403 no primeiro carregamento
              timeoutId = setTimeout(() => {
                setShow403(true);
                setErrorMessage(data.message || 'Acesso negado. Plano requerido.');
              }, 800);
            }
          } catch (e) {
            // JSON parse error, ignora
          }
        } else {
          // Se a requisição foi bem-sucedida, cancela qualquer timeout pendente
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }

        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

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
