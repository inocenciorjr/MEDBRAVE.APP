'use client';

import React from 'react';
import { usePlan } from '@/hooks/usePlan';
import type { PlanLimit } from '@/types/plan';

interface LimitGuardProps {
  children: React.ReactNode;
  limit: PlanLimit;
  currentUsage: number;
  fallback?: React.ReactNode;
  showWarningAt?: number; // Porcentagem para mostrar aviso (padrão: 80%)
}

/**
 * Guard de proteção por limite de uso
 * 
 * ⚠️ IMPORTANTE: Este componente é apenas para UX!
 * A segurança real está no backend com checkLimit middlewares
 * 
 * Este guard:
 * ✅ Mostra avisos antes de atingir limite
 * ✅ Bloqueia UI quando limite atingido
 * ✅ Direciona para upgrade
 * 
 * ❌ NÃO substitui validação do backend
 * ❌ Backend sempre valida novamente
 * 
 * @example
 * <LimitGuard limit="maxQuestionsPerDay" currentUsage={questionsToday}>
 *   <QuestionList />
 * </LimitGuard>
 */
export function LimitGuard({
  children,
  limit,
  currentUsage,
  fallback,
  showWarningAt = 80,
}: LimitGuardProps) {
  const { checkLimit, loading, getUpgradeMessage, isNearLimit } = usePlan();

  // Enquanto carrega, mostra conteúdo (otimista)
  if (loading) {
    return <>{children}</>;
  }

  const result = checkLimit(limit, currentUsage);

  // Ilimitado → sempre mostra
  if (result.isUnlimited) {
    return <>{children}</>;
  }

  // Limite atingido → mostra fallback ou bloqueio
  if (!result.allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Limite atingido
            </h3>
            <p className="mt-1 text-sm text-red-700">
              Você atingiu o limite de <strong>{result.limit}</strong> para este recurso.
              {getUpgradeMessage(undefined, limit)}
            </p>
            <div className="mt-3">
              <a
                href="/planos"
                className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
              >
                Fazer upgrade
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Próximo do limite → mostra aviso + conteúdo
  if (result.percentage >= showWarningAt) {
    return (
      <>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-sm font-medium text-amber-800">
                Você está próximo do limite: {result.remaining} restantes
              </span>
            </div>
            <a
              href="/planos"
              className="text-sm font-medium text-amber-600 hover:text-amber-500"
            >
              Upgrade →
            </a>
          </div>
          {/* Barra de progresso */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-200">
            <div
              className="h-full bg-amber-600 transition-all duration-300"
              style={{ width: `${result.percentage}%` }}
            />
          </div>
        </div>
        {children}
      </>
    );
  }

  // Dentro do limite → mostra normalmente
  return <>{children}</>;
}
