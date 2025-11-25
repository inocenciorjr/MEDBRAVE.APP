import { useState, useEffect, useCallback, useRef } from 'react';
import { studySessionService, StudySession } from '@/services/studySessionService';

type ActivityType = 'questions' | 'flashcards' | 'review' | 'simulated_exam' | 'reading';

const HEARTBEAT_INTERVAL = 60000; // 1 minuto
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

export function useStudySession(activityType: ActivityType) {
  const [session, setSession] = useState<StudySession | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [itemsCompleted, setItemsCompleted] = useState(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Iniciar sessão
  const startSession = useCallback(async () => {
    try {
      console.log('[useStudySession] Iniciando sessão:', activityType);
      const newSession = await studySessionService.startSession({ activity_type: activityType });
      console.log('[useStudySession] Sessão criada:', newSession);
      setSession(newSession);
      setIsActive(true);
      setItemsCompleted(0);

      // Iniciar heartbeat
      heartbeatIntervalRef.current = setInterval(async () => {
        if (newSession?.id) {
          try {
            await studySessionService.heartbeat(newSession.id);
            console.log('[useStudySession] Heartbeat enviado');
          } catch (error) {
            console.error('[useStudySession] Erro ao enviar heartbeat:', error);
          }
        }
      }, HEARTBEAT_INTERVAL);

      return newSession;
    } catch (error) {
      console.error('[useStudySession] Erro ao iniciar sessão:', error);
      // Não lançar erro para não quebrar a UI
      return null;
    }
  }, [activityType]);

  // Resetar timer de inatividade
  const resetInactivityTimer = useCallback(() => {
    if (!isActive) return;

    // Limpar timer anterior
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // Criar novo timer
    inactivityTimeoutRef.current = setTimeout(() => {
      console.log('[useStudySession] ⏰ Timeout de inatividade (10 min), finalizando sessão...');
      endSession();
    }, INACTIVITY_TIMEOUT);
  }, [isActive]);

  // Finalizar sessão
  const endSession = useCallback(async () => {
    if (!session?.id) return;

    try {
      // Parar heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Parar timer de inatividade
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }

      const endedSession = await studySessionService.endSession(session.id, {
        items_completed: itemsCompleted,
      });

      setSession(endedSession);
      setIsActive(false);
      return endedSession;
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
      throw error;
    }
  }, [session, itemsCompleted]);

  // Incrementar itens completados
  const incrementItems = useCallback(() => {
    setItemsCompleted((prev) => prev + 1);
  }, []);

  // Buscar sessão ativa ao montar
  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        console.log('[useStudySession] Buscando sessão ativa...');
        const activeSession = await studySessionService.getActiveSession();
        console.log('[useStudySession] Sessão ativa encontrada:', activeSession);
        if (activeSession && activeSession.activity_type === activityType) {
          setSession(activeSession);
          setIsActive(true);
          setItemsCompleted(activeSession.items_completed);

          // Iniciar heartbeat
          heartbeatIntervalRef.current = setInterval(async () => {
            if (activeSession.id) {
              try {
                await studySessionService.heartbeat(activeSession.id);
                console.log('[useStudySession] Heartbeat enviado (sessão recuperada)');
              } catch (error) {
                console.error('[useStudySession] Erro ao enviar heartbeat:', error);
              }
            }
          }, HEARTBEAT_INTERVAL);
        }
      } catch (error) {
        console.error('[useStudySession] Erro ao buscar sessão ativa:', error);
      }
    };

    fetchActiveSession();

    // Cleanup ao desmontar
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [activityType]);

  // 🔍 Detectar inatividade (10 minutos)
  useEffect(() => {
    if (!isActive) return;

    // Iniciar timer de inatividade
    resetInactivityTimer();

    // Adicionar listeners de atividade
    const handleActivity = () => {
      resetInactivityTimer();
    };

    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [isActive, resetInactivityTimer]);

  // Finalizar sessão ao sair da página
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (isActive && session?.id) {
        // Tentar finalizar a sessão de forma assíncrona
        // Nota: pode não completar se o navegador fechar muito rápido
        try {
          await studySessionService.endSession(session.id, {
            items_completed: itemsCompleted,
          });
        } catch (error) {
          // Ignorar erros ao fechar a página
          console.warn('[useStudySession] Erro ao finalizar sessão no beforeunload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive, session, itemsCompleted]);

  return {
    session,
    isActive,
    itemsCompleted,
    startSession,
    endSession,
    incrementItems,
  };
}
