import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import UnifiedStudyInterface from '../../../components/study/UnifiedStudyInterface';
import { useUnifiedStudySession } from '../../../hooks/useUnifiedStudySession';
import { getDeckCards, recordFlashcardReview } from '../../../services/flashcardService';

export default function ReviewFlashcardsPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();

  console.log('🚨🚨🚨 [ReviewFlashcardsPage] INICIANDO COM DECK ID:', deckId);
  console.log('🚨🚨🚨 [ReviewFlashcardsPage] window.location:', window.location.href);

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configuração da sessão de estudo
  const sessionConfig = {
    showTimer: true,
    showProgress: true,
    showStats: true,
    autoAdvance: false
  };

  // Hook de sessão unificada
  const {
    currentItem,
    currentIndex,
    totalItems,
    isRevealed,
    isPaused,
    goToNext,
    goToPrevious,
    revealAnswer,
    submitAnswer,
    togglePause,
    finishSession,
    getSessionStats,
    getSessionTime,
    setIsLoading
  } = useUnifiedStudySession({
    items: cards,
    contentType: 'flashcard',
    sessionConfig,
    onSessionComplete: handleSessionComplete,
    onItemComplete: handleItemComplete
  });

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        console.log('🔍 [ReviewFlashcardsPage] Carregando cards para deck:', deckId);
        const res = await getDeckCards(deckId);
        console.log('🔍 [ReviewFlashcardsPage] Resposta completa:', JSON.stringify(res, null, 2));
        
        if (res.success) {
          // Novo formato: res.data.cards (não res.data.items)
          const cardsData = res.data.cards || res.data.items || [];
          console.log('🔍 [ReviewFlashcardsPage] Cards extraídos:', cardsData.length);
          
          // Formatar cards para o componente unificado
          const formattedCards = cardsData.map(card => ({
            id: card.id,
            front: card.frontContent || card.front || 'Sem conteúdo',
            back: card.backContent || card.back || 'Sem conteúdo',
            tags: card.tags || [],
            deckId: card.deckId || deckId,
            difficulty: card.difficulty,
            stability: card.stability,
            due: card.due,
            reps: card.reps
          }));
          
          setCards(formattedCards);
        } else {
          throw new Error(res.error || 'Erro ao carregar cards');
        }
      } catch (e) {
        console.error('🔍 [ReviewFlashcardsPage] Erro:', e);
        setError(e.message);
      } finally {
        setIsLoading(false);
        setLoading(false);
      }
    })();
  }, [deckId, setIsLoading]);

  // Manipular resposta do flashcard
  const handleAnswer = async (answer, quality) => {
    const card = currentItem;
    console.log('🔍 [ReviewFlashcardsPage] Card sendo avaliado:', card);
    console.log('🔍 [ReviewFlashcardsPage] Qualidade:', quality);
    
    try {
      // Mapear qualidade para rating do sistema antigo
      const ratingMap = {
        1: 0, // again -> esqueci
        2: 1, // hard -> difícil
        3: 2, // good -> bom
        4: 3  // easy -> fácil
      };
      
      await recordFlashcardReview(card.id, ratingMap[quality] || 0);
      
      // Submeter resposta para o hook
      submitAnswer(answer, quality);
    } catch (e) {
      console.error('Erro ao registrar revisão:', e);
    }
  };

  // Manipular conclusão da sessão
  function handleSessionComplete(sessionData) {
    console.log('🎯 Sessão de flashcards concluída:', sessionData);
    navigate('/dashboard/revisoes', {
      state: {
        message: `Sessão concluída! ${sessionData.totalAnswers} cards revisados com ${sessionData.accuracy}% de precisão.`,
        sessionData
      }
    });
  }

  // Manipular conclusão de item
  function handleItemComplete(itemData) {
    console.log('📝 Item de flashcard concluído:', itemData);
  }

  // Manipular pausa
  const handlePause = () => {
    togglePause();
  };

  // Manipular finalização
  const handleFinish = () => {
    finishSession();
  };

  if (loading) return <div className="p-8 text-center">Carregando revisão...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (cards.length === 0) return <div className="p-8 text-center">Nenhum flashcard neste deck.</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                ← Voltar
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Revisão de Flashcards
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Deck: {deckId}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interface de estudo unificada */}
      <div className="py-8">
        <UnifiedStudyInterface
          content={currentItem}
          contentType="flashcard"
          currentIndex={currentIndex}
          totalItems={totalItems}
          sessionStartTime={getSessionTime()}
          showProgress={true}
          showTimer={true}
          showStats={true}
          onAnswer={handleAnswer}
          onNext={goToNext}
          onPrevious={goToPrevious}
          onReveal={revealAnswer}
          onPause={handlePause}
          onFinish={handleFinish}
          isRevealed={isRevealed}
          isPaused={isPaused}
          isLoading={loading}
        />
      </div>
    </div>
  );
}