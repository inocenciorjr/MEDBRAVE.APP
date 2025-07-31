import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useAuth, AuthContext } from '../contexts/AuthContext';
// REMOVIDO FASE 2: studySessionService SM-2 legacy
// import studySessionService from '../services/studySessionService';

// Mock temporário para evitar erro - será substituído na Fase 3
const studySessionService = {
  getAllSessions: async () => [],
  getSessionById: async (id) => null,
  createSession: async (data) => ({ id: 'mock', ...data }),
  updateSession: async (id, data) => ({ id, ...data }),
  deleteSession: async (id) => true
};

/**
 * Hook personalizado para gerenciar sessões de estudo completas
 * Integra com o backend para persistir dados de sessão
 */
export const useStudySession = () => {
  // Verificar se o contexto está disponível antes de usar useAuth
  const authContext = useContext(AuthContext);
  const { user } = authContext ? useAuth() : { user: null };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const sessionTimerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Carregar todas as sessões do usuário
  const loadSessions = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const userSessions = await studySessionService.getAllSessions();
      setSessions(userSessions);
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
      setError('Erro ao carregar sessões de estudo');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Carregar sessão específica por ID
  const loadSession = useCallback(async (sessionId) => {
    if (!user || !sessionId) return null;
    
    try {
      setLoading(true);
      setError(null);
      
      const session = await studySessionService.getSessionById(sessionId);
      return session;
    } catch (err) {
      console.error('Erro ao carregar sessão:', err);
      setError('Erro ao carregar sessão de estudo');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Iniciar nova sessão de estudo
  const startSession = useCallback(async (sessionConfig = {}) => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const sessionData = {
        userId: user.uid,
        startTime: new Date().toISOString(),
        type: sessionConfig.type || 'mixed',
        targetReviews: sessionConfig.targetReviews || 20,
        targetTime: sessionConfig.targetTime || 1800, // 30 minutos
        settings: {
          showTimer: sessionConfig.showTimer !== false,
          autoAdvance: sessionConfig.autoAdvance || false,
          shuffleItems: sessionConfig.shuffleItems !== false,
          ...sessionConfig.settings
        },
        status: 'active',
        reviewsCompleted: 0,
        timeSpent: 0,
        accuracy: 0,
        items: sessionConfig.items || []
      };
      
      const newSession = await studySessionService.createSession(sessionData);
      setCurrentSession(newSession);
      setIsSessionActive(true);
      startTimeRef.current = Date.now();
      
      // Iniciar timer da sessão
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
      
      sessionTimerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setCurrentSession(prev => prev ? { ...prev, timeSpent } : null);
        }
      }, 1000);
      
      return newSession;
    } catch (err) {
      console.error('Erro ao iniciar sessão:', err);
      setError('Erro ao iniciar sessão de estudo');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Pausar sessão atual
  const pauseSession = useCallback(async () => {
    if (!currentSession || !isSessionActive) return false;
    
    try {
      // Parar timer
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      
      const updatedSession = {
        ...currentSession,
        status: 'paused',
        lastPauseTime: new Date().toISOString()
      };
      
      const updated = await studySessionService.updateSession(currentSession.id, updatedSession);
      setCurrentSession(updated);
      setIsSessionActive(false);
      
      return true;
    } catch (err) {
      console.error('Erro ao pausar sessão:', err);
      setError('Erro ao pausar sessão');
      return false;
    }
  }, [currentSession, isSessionActive]);

  // Retomar sessão pausada
  const resumeSession = useCallback(async () => {
    if (!currentSession || isSessionActive) return false;
    
    try {
      const updatedSession = {
        ...currentSession,
        status: 'active',
        lastResumeTime: new Date().toISOString()
      };
      
      const updated = await studySessionService.updateSession(currentSession.id, updatedSession);
      setCurrentSession(updated);
      setIsSessionActive(true);
      startTimeRef.current = Date.now() - (currentSession.timeSpent * 1000);
      
      // Reiniciar timer
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
      
      sessionTimerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setCurrentSession(prev => prev ? { ...prev, timeSpent } : null);
        }
      }, 1000);
      
      return true;
    } catch (err) {
      console.error('Erro ao retomar sessão:', err);
      setError('Erro ao retomar sessão');
      return false;
    }
  }, [currentSession, isSessionActive]);

  // Finalizar sessão atual
  const endSession = useCallback(async (sessionResults = {}) => {
    if (!currentSession) return null;
    
    try {
      setLoading(true);
      setError(null);
      
      // Parar timer
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      
      const finalSession = {
        ...currentSession,
        ...sessionResults,
        status: 'completed',
        endTime: new Date().toISOString(),
        finalTimeSpent: currentSession.timeSpent
      };
      
      const completed = await studySessionService.updateSession(currentSession.id, finalSession);
      
      setCurrentSession(null);
      setIsSessionActive(false);
      startTimeRef.current = null;
      
      // Recarregar lista de sessões
      await loadSessions();
      
      return completed;
    } catch (err) {
      console.error('Erro ao finalizar sessão:', err);
      setError('Erro ao finalizar sessão');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentSession, loadSessions]);

  // Atualizar progresso da sessão atual
  const updateSessionProgress = useCallback(async (progressData) => {
    if (!currentSession) return false;
    
    try {
      const updatedSession = {
        ...currentSession,
        ...progressData,
        lastUpdateTime: new Date().toISOString()
      };
      
      const updated = await studySessionService.updateSession(currentSession.id, updatedSession);
      setCurrentSession(updated);
      
      return true;
    } catch (err) {
      console.error('Erro ao atualizar progresso:', err);
      setError('Erro ao atualizar progresso da sessão');
      return false;
    }
  }, [currentSession]);

  // Deletar sessão
  const deleteSession = useCallback(async (sessionId) => {
    if (!user) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      await studySessionService.deleteSession(sessionId);
      
      // Se for a sessão atual, limpar estado
      if (currentSession && currentSession.id === sessionId) {
        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current);
          sessionTimerRef.current = null;
        }
        setCurrentSession(null);
        setIsSessionActive(false);
        startTimeRef.current = null;
      }
      
      // Recarregar lista
      await loadSessions();
      
      return true;
    } catch (err) {
      console.error('Erro ao deletar sessão:', err);
      setError('Erro ao deletar sessão');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, currentSession, loadSessions]);

  // Obter estatísticas das sessões
  const getSessionStats = useCallback(() => {
    if (!sessions.length) {
      return {
        totalSessions: 0,
        totalTime: 0,
        totalReviews: 0,
        averageAccuracy: 0,
        averageSessionTime: 0
      };
    }
    
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalTime = completedSessions.reduce((sum, s) => sum + (s.finalTimeSpent || s.timeSpent || 0), 0);
    const totalReviews = completedSessions.reduce((sum, s) => sum + (s.reviewsCompleted || 0), 0);
    const totalAccuracy = completedSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0);
    
    return {
      totalSessions: completedSessions.length,
      totalTime,
      totalReviews,
      averageAccuracy: completedSessions.length > 0 ? Math.round(totalAccuracy / completedSessions.length) : 0,
      averageSessionTime: completedSessions.length > 0 ? Math.round(totalTime / completedSessions.length) : 0
    };
  }, [sessions]);

  // Formatar tempo
  const formatTime = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Limpar timer ao desmontar componente
  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, []);

  // Carregar sessões ao montar
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user, loadSessions]);

  return {
    // Estado
    loading,
    error,
    currentSession,
    sessions,
    isSessionActive,
    
    // Ações
    loadSessions,
    loadSession,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    updateSessionProgress,
    deleteSession,
    
    // Utilitários
    getSessionStats,
    formatTime,
    
    // Status
    hasActiveSession: !!currentSession && isSessionActive,
    sessionProgress: currentSession ? {
      completed: currentSession.reviewsCompleted || 0,
      target: currentSession.targetReviews || 0,
      timeSpent: currentSession.timeSpent || 0,
      timeTarget: currentSession.targetTime || 0,
      accuracy: currentSession.accuracy || 0
    } : null
  };
};

export default useStudySession;