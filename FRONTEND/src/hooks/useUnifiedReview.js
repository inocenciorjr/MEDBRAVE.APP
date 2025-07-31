import { useUnifiedReview } from '../contexts/UnifiedReviewContext';

/**
 * Hook personalizado para gerenciar revisões unificadas
 * Agora usa o contexto global para evitar múltiplas chamadas à API
 */
export { useUnifiedReview };
export default useUnifiedReview;