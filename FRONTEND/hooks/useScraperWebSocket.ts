/**
 * useScraperWebSocket Hook
 * 
 * @deprecated Este hook está DESATUALIZADO e não funciona com o novo sistema WebSocket.
 * Use o hook `useJobProgress` e o componente `JobProgressDisplay` ao invés disso.
 * 
 * Hook para gerenciar conexão WebSocket com o servidor de scraper
 * e receber atualizações em tempo real sobre jobs de batch processing.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface JobProgress {
  jobId: string;
  currentUrl?: string;
  completed: number;
  total: number;
  failed: number;
  percentage: number;
}

export interface JobResult {
  jobId: string;
  results: Array<{
    url: string;
    status: 'success' | 'failed';
    questionsExtracted?: number;
    questionsSaved?: number;
    error?: string;
  }>;
}

export interface JobError {
  jobId: string;
  error: string;
  details?: any;
}

interface UseScraperWebSocketOptions {
  jobId?: string;
  onProgress?: (progress: JobProgress) => void;
  onComplete?: (result: JobResult) => void;
  onError?: (error: JobError) => void;
  onUrlComplete?: (data: { url: string; questionsExtracted: number }) => void;
  onUrlFailed?: (data: { url: string; error: string }) => void;
}

export function useScraperWebSocket(options: UseScraperWebSocketOptions = {}) {
  const {
    jobId,
    onProgress,
    onComplete,
    onError,
    onUrlComplete,
    onUrlFailed,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Conectar ao WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    // Obter token de autenticação
    const token = localStorage.getItem('auth_token') || '';

    // Criar conexão WebSocket
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
      auth: {
        token,
      },
      reconnection: false, // Desabilitado para evitar spam de logs
      autoConnect: false, // Não conectar automaticamente
    });

    // Event: Conectado
    socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
      setIsConnected(true);
      setIsReconnecting(false);

      // Se tiver jobId, entrar na sala do job
      if (jobId) {
        socket.emit('join-job', jobId);
      }
    });

    // Event: Desconectado
    socket.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
      setIsConnected(false);
    });

    // Event: Tentando reconectar
    socket.on('reconnect_attempt', () => {
      console.log('🔄 Tentando reconectar WebSocket...');
      setIsReconnecting(true);
    });

    // Event: Reconectado
    socket.on('reconnect', () => {
      console.log('✅ WebSocket reconectado');
      setIsReconnecting(false);
      
      // Reentrar na sala do job se necessário
      if (jobId) {
        socket.emit('join-job', jobId);
      }
    });

    // Event: Job iniciado
    socket.on('job:started', (data: { jobId: string }) => {
      console.log('🚀 Job iniciado:', data.jobId);
    });

    // Event: Progresso do job
    socket.on('job:progress', (progress: JobProgress) => {
      console.log('📊 Progresso:', progress);
      onProgress?.(progress);
    });

    // Event: URL completada
    socket.on('job:url:complete', (data: { url: string; questionsExtracted: number }) => {
      console.log('✅ URL completada:', data.url);
      onUrlComplete?.(data);
    });

    // Event: URL falhou
    socket.on('job:url:failed', (data: { url: string; error: string }) => {
      console.log('❌ URL falhou:', data.url, data.error);
      onUrlFailed?.(data);
    });

    // Event: Job completado
    socket.on('job:completed', (result: JobResult) => {
      console.log('🎉 Job completado:', result.jobId);
      onComplete?.(result);
    });

    // Event: Job falhou
    socket.on('job:failed', (error: JobError) => {
      console.log('❌ Job falhou:', error.jobId, error.error);
      onError?.(error);
    });

    // Event: Job cancelado
    socket.on('job:cancelled', (data: { jobId: string }) => {
      console.log('🛑 Job cancelado:', data.jobId);
    });

    socketRef.current = socket;
  }, [jobId, onProgress, onComplete, onError, onUrlComplete, onUrlFailed]);

  // Desconectar do WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Entrar na sala de um job específico
  const joinJob = useCallback((newJobId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-job', newJobId);
    }
  }, []);

  // Sair da sala de um job
  const leaveJob = useCallback((oldJobId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-job', oldJobId);
    }
  }, []);

  // Conectar automaticamente ao montar
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Atualizar sala do job quando jobId mudar
  useEffect(() => {
    if (jobId && socketRef.current?.connected) {
      joinJob(jobId);
    }
  }, [jobId, joinJob]);

  return {
    isConnected,
    isReconnecting,
    connect,
    disconnect,
    joinJob,
    leaveJob,
  };
}
