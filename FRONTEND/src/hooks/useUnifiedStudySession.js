import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook personalizado para gerenciar sessões de estudo unificadas
 * Suporta flashcards, questões e revisões de erro
 */
export const useUnifiedStudySession = ({
  items = [],
  contentType,
  sessionConfig = {},
  onSessionComplete,
  onItemComplete
}) => {
  const navigate = useNavigate();
  const sessionStartTimeRef = useRef(Date.now());
  
  // Estados principais
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionData, setSessionData] = useState({
    startTime: Date.now(),
    answers: [],
    timeSpent: 0,
    correctAnswers: 0,
    totalAnswers: 0
  });
  
  // Estados específicos por tipo
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [itemStartTime, setItemStartTime] = useState(Date.now());
  
  // Configurações padrão
  const config = {
    autoAdvance: false,
    showTimer: true,
    showProgress: true,
    showStats: true,
    timeLimit: null,
    ...sessionConfig
  };

  // Item atual
  const currentItem = items[currentIndex] || null;
  const hasNextItem = currentIndex < items.length - 1;
  const hasPreviousItem = currentIndex > 0;
  const totalItems = items.length;

  // Reset ao mudar item
  useEffect(() => {
    setIsRevealed(false);
    setSelectedAnswer(null);
    setUserInput('');
    setItemStartTime(Date.now());
  }, [currentIndex]);

  // Calcular tempo da sessão
  const getSessionTime = useCallback(() => {
    return Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
  }, []);

  // Calcular tempo do item atual
  const getItemTime = useCallback(() => {
    return Math.floor((Date.now() - itemStartTime) / 1000);
  }, [itemStartTime]);

  // Navegar para próximo item
  const goToNext = useCallback(() => {
    if (hasNextItem) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [hasNextItem]);

  // Navegar para item anterior
  const goToPrevious = useCallback(() => {
    if (hasPreviousItem) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [hasPreviousItem]);

  // Ir para item específico
  const goToItem = useCallback((index) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index);
    }
  }, [items.length]);

  // Revelar resposta (para flashcards)
  const revealAnswer = useCallback(() => {
    setIsRevealed(true);
  }, []);

  // Registrar resposta
  const submitAnswer = useCallback((answer, quality = null) => {
    const itemTime = getItemTime();
    const answerData = {
      itemId: currentItem?.id,
      itemIndex: currentIndex,
      answer,
      quality,
      timeSpent: itemTime,
      timestamp: Date.now(),
      contentType
    };

    // Atualizar dados da sessão
    setSessionData(prev => {
      const newAnswers = [...prev.answers, answerData];
      const isCorrect = checkAnswerCorrectness(answer, currentItem);
      
      return {
        ...prev,
        answers: newAnswers,
        totalAnswers: prev.totalAnswers + 1,
        correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
        timeSpent: prev.timeSpent + itemTime
      };
    });

    // Callback para item completado
    onItemComplete?.(answerData);

    // Auto-avançar se configurado
    if (config.autoAdvance) {
      setTimeout(() => {
        if (hasNextItem) {
          goToNext();
        } else {
          finishSession();
        }
      }, 1000);
    }
  }, [currentItem, currentIndex, contentType, config.autoAdvance, hasNextItem, getItemTime, onItemComplete]);

  // Verificar se resposta está correta
  const checkAnswerCorrectness = useCallback((answer, item) => {
    if (!item) return false;
    
    switch (contentType) {
      case 'question':
        return item.correctOptionId === answer;
      case 'flashcard':
        // Para flashcards, consideramos correto se a qualidade for >= 3
        return answer === 'good' || answer === 'easy';
      case 'error-review':
        // Para revisão de erros, sempre consideramos como revisado
        return true;
      default:
        return false;
    }
  }, [contentType]);

  // Pausar/despausar sessão
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Finalizar sessão
  const finishSession = useCallback(() => {
    const finalSessionData = {
      ...sessionData,
      endTime: Date.now(),
      totalTime: getSessionTime(),
      completed: true,
      accuracy: sessionData.totalAnswers > 0 
        ? Math.round((sessionData.correctAnswers / sessionData.totalAnswers) * 100) 
        : 0
    };

    onSessionComplete?.(finalSessionData);
  }, [sessionData, getSessionTime, onSessionComplete]);

  // Reiniciar sessão
  const restartSession = useCallback(() => {
    setCurrentIndex(0);
    setIsRevealed(false);
    setSelectedAnswer(null);
    setUserInput('');
    setIsPaused(false);
    sessionStartTimeRef.current = Date.now();
    setSessionData({
      startTime: Date.now(),
      answers: [],
      timeSpent: 0,
      correctAnswers: 0,
      totalAnswers: 0
    });
  }, []);

  // Estatísticas da sessão
  const getSessionStats = useCallback(() => {
    const accuracy = sessionData.totalAnswers > 0 
      ? Math.round((sessionData.correctAnswers / sessionData.totalAnswers) * 100) 
      : 0;
    
    const averageTimePerItem = sessionData.totalAnswers > 0 
      ? Math.round(sessionData.timeSpent / sessionData.totalAnswers) 
      : 0;
    
    const progress = totalItems > 0 
      ? Math.round(((currentIndex + 1) / totalItems) * 100) 
      : 0;

    return {
      currentIndex: currentIndex + 1,
      totalItems,
      progress,
      accuracy,
      correctAnswers: sessionData.correctAnswers,
      totalAnswers: sessionData.totalAnswers,
      sessionTime: getSessionTime(),
      averageTimePerItem,
      itemsRemaining: totalItems - currentIndex - 1
    };
  }, [sessionData, currentIndex, totalItems, getSessionTime]);

  // Configurar limite de tempo
  useEffect(() => {
    if (config.timeLimit && !isPaused) {
      const timer = setTimeout(() => {
        finishSession();
      }, config.timeLimit * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [config.timeLimit, isPaused, finishSession]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (isPaused) return;
      
      switch (event.key) {
        case 'ArrowRight':
        case ' ': // Espaço
          event.preventDefault();
          if (contentType === 'flashcard' && !isRevealed) {
            revealAnswer();
          } else if (hasNextItem) {
            goToNext();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (hasPreviousItem) {
            goToPrevious();
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (contentType === 'flashcard' && !isRevealed) {
            revealAnswer();
          }
          break;
        case 'Escape':
          event.preventDefault();
          togglePause();
          break;
        // Atalhos para avaliação de flashcards
        case '1':
          if (contentType === 'flashcard' && isRevealed) {
            submitAnswer('again', 1);
          }
          break;
        case '2':
          if (contentType === 'flashcard' && isRevealed) {
            submitAnswer('hard', 2);
          }
          break;
        case '3':
          if (contentType === 'flashcard' && isRevealed) {
            submitAnswer('good', 3);
          }
          break;
        case '4':
          if (contentType === 'flashcard' && isRevealed) {
            submitAnswer('easy', 4);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPaused, isRevealed, hasNextItem, hasPreviousItem, contentType, revealAnswer, goToNext, goToPrevious, togglePause, submitAnswer]);

  return {
    // Estado atual
    currentItem,
    currentIndex,
    totalItems,
    isRevealed,
    isPaused,
    isLoading,
    
    // Navegação
    hasNextItem,
    hasPreviousItem,
    goToNext,
    goToPrevious,
    goToItem,
    
    // Interações
    revealAnswer,
    submitAnswer,
    togglePause,
    finishSession,
    restartSession,
    
    // Estados específicos
    selectedAnswer,
    setSelectedAnswer,
    userInput,
    setUserInput,
    
    // Dados da sessão
    sessionData,
    getSessionStats,
    getSessionTime,
    getItemTime,
    
    // Configurações
    config,
    
    // Utilitários
    setIsLoading
  };
};

export default useUnifiedStudySession;