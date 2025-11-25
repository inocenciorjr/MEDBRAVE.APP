import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface JobProgressEvent {
  jobId: string;
  type: 'extraction' | 'categorization' | 'rewrite' | 'draft' | 'complete' | 'error';
  step: string;
  message: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  timestamp: Date;
}

interface UseJobProgressReturn {
  events: JobProgressEvent[];
  lastEvent: JobProgressEvent | null;
  isConnected: boolean;
  error: string | null;
  clearEvents: () => void;
}

export function useJobProgress(jobId: string | null): UseJobProgressReturn {
  const [events, setEvents] = useState<JobProgressEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<JobProgressEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    // Conectar ao Socket.IO (usa BACKEND_URL, não API_URL que é proxy)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    console.log('🔌 Conectando Socket.IO em:', backendUrl);
    
    const socket = io(backendUrl, {
      path: '/socket.io',
      transports: ['polling'], // Apenas polling por enquanto (mais compatível)
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      upgrade: false, // Não tentar upgrade para WebSocket
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket.IO conectado');
      setIsConnected(true);
      setError(null);
      
      // Inscrever-se no job
      socket.emit('subscribe:job', jobId);
    });

    socket.on('subscribed', (data: { jobId: string }) => {
      console.log(`🔔 Inscrito no job: ${data.jobId}`);
    });

    socket.on('job:progress', (event: JobProgressEvent) => {
      console.log('📥 Progresso recebido:', event);
      
      setEvents((prev) => [...prev, event]);
      setLastEvent(event);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket.IO desconectado');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Erro de conexão Socket.IO:', err);
      setError(`Erro de conexão: ${err.message}`);
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      if (socket) {
        socket.emit('unsubscribe:job', jobId);
        socket.disconnect();
      }
    };
  }, [jobId]);

  return {
    events,
    lastEvent,
    isConnected,
    error,
    clearEvents,
  };
}
