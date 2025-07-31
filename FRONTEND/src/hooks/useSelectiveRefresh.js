import { useEffect, useRef } from 'react';

/**
 * Hook para refresh seletivo por página
 * Cada página se registra e só é atualizada quando o usuário navega para ela
 */
export const useSelectiveRefresh = (refreshCallback, pageId, isActive = true) => {
  const callbackRef = useRef(refreshCallback);
  const isActiveRef = useRef(isActive);
  
  // Manter as referências atualizadas
  useEffect(() => {
    callbackRef.current = refreshCallback;
    isActiveRef.current = isActive;
  }, [refreshCallback, isActive]);
  
  useEffect(() => {
    // Só registrar listener se estiver ativo
    if (!isActive) {
      console.log(`⏸️ [Refresh Seletivo] Listener inativo para página: ${pageId}`);
      return;
    }
    
    const handlePageNavigation = (event) => {
      const { targetPage } = event.detail;
      console.log(`📡 [Refresh Seletivo] Evento recebido - Target: ${targetPage}, PageId: ${pageId}`);
      
      // Só executa se estiver navegando para esta página específica e estiver ativo
      if (targetPage === pageId && isActiveRef.current) {
        console.log(`🔄 [Refresh Seletivo] Atualizando página: ${pageId}`);
        if (callbackRef.current) {
          callbackRef.current();
        }
      }
    };
    
    console.log(`🎯 [Refresh Seletivo] Registrando listener para página: ${pageId}`);
    
    window.addEventListener('selectivePageRefresh', handlePageNavigation);
    
    return () => {
      window.removeEventListener('selectivePageRefresh', handlePageNavigation);
    };
  }, [pageId, isActive]);
};

export default useSelectiveRefresh;