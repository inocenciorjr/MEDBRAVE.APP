'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

/**
 * Hook para rastrear atividade do usuário em tempo real via WebSocket
 * Mantém conexão persistente e envia heartbeat automático
 */
export function useActivityTracker(userId: string | null, sessionId: string | null) {
  const pathname = usePathname();
  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Conectar ao Socket.IO
  useEffect(() => {
    if (!userId || !sessionId) return;

    const connectSocket = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;

        // Conectar ao Socket.IO (path específico para presença)
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

        const socket = io(backendUrl, {
          path: '/socket.io/presence',
          auth: {
            token: session.access_token,
          },
          transports: ['polling'], // Apenas polling (igual ao useJobProgress que funciona)
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          upgrade: false, // Não tentar upgrade para WebSocket
        });

        socket.on('connect', () => {
          // Connected
        });

        socket.on('disconnect', () => {
          // Disconnected
        });

        socket.on('connect_error', (error: any) => {
          console.error('❌ [ActivityTracker] Connection error:', {
            message: error.message,
            description: error.description,
            context: error.context,
            type: error.type,
            data: error.data,
          });
        });

        socketRef.current = socket;

        // Heartbeat a cada 30 segundos
        heartbeatIntervalRef.current = setInterval(() => {
          const timeSinceLastActivity = Date.now() - lastActivityRef.current;
          
          // Só enviar se houve atividade nos últimos 5 minutos
          if (timeSinceLastActivity < 5 * 60 * 1000 && socket.connected) {
            socket.emit('presence:heartbeat', {
              metadata: {
                page: window.location.pathname,
              },
            });
          }
        }, 30 * 1000);
      } catch (error) {
        // Silent fail
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [userId, sessionId]);

  // Atualizar metadata quando mudar de página
  useEffect(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('presence:update-metadata', {
        page: pathname,
      });
    }
    lastActivityRef.current = Date.now();
  }, [pathname]);

  // Rastrear interações do usuário
  useEffect(() => {
    if (!userId || !sessionId) return;

    const updateLastActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Eventos que indicam atividade
    window.addEventListener('mousemove', updateLastActivity, { passive: true });
    window.addEventListener('keydown', updateLastActivity, { passive: true });
    window.addEventListener('scroll', updateLastActivity, { passive: true });
    window.addEventListener('click', updateLastActivity, { passive: true });

    // Usar sendBeacon no unload
    const handleUnload = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('mousemove', updateLastActivity);
      window.removeEventListener('keydown', updateLastActivity);
      window.removeEventListener('scroll', updateLastActivity);
      window.removeEventListener('click', updateLastActivity);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [userId, sessionId]);
}
