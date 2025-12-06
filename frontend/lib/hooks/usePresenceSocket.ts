'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface PresenceUpdate {
  userId: string;
  sessionId: string;
  lastActivity: number;
}

interface PresenceLeave {
  userId: string;
  sessionId: string;
}

interface PresenceStats {
  onlineCount: number;
}

interface UsePresenceSocketOptions {
  /**
   * Se true, conecta automaticamente ao montar
   */
  autoConnect?: boolean;
  
  /**
   * Callback quando receber atualização de presença
   */
  onPresenceUpdate?: (update: PresenceUpdate) => void;
  
  /**
   * Callback quando usuário sair
   */
  onPresenceLeave?: (leave: PresenceLeave) => void;
  
  /**
   * Callback quando receber estatísticas
   */
  onPresenceStats?: (stats: PresenceStats) => void;
}

/**
 * Hook para conectar ao Socket.IO e receber atualizações de presença em tempo real
 * Usado principalmente por admins para monitorar usuários online
 */
export function usePresenceSocket(options: UsePresenceSocketOptions = {}) {
  const {
    autoConnect = true,
    onPresenceUpdate,
    onPresenceLeave,
    onPresenceStats,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Conecta ao Socket.IO
   */
  const connect = useCallback(async () => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Sem sessão ativa');
        return;
      }



      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const socket = io(backendUrl, {
        path: '/socket.io/presence',
        auth: {
          token: session.access_token,
        },
        transports: ['polling'], // Apenas polling (igual ao useActivityTracker)
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        upgrade: false, // Não tentar upgrade para WebSocket
      });

      socket.on('connect', () => {
        setIsConnected(true);
        setError(null);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('connect_error', () => {
        // Silenciar erros de conexão - o socket.io já tenta reconectar automaticamente
        setIsConnected(false);
      });

      // Eventos de presença
      socket.on('presence:update', (data: PresenceUpdate) => {
        onPresenceUpdate?.(data);
      });

      socket.on('presence:leave', (data: PresenceLeave) => {
        onPresenceLeave?.(data);
      });

      socket.on('presence:stats', (data: PresenceStats) => {
        onPresenceStats?.(data);
      });

      socketRef.current = socket;
    } catch (err: any) {
      setError(err.message);
    }
  }, [onPresenceUpdate, onPresenceLeave, onPresenceStats]);

  /**
   * Desconecta do Socket.IO
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  /**
   * Solicita lista de usuários online
   */
  const getOnlineUsers = useCallback((): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket não conectado'));
        return;
      }

      socketRef.current.emit('presence:get-online', (response: any) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Erro ao buscar usuários online'));
        }
      });
    });
  }, []);

  // Auto-conectar ao montar
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    getOnlineUsers,
    socket: socketRef.current,
  };
}
