import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedReview } from '../../contexts/UnifiedReviewContext';
import { useReviewSession } from '../../hooks/useReviewSession';
import { useStudySession } from '../../hooks/useStudySession';
import ReviewCard from './ReviewCard';
import ReviewControls from './ReviewControls';
import ReviewProgress from './ReviewProgress';
import SessionSummary from './SessionSummary';
import RemoveReviewModal from './RemoveReviewModal';

/**
 * Página principal para conduzir sessões de revisão
 * Integra todos os componentes necessários para uma experiência completa
 */
const ReviewSessionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams();
  const { user, loading: authLoading } = useAuth();
  
  // Verificar se o usuário está autenticado antes de usar outros hooks
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  if (!user) {
    navigate('/login');
    return null;
  }
  
  // Agora que sabemos que o usuário está autenticado, podemos usar os outros hooks
  const { dueReviews: itens, loading: reviewsLoading, recordReviewResult } = useUnifiedReview();
  const {
    sessionActive,
    currentIndex,
    currentReview,
    showAnswer,
    sessionStats,
    detailedStats,
    startSession,
    endSession,
    goToItem,
    submitAnswer,
    revealAnswer,
    restartSession: resetSession,
    canGoNext,
    canGoPrevious,
    totalItems,
    goToNext,
    goToPrevious,
    removeItemFromSession
  } = useReviewSession(itens || []);
  const {
    currentSession,
    startSession: startStudySession,
    endSession: endStudySession,
    updateSessionProgress,
    isSessionActive
  } = useStudySession();
  
  const [showSummary, setShowSummary] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [sessionConfig, setSessionConfig] = useState({
    type: 'mixed',
    targetReviews: 20,
    targetTime: 1800, // 30 minutos
    showTimer: true,
    autoAdvance: false,
    shuffleItems: true
  });

  // Iniciar nova sessão
  const handleStartSession = useCallback(async () => {
    try {
      // Verificar se há itens disponíveis
      if (!itens || itens.length === 0) {
        console.log('Nenhum item disponível para revisão');
        alert('Não há itens para revisar no momento.');
        return;
      }

      // Filtrar itens baseado na configuração
      console.log('Todos os itens devidos:', itens);
      console.log('Configuração da sessão:', sessionConfig);
        
      let itemsToReview = itens;
      
      // Filtrar por item específico se fornecido
      if (sessionConfig.specificItemId) {
        itemsToReview = itens.filter(item => item.id === sessionConfig.specificItemId);
        console.log('Filtrando por item específico:', sessionConfig.specificItemId, itemsToReview);
      }
      // Filtrar por tipos selecionados
      else if (sessionConfig.selectedTypes && sessionConfig.selectedTypes.length > 0) {
        itemsToReview = itens.filter(item => 
          sessionConfig.selectedTypes.includes(item.contentType)
        );
        console.log('Filtrando por tipos selecionados:', sessionConfig.selectedTypes, itemsToReview);
      }
      // Filtrar por tipo único se não for mixed
      else if (sessionConfig.type !== 'mixed') {
        // Mapear tipos de volta para o formato do contentType
        const typeMap = {
          'flashcard': 'FLASHCARD',
          'question': 'QUESTION',
          'error_notebook': 'ERROR_NOTEBOOK'
        };
        const contentType = typeMap[sessionConfig.type];
        if (contentType) {
          itemsToReview = itens.filter(item => item.contentType === contentType);
          console.log('Filtrando por tipo único:', contentType, itemsToReview);
        }
      }
      
      // Mapear contentType para type esperado pelo ReviewCard
      itemsToReview = itemsToReview.map(item => {
        const typeMap = {
          'FLASHCARD': 'flashcard',
          'QUESTION': 'question',
          'ERROR_NOTEBOOK': 'note'
        };
        return {
          ...item,
          type: typeMap[item.contentType] || 'flashcard'
        };
      });
      
      // Aplicar ordenação baseada na configuração
      if (sessionConfig.orderingMode === 'shuffle') {
        // Embaralhar dentro de cada tipo de conteúdo
        const itemsByType = {
          'FLASHCARD': [],
          'QUESTION': [],
          'ERROR_NOTEBOOK': []
        };
        
        // Agrupar itens por tipo
        itemsToReview.forEach(item => {
          if (itemsByType[item.contentType]) {
            itemsByType[item.contentType].push(item);
          }
        });
        
        // Embaralhar cada grupo separadamente
        Object.keys(itemsByType).forEach(type => {
          itemsByType[type] = itemsByType[type].sort(() => Math.random() - 0.5);
        });
        
        // Aplicar limitação por tipo se especificada
        if (sessionConfig.quantities) {
          Object.keys(itemsByType).forEach(type => {
            const limit = sessionConfig.quantities[type] || 0;
            if (limit > 0) {
              itemsByType[type] = itemsByType[type].slice(0, limit);
            }
          });
        }
        
        // Recombinar todos os itens
        itemsToReview = [
          ...itemsByType['FLASHCARD'],
          ...itemsByType['QUESTION'],
          ...itemsByType['ERROR_NOTEBOOK']
        ];
      } else {
        // Modo urgência: manter ordem original (já vem ordenado por data de vencimento do backend)
        // Aplicar limitação por tipo se especificada
        if (sessionConfig.quantities) {
          const itemsByType = {
            'FLASHCARD': [],
            'QUESTION': [],
            'ERROR_NOTEBOOK': []
          };
          
          // Agrupar itens por tipo mantendo a ordem
          itemsToReview.forEach(item => {
            if (itemsByType[item.contentType]) {
              itemsByType[item.contentType].push(item);
            }
          });
          
          // Aplicar limitação por tipo
          Object.keys(itemsByType).forEach(type => {
            const limit = sessionConfig.quantities[type] || 0;
            if (limit > 0) {
              itemsByType[type] = itemsByType[type].slice(0, limit);
            }
          });
          
          // Recombinar mantendo ordem de urgência
          itemsToReview = [
            ...itemsByType['FLASHCARD'],
            ...itemsByType['QUESTION'],
            ...itemsByType['ERROR_NOTEBOOK']
          ];
        }
      }
      
      // Limitar número total de itens se especificado
      if (sessionConfig.targetReviews > 0 && !sessionConfig.quantities) {
        itemsToReview = itemsToReview.slice(0, sessionConfig.targetReviews);
      }
      
      console.log('Itens finais para revisão:', itemsToReview);
      
      if (itemsToReview.length === 0) {
        alert('Não há itens para revisar no momento.');
        return;
      }
      
      // Iniciar sessão de revisão
      startSession();
      
      // Iniciar sessão de estudo
      await startStudySession({
        ...sessionConfig,
        items: itemsToReview.map(item => item.id)
      });
      
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      alert('Erro ao iniciar sessão de revisão.');
    }
  }, [itens, sessionConfig, startSession, startStudySession]);

  // Processar parâmetros da URL vindos da RevisoesPage
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const types = urlParams.get('types');
    const itemId = urlParams.get('itemId');
    const type = urlParams.get('type');
    
    if (types) {
      // Múltiplos tipos selecionados
      const selectedTypes = types.split(',');
      console.log('Tipos selecionados da URL:', selectedTypes);
      
      // Configurar sessão baseada nos tipos
      let sessionType = 'mixed';
      if (selectedTypes.length === 1) {
        // Mapear tipos para o formato esperado
        const typeMap = {
          'FLASHCARD': 'flashcard',
          'QUESTION': 'question', 
          'ERROR_NOTEBOOK': 'error_notebook'
        };
        sessionType = typeMap[selectedTypes[0]] || 'mixed';
      }
      
      setSessionConfig(prev => ({
        ...prev,
        type: sessionType,
        selectedTypes: selectedTypes
      }));
      
      // Redirecionar para página de configuração
      navigate('/dashboard/review-session/config');
    } else if (itemId && type) {
      // Item específico selecionado
      console.log('Item específico da URL:', { itemId, type });
      
      const typeMap = {
        'FLASHCARD': 'flashcard',
        'QUESTION': 'question',
        'ERROR_NOTEBOOK': 'error_notebook'
      };
      
      setSessionConfig(prev => ({
        ...prev,
        type: typeMap[type] || 'mixed',
        specificItemId: itemId,
        targetReviews: 1 // Para item específico, revisar apenas 1
      }));
      
      // Para item específico, iniciar sessão diretamente
      setTimeout(() => {
        handleStartSession();
      }, 500);
    }
  }, [location.search, navigate, handleStartSession]);

  // Inicializar configurações do sessionStorage
  useEffect(() => {
    const savedConfig = sessionStorage.getItem('reviewSessionConfig');
    const continueSessionId = sessionStorage.getItem('continueSessionId');
    
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setSessionConfig(config);
        sessionStorage.removeItem('reviewSessionConfig');
        
        // Auto-iniciar sessão se houver configuração
        setTimeout(() => {
          handleStartSession();
        }, 500);
      } catch (error) {
        console.error('Erro ao carregar configuração da sessão:', error);
        // Se não há configuração válida, redirecionar para configuração
        navigate('/dashboard/review-session/config');
      }
    } else if (continueSessionId) {
      // Continuar sessão existente
      sessionStorage.removeItem('continueSessionId');
      // Aqui você pode implementar a lógica para continuar uma sessão específica
    } else if (sessionId && !sessionActive) {
      handleStartSession();
    } else if (!sessionActive && !showSummary && !savedConfig && !continueSessionId) {
      // Se não há sessão ativa e não há resumo, redirecionar para configuração
      navigate('/dashboard/review-session/config');
    }
  }, [sessionId, sessionActive, showSummary, navigate, handleStartSession]);

  // Atualizar progresso da sessão de estudo quando estatísticas mudarem
  useEffect(() => {
    if (isSessionActive && currentSession) {
      updateSessionProgress({
        reviewsCompleted: sessionStats.correct + sessionStats.incorrect,
        accuracy: sessionStats.total > 0 ? (sessionStats.correct / sessionStats.total) * 100 : 0,
        correctAnswers: sessionStats.correct,
        incorrectAnswers: sessionStats.incorrect
      });
    }
  }, [sessionStats, isSessionActive, currentSession, updateSessionProgress]);

  // Detectar quando a sessão foi completada automaticamente
  useEffect(() => {
    if (!sessionActive && sessionStats.correct + sessionStats.incorrect > 0 && !showSummary) {
      setShowSummary(true);
    }
  }, [sessionActive, sessionStats, showSummary]);



  // Finalizar sessão
  const handleEndSession = async () => {
    try {
      const sessionResults = endSession();
      
      if (currentSession) {
        await endStudySession({
          reviewsCompleted: sessionStats.correct + sessionStats.incorrect,
          accuracy: sessionStats.total > 0 ? (sessionStats.correct / sessionStats.total) * 100 : 0,
          correctAnswers: sessionStats.correct,
          incorrectAnswers: sessionStats.incorrect,
          results: sessionResults
        });
      }
      
      setShowSummary(true);
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
      alert('Erro ao finalizar sessão.');
    }
  };

  // Submeter resposta
  const handleSubmitAnswer = async (answer, timeSpent) => {
    try {
      // Se é um botão FSRS (tem fsrsGrade), processar diretamente
      if (answer.fsrsGrade !== undefined) {
        const fsrsGradeMap = {
          0: 'again',  // Esqueci
          1: 'hard',   // Difícil
          2: 'good',   // Bom
          3: 'easy'    // Fácil
        };
        
        const isCorrect = answer.fsrsGrade >= 2; // Good ou Easy
        const difficulty = fsrsGradeMap[answer.fsrsGrade];
        
        // Determinar contentType baseado no tipo do item
        const contentType = currentReview.type === 'flashcard' ? 'FLASHCARD' : 
                           currentReview.type === 'question' ? 'QUESTION' : 'ERROR_NOTEBOOK';
        
        // Registrar no backend
        await recordReviewResult(
          currentReview.id, 
          answer.fsrsGrade + 1, // Backend espera 1-4, frontend usa 0-3
          contentType,
          timeSpent || 0
        );
        
        submitAnswer(isCorrect, difficulty);
        return;
      }

      // Para flashcards, apenas revelar a resposta
      // A avaliação real será feita pelos botões FSRS
      if (currentReview?.type === 'flashcard') {
        revealAnswer();
        return;
      }

      // Para questões, determinar se correto baseado na resposta
      let isCorrect = false;
      let difficulty = 'medium';
      let grade = 1; // Default para hard

      if (currentReview?.type === 'question' && answer.selectedOption !== null) {
        isCorrect = answer.selectedOption === currentReview.correctAnswer;
        difficulty = isCorrect ? 'good' : 'hard';
        grade = isCorrect ? 2 : 1; // Good = 2, Hard = 1
      }

      // Determinar contentType baseado no tipo do item
      const contentType = currentReview.type === 'flashcard' ? 'FLASHCARD' : 
                         currentReview.type === 'question' ? 'QUESTION' : 'ERROR_NOTEBOOK';
      
      // Registrar no backend
      await recordReviewResult(
        currentReview.id, 
        grade + 1, // Backend espera 1-4, frontend usa 0-3
        contentType,
        timeSpent || 0
      );

      submitAnswer(isCorrect, difficulty);
    } catch (error) {
      console.error('Erro ao submeter resposta:', error);
    }
  };

  // Remover revisão atual
  const handleRemoveReview = async () => {
    try {
      const { unifiedReviewService } = await import('../../services/unifiedReviewService');
      
      // Determinar contentType baseado no tipo do item
      const contentType = currentReview.type === 'flashcard' ? 'FLASHCARD' : 
                         currentReview.type === 'question' ? 'QUESTION' : 'ERROR_NOTEBOOK';
      
      // Remover do backend
      await unifiedReviewService.removeReview(currentReview.id, contentType);
      
      // Remover da sessão atual em tempo real
      removeItemFromSession(currentReview.id);
      
      setShowRemoveModal(false);
    } catch (error) {
      console.error('Erro ao remover revisão:', error);
      alert('Erro ao remover revisão. Tente novamente.');
    }
  };

  // Voltar ao dashboard
  const handleBackToDashboard = () => {
    if (sessionActive) {
      const confirmExit = window.confirm(
        'Você tem uma sessão ativa. Deseja realmente sair? O progresso será perdido.'
      );
      if (!confirmExit) return;
      
      endSession();
    }
    navigate('/dashboard');
  };

  // Nova sessão
  const handleNewSession = () => {
    resetSession();
    setShowSummary(false);
    navigate('/dashboard/review-session/config');
  };

  // Se não há sessão ativa e não há resumo, redirecionar para configuração
  if (!sessionActive && !showSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Renderizar resumo
  if (showSummary) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <SessionSummary
              statistics={detailedStats}
              onNewSession={handleNewSession}
              onBackToDashboard={handleBackToDashboard}
            />
          </div>
        </div>
      </div>
    );
  }

  // Renderizar sessão ativa
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToDashboard}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Sessão de Revisão
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {sessionConfig.showTimer && currentSession && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Tempo: {Math.floor(sessionStats.timeSpent / 60)}:{(sessionStats.timeSpent % 60).toString().padStart(2, '0')}
                </div>
              )}
              <button
                onClick={handleEndSession}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progresso */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <ReviewProgress
            current={currentIndex + 1}
            total={totalItems}
            statistics={{
              totalAnswered: sessionStats.correct + sessionStats.incorrect,
              correctAnswers: sessionStats.correct,
              incorrectAnswers: sessionStats.incorrect,
              accuracy: sessionStats.total > 0 ? (sessionStats.correct / sessionStats.total) * 100 : 0,
              averageTime: detailedStats.averageTime || 0
            }}
            timeElapsed={sessionStats.timeSpent}
          />
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {currentReview ? (
            <div className="space-y-6">
              <ReviewCard
                item={currentReview}
                onSubmitAnswer={handleSubmitAnswer}
                onRevealAnswer={revealAnswer}
                showAnswer={showAnswer}
                autoAdvance={sessionConfig.autoAdvance}
              />
              
              <ReviewControls
                onPrevious={goToPrevious}
                onNext={goToNext}
                onRevealAnswer={revealAnswer}
                canGoPrevious={canGoPrevious}
                canGoNext={canGoNext}
                showAnswer={showAnswer}
                autoAdvance={sessionConfig.autoAdvance}
              />
              
              {/* Botão de Remoção */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowRemoveModal(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remover Revisão
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                Carregando item de revisão...
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de Remoção */}
      <RemoveReviewModal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        reviewItem={currentReview ? {
          id: currentReview.id,
          title: currentReview.title || currentReview.front || currentReview.question || 'Item sem título',
          subtitle: currentReview.subtitle || currentReview.back || currentReview.explanation,
          contentType: currentReview.type === 'flashcard' ? 'FLASHCARD' : 
                      currentReview.type === 'question' ? 'QUESTION' : 'ERROR_NOTEBOOK'
        } : null}
        onRemoveComplete={handleRemoveReview}
      />
    </div>
  );
};

export default ReviewSessionPage;