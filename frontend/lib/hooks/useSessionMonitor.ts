import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook para monitorar sessão em tempo real
 * Detecta quando a sessão é revogada em outro dispositivo
 * Retorna estado para controlar o modal
 */
export function useSessionMonitor(userId: string | undefined) {
  const [showRevokedModal, setShowRevokedModal] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;

    console.log('🔔 [SessionMonitor] Iniciando monitoramento de sessão para:', userId);

    // Criar canal de realtime
    const channel = supabase
      .channel(`session-monitor-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'auth',
          table: 'sessions',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🚨 [SessionMonitor] Sessão deletada detectada:', payload);

          // Verificar se a sessão atual ainda existe
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            // Sessão atual foi revogada!
            console.log('⚠️ [SessionMonitor] Sua sessão foi revogada');
            
            // Mostrar modal
            setShowRevokedModal(true);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 [SessionMonitor] Status da inscrição:', status);
      });

    channelRef.current = channel;

    // Cleanup ao desmontar
    return () => {
      console.log('🔕 [SessionMonitor] Parando monitoramento');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, supabase]);

  return {
    showRevokedModal,
    closeRevokedModal: () => setShowRevokedModal(false),
  };
}
