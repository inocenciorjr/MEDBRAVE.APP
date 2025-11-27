import { useState, useEffect } from 'react';
import { usePlan } from './usePlan';
import type { PlanFeature, FeatureAccessResult } from '@/types/plan';

/**
 * Hook para verificar acesso a uma feature específica
 * 
 * @example
 * ```tsx
 * const { hasAccess, loading, upgradeRequired } = useFeatureAccess('canExportData');
 * 
 * if (!hasAccess) {
 *   return <UpgradePrompt />;
 * }
 * ```
 */
export function useFeatureAccess(feature: PlanFeature) {
  const { hasFeature, userPlan, loading: planLoading, getUpgradeMessage } = usePlan();
  const [result, setResult] = useState<FeatureAccessResult>({
    hasAccess: false,
    upgradeRequired: true,
  });

  useEffect(() => {
    if (planLoading) {
      setResult({
        hasAccess: false,
        upgradeRequired: true,
      });
      return;
    }

    const access = hasFeature(feature);
    setResult({
      hasAccess: access,
      upgradeRequired: !access,
      reason: !access ? getUpgradeMessage(feature) : undefined,
    });
  }, [feature, hasFeature, userPlan, planLoading, getUpgradeMessage]);

  return {
    ...result,
    loading: planLoading,
  };
}
