'use client';

import { useJobProgress, JobProgressEvent } from '@/hooks/useJobProgress';
import { useEffect, useRef } from 'react';

interface JobProgressDisplayProps {
  jobId: string;
  onComplete?: () => void;
}

export function JobProgressDisplay({ jobId, onComplete }: JobProgressDisplayProps) {
  const { events, lastEvent, isConnected, error } = useJobProgress(jobId);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o último evento
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Chamar callback quando completar
  useEffect(() => {
    if (lastEvent?.type === 'complete' && onComplete) {
      onComplete();
    }
  }, [lastEvent, onComplete]);

  const getEventIcon = (type: JobProgressEvent['type']) => {
    switch (type) {
      case 'extraction':
        return '🔍';
      case 'categorization':
        return '🏷️';
      case 'rewrite':
        return '✍️';
      case 'draft':
        return '📝';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📌';
    }
  };

  const getEventColor = (type: JobProgressEvent['type']) => {
    switch (type) {
      case 'extraction':
        return 'text-blue-600';
      case 'categorization':
        return 'text-purple-600';
      case 'rewrite':
        return 'text-orange-600';
      case 'draft':
        return 'text-green-600';
      case 'complete':
        return 'text-green-700 font-bold';
      case 'error':
        return 'text-red-600 font-bold';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Status da conexão */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Progresso do Job
        </h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Erro de conexão */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Lista de eventos */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Aguardando eventos...</p>
          </div>
        ) : (
          events.map((event, index) => (
            <div
              key={index}
              className={`p-3 rounded-md border ${
                event.type === 'error'
                  ? 'bg-red-50 border-red-200'
                  : event.type === 'complete'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getEventIcon(event.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${getEventColor(event.type)}`}>
                      {event.step}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{event.message}</p>
                  
                  {/* Barra de progresso */}
                  {event.progress && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>
                          {event.progress.current} / {event.progress.total}
                        </span>
                        <span>{event.progress.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${event.progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={eventsEndRef} />
      </div>

      {/* Resumo do último evento */}
      {lastEvent && (
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getEventIcon(lastEvent.type)}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Status atual: {lastEvent.step}
              </p>
              {lastEvent.progress && (
                <p className="text-xs text-gray-600">
                  Progresso: {lastEvent.progress.percentage}%
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
