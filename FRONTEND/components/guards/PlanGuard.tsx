'use client';

import React from 'react';
import { usePlan } from '@/hooks/usePlan';
import type { PlanFeature } from '@/types/plan';

interface PlanGuardProps {
  children: React.ReactNode;
  feature: PlanFeature;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * Guard de proteção por feature de plano
 * 
 * ⚠️ IMPORTANTE: Este componente é apenas para UX!
 * A segurança real está no backend com enhancedAuthMiddleware
 * 
 * Este guard:
 * ✅ Melhora experiência do usuário
 * ✅ Evita requests desnecessários
 * ✅ Mostra feedback visual
 * 
 * ❌ NÃO substitui validação do backend
 * ❌ NÃO é segurança
 * 
 * @example
 * <PlanGuard feature="canExportData">
 *   <ExportButton />
 * </PlanGuard>
 */
export function PlanGuard({
  children,
  feature,
  fallback,
  showUpgradePrompt = true,
}: PlanGuardProps) {
  const { hasFeature, loading, getUpgradeMessage, planName } = usePlan();

  // Enquanto carrega, não mostra nada (evita flash)
  if (loading) {
    return null;
  }

  // Tem acesso → mostra conteúdo
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Sem acesso → mostra fallback ou prompt de upgrade
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-amber-800">
              Recurso bloqueado
            </h3>
            <p className="mt-1 text-sm text-amber-700">
              {getUpgradeMessage(feature)}. Seu plano atual: <strong>{planName}</strong>
            </p>
            <div className="mt-3">
              <a
                href="/planos"
                className="inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
              >
                Ver planos
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

  return null;
}
