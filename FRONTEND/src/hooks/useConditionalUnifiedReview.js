import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import UnifiedReviewContext from '../contexts/UnifiedReviewContext';

/**
 * Hook que controla quando o useUnifiedReview deve ser ativo
 * Evita múltiplas inicializações desnecessárias
 * Versão robusta que verifica se o contexto está disponível
 */
export const useConditionalUnifiedReview = (shouldActivate = true) => {
  const location = useLocation();
  
  // console.log('🔍 [useConditionalUnifiedReview] Pathname atual:', location.pathname);
  
  // Páginas que realmente precisam dos dados de revisão
  const reviewPages = [
    '/dashboard/revisoes',
    '/dashboard/review-session'
  ];
  
  const isReviewPage = reviewPages.some(page => {
    const matches = location.pathname.startsWith(page);
    
    // console.log(`🔍 [useConditionalUnifiedReview] Verificando página ${page}:`, matches);
    
    return matches;
  });
  const isActive = shouldActivate && isReviewPage;
  
  // console.log('🔍 [useConditionalUnifiedReview] Verificação final:', { isActive, isReviewPage });
  
  // Usa useContext diretamente para verificar se o contexto está disponível
  const context = useContext(UnifiedReviewContext);
  
  console.log('🔍 [useConditionalUnifiedReview] Estado do contexto:', {
    hasContext: !!context,
    contextKeys: context ? Object.keys(context) : [],
    dailySummary: context?.dailySummary,
    isInitialized: context?.isInitialized,
    loading: context?.loading
  });
  
  // Retorna dados vazios se não estiver ativo ou se o contexto não estiver disponível
  const emptyData = useMemo(() => ({
    dueReviews: [],
    dailySummary: null,
    filteredReviews: [],
    loading: false,
    error: null,
    refresh: () => {},
    recordReviewResult: () => {},
    setActiveFilter: () => {},
    activeFilter: 'all',
    lastFetch: null,
    loadDailySummary: () => {},
    loadDueReviews: () => {},
    applyFilter: () => {},
    loadDashboardData: () => {},
    isInitialized: false,
    CACHE_DURATION: 0
  }), []);
  
  // Se não estiver ativo, retorna dados vazios
  if (!isActive) {
    return emptyData;
  }
  
  // Se o contexto não estiver disponível mas a página está ativa, retorna dados vazios temporariamente
  if (!context) {
    return emptyData;
  }
  
  console.log('✅ [useConditionalUnifiedReview] Retornando contexto válido:', {
    dailySummary: context.dailySummary,
    todayItems: context.dailySummary?.todayItems,
    totalItems: context.dailySummary?.totalItems,
    oldItems: context.dailySummary?.oldItems
  });
  
  // ✅ TESTE: Verificar se há propriedades extras no contexto
  if ('todayItems' in context && context.todayItems !== undefined) {
    console.error('🚨 [useConditionalUnifiedReview] PROBLEMA ENCONTRADO: todayItems está sendo adicionado diretamente ao contexto!', {
      contextTodayItems: context.todayItems,
      dailySummaryTodayItems: context.dailySummary?.todayItems,
      contextKeys: Object.keys(context),
      stackTrace: new Error().stack
    });
  }
  
  return context;
};

export default useConditionalUnifiedReview;