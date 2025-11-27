'use client';

import { useEffect, useState } from 'react';

/**
 * Hook para evitar flash de loading após skeleton
 * Retorna false nos primeiros 100ms para dar tempo do skeleton aparecer
 */
export function useSkeletonTransition() {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    // Aguarda 100ms antes de permitir mostrar loading
    // Isso evita flash quando skeleton já foi mostrado
    const timer = setTimeout(() => {
      setShowLoading(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return showLoading;
}

/**
 * Hook para gerenciar loading state sem flash
 * Usa skeleton nos primeiros momentos, depois permite loading inline
 */
export function useLoadingState(isLoading: boolean) {
  const canShowLoading = useSkeletonTransition();
  
  return {
    // Mostra loading apenas se passou do período de skeleton
    showLoading: isLoading && canShowLoading,
    // Indica se ainda está no período de skeleton
    isInitialLoad: isLoading && !canShowLoading,
  };
}
