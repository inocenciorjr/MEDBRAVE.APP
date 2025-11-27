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
  const { checkFeature, userPlan } = usePlan();
  const [result, setResult] = useState<FeatureAccessResult>({
    hasAccess: false,
    upgradeRequired: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      setLoading(true);
      try {
        const access = await checkFeature(feature);
        if (mounted) {
          setResult(access);
        }
      } catch (error) {
        console.error('Erro ao verificar feature:', error);
        if (mounted) {
          setResult({
            hasAccess: false,
            reason: 'Erro ao verificar acesso',
            upgradeRequired: true,
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    check();

    return () => {
      mounted = false;
    };
  }, [feature, checkFeature, userPlan]); // Re-verifica quando o plano mudar

  return {
    ...result,
    loading,
  };
}
