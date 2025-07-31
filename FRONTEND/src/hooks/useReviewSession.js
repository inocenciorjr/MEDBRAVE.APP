import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useAuth, AuthContext } from '../contexts/AuthContext';

/**
 * Hook personalizado para gerenciar sessões de revisão individuais
 * Controla o fluxo de uma sessão de revisão com múltiplos itens
 */
export const useReviewSession = (initialReviews = []) => {
  // Verificar se o contexto de autenticação está disponível
  const authContext = useContext(AuthContext);
  const { user } = authContext ? useAuth() : { user: null };
  
  // Criar uma cópia local dos itens de revisão que não será afetada por atualizações externas
  const [sessionReviews, setSessionReviews] = useState(() => {
    return initialReviews.map(item => {
      if (!item.type && item.contentType) {
        const typeMap = {
          'FLASHCARD': 'flashcard',
          'QUESTION': 'question',
          'ERROR_NOTEBOOK': 'note'
        };
        return {
          ...item,
          type: typeMap[item.contentType] || 'flashcard'
        };
      }
      return item;
    });
  });
  
  // Manter o total inicial fixo para evitar que diminua durante a sessão
  const [initialTotalItems] = useState(sessionReviews.length);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionResults, setSessionResults] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    total: 0,
    timeSpent: 0
  });
  
  const timerRef = useRef(null);
  const itemStartTime = useRef(null);

  // Iniciar sessão
  const startSession = useCallback(() => {
    if (sessionReviews.length === 0) return;
    
    setSessionActive(true);
    setSessionStartTime(Date.now());
    setCurrentIndex(0);
    setSessionResults([]);
    setShowAnswer(false);
    setSessionStats({
      correct: 0,
      incorrect: 0,
      total: initialTotalItems,
      timeSpent: 0
    });
    itemStartTime.current = Date.now();
    
    // Timer para atualizar tempo gasto
    timerRef.current = setInterval(() => {
      if (sessionStartTime) {
        setSessionStats(prev => ({
          ...prev,
          timeSpent: Math.floor((Date.now() - sessionStartTime) / 1000)
        }));
      }
    }, 1000);
  }, [sessionReviews, initialTotalItems, sessionStartTime]);

  // Finalizar sessão
  const endSession = useCallback(() => {
    setSessionActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Mostrar resposta do item atual
  const revealAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);

  // Registrar resposta e avançar
  const submitAnswer = useCallback((answerData, timeSpent = 0) => {
    if (!sessionActive || currentIndex >= sessionReviews.length) return;
    
    const currentReview = sessionReviews[currentIndex];
    const itemEndTime = Date.now();
    const itemDuration = itemStartTime.current ? itemEndTime - itemStartTime.current : 0;
    
    // Determinar se a resposta está correta baseado no tipo de dados
    let isCorrect = false;
    if (typeof answerData === 'boolean') {
      isCorrect = answerData;
    } else if (answerData && typeof answerData === 'object') {
      if ('isCorrect' in answerData) {
        isCorrect = answerData.isCorrect;
      } else if ('fsrsGrade' in answerData) {
        // Para FSRS, considerar correto se grade >= 2
        isCorrect = answerData.fsrsGrade >= 2;
      }
    }
    
    const result = {
      reviewId: currentReview.id,
      type: currentReview.type,
      isCorrect,
      answerData,
      timeSpent: Math.floor(itemDuration / 1000),
      timestamp: itemEndTime
    };
    
    setSessionResults(prev => [...prev, result]);
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1)
    }));
    
    // Verificar se é o último item antes de avançar
    const isLastItem = currentIndex + 1 >= sessionReviews.length;
    
    if (isLastItem) {
      // Se é o último item, finalizar sessão sem incrementar currentIndex
      endSession();
    } else {
      // Avançar para próximo item
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
      itemStartTime.current = Date.now();
    }
  }, [sessionActive, currentIndex, sessionReviews, endSession]);

  // Navegar para item específico
  const goToItem = useCallback((index) => {
    if (index >= 0 && index < sessionReviews.length) {
      setCurrentIndex(index);
      setShowAnswer(false);
      itemStartTime.current = Date.now();
    }
  }, [sessionReviews.length]);

  // Obter item atual
  const getCurrentItem = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < sessionReviews.length) {
      return sessionReviews[currentIndex];
    }
    return null;
  }, [currentIndex, sessionReviews]);

  // Pular item atual
  const skipItem = useCallback(() => {
    if (currentIndex < sessionReviews.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
      itemStartTime.current = Date.now();
    } else {
      endSession();
    }
  }, [currentIndex, sessionReviews.length, endSession]);

  // Reiniciar sessão
  const restartSession = useCallback(() => {
    endSession();
    setTimeout(() => startSession(), 100);
  }, [endSession, startSession]);

  // Remover item da sessão atual
  const removeItemFromSession = useCallback((itemId) => {
    setSessionReviews(prev => {
      const newReviews = prev.filter(item => item.id !== itemId);
      
      // Se removemos o item atual ou um anterior, ajustar o índice
      const removedIndex = prev.findIndex(item => item.id === itemId);
      if (removedIndex !== -1 && removedIndex <= currentIndex) {
        // Se removemos o item atual, manter o mesmo índice (vai para o próximo)
        // Se removemos um anterior, decrementar o índice
        const newIndex = removedIndex === currentIndex ? currentIndex : currentIndex - 1;
        setCurrentIndex(Math.max(0, Math.min(newIndex, newReviews.length - 1)));
      }
      
      // Se não há mais itens, finalizar sessão
      if (newReviews.length === 0) {
        endSession();
      }
      
      return newReviews;
    });
  }, [currentIndex, endSession]);

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Calcular progresso
  const progress = sessionReviews.length > 0 ? 
    Math.round(((currentIndex + (showAnswer ? 0.5 : 0)) / sessionReviews.length) * 100) : 0;

  // Item atual
  const currentReview = sessionReviews[currentIndex] || null;

  // Verificar se sessão está completa
  const isComplete = !sessionActive && sessionResults.length > 0;

  // Calcular estatísticas seguras (evitar NaN)
  const safeSessionStats = {
    correct: isNaN(sessionStats.correct) ? 0 : sessionStats.correct,
    incorrect: isNaN(sessionStats.incorrect) ? 0 : sessionStats.incorrect,
    total: isNaN(sessionStats.total) ? 0 : sessionStats.total,
    timeSpent: isNaN(sessionStats.timeSpent) ? 0 : sessionStats.timeSpent
  };

  // Calcular taxa de acerto segura
  const accuracyRate = safeSessionStats.total > 0 ? 
    Math.round((safeSessionStats.correct / safeSessionStats.total) * 100) : 0;

  // Calcular tempo médio por item
  const averageTimePerItem = safeSessionStats.total > 0 && sessionResults.length > 0 ?
    Math.round(sessionResults.reduce((sum, result) => sum + (result.timeSpent || 0), 0) / sessionResults.length) : 0;

  // Estatísticas detalhadas para o resumo
  const detailedStats = {
    totalAnswered: sessionResults.length,
    correctAnswers: safeSessionStats.correct,
    incorrectAnswers: safeSessionStats.incorrect,
    accuracy: accuracyRate,
    averageTime: averageTimePerItem,
    totalTime: safeSessionStats.timeSpent,
    itemsReviewed: sessionResults
  };

  return {
    // Estado da sessão
    sessionActive,
    isComplete,
    currentIndex,
    currentReview,
    showAnswer,
    progress,
    
    // Estatísticas
    sessionStats: safeSessionStats,
    sessionResults,
    accuracyRate,
    detailedStats,
    
    // Controles da sessão
    startSession,
    endSession,
    restartSession,
    removeItemFromSession,
    
    // Controles do item
    revealAnswer,
    submitAnswer,
    skipItem,
    goToItem,
    getCurrentItem,
    
    // Navegação
    canGoNext: currentIndex < sessionReviews.length - 1,
    canGoPrevious: currentIndex > 0,
    hasItems: sessionReviews.length > 0,
    totalItems: sessionReviews.length,
    remainingItems: sessionReviews.length - currentIndex - 1,
    
    // Funções de navegação
    goToNext: () => {
      if (currentIndex < sessionReviews.length - 1) {
        goToItem(currentIndex + 1);
      }
    },
    goToPrevious: () => {
      if (currentIndex > 0) {
        goToItem(currentIndex - 1);
      }
    }
  };
};

export default useReviewSession;