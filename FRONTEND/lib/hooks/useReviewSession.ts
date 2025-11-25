import { useState, useCallback, useEffect } from 'react';
import { Flashcard, Difficulty, CardReview } from '@/types/flashcards';
import { calculateNextReview } from '@/lib/services/spacedRepetition';
import { reviewSessionService } from '@/lib/services/reviewSessionService';

export function useReviewSession(flashcards: Flashcard[], reviewIds: string[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviews, setReviews] = useState<CardReview[]>([]);
  const [cards, setCards] = useState<Flashcard[]>(flashcards);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;

  // Criar sessão ao montar
  useEffect(() => {
    async function initSession() {
      if (reviewIds.length === 0) return;

      try {
        const session = await reviewSessionService.createSession('FLASHCARD', reviewIds);
        setSessionId(session.id);
        console.log('✅ [useReviewSession] Sessão criada:', session.id);
      } catch (error) {
        console.error('❌ [useReviewSession] Erro ao criar sessão:', error);
      }
    }

    initSession();
  }, [reviewIds]);

  // Reset when flashcards change
  useEffect(() => {
    setCards(flashcards);
  }, [flashcards]);

  const goToNext = useCallback(async () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, totalCards]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const submitReview = useCallback(async (cardId: string, difficulty: Difficulty) => {
    const review: CardReview = {
      cardId,
      difficulty,
      reviewedAt: new Date().toISOString(),
    };
    
    const newReviews = [...reviews, review];
    setReviews(newReviews);
    
    // Marcar item como completado na sessão de revisão
    if (sessionId) {
      try {
        // Encontrar o review_id correspondente ao cardId
        const reviewIndex = cards.findIndex(c => c.id === cardId);
        if (reviewIndex !== -1 && reviewIds[reviewIndex]) {
          await reviewSessionService.markItemCompleted(sessionId, reviewIds[reviewIndex]);
          console.log('✅ [useReviewSession] Item marcado como completado');
        }
      } catch (error) {
        console.error('❌ [useReviewSession] Erro ao marcar item como completado:', error);
      }
    }
    
    // Update card with new spaced repetition data
    setCards(prevCards => 
      prevCards.map(card => {
        if (card.id === cardId) {
          const { nextReview, interval, easeFactor, repetitions} = 
            calculateNextReview(card, difficulty);
          
          return {
            ...card,
            nextReview: nextReview.toISOString(),
            interval,
            easeFactor,
            repetitions,
            updatedAt: new Date().toISOString(),
          };
        }
        return card;
      })
    );

    // Enviar revisão para o backend
    try {
      const qualityMap: Record<Difficulty, number> = {
        'again': 1,  // FSRS AGAIN
        'hard': 2,   // FSRS HARD
        'good': 3,   // FSRS GOOD
        'easy': 4,   // FSRS EASY
      };

      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
      await fetchWithAuth(`/unified-reviews/record`, {
        method: 'POST',
        body: JSON.stringify({
          content_type: 'FLASHCARD',
          content_id: cardId,
          grade: qualityMap[difficulty],
          review_time_ms: 0,
        }),
      });
      console.log('✅ [useReviewSession] Revisão registrada no backend');
    } catch (error) {
      console.error('❌ [useReviewSession] Erro ao registrar revisão:', error);
    }

    // Se for o último card, finalizar a sessão
    if (currentIndex === totalCards - 1 && sessionId) {
      try {
        await reviewSessionService.completeSession(sessionId);
        console.log('✅ [useReviewSession] Sessão finalizada');
      } catch (error) {
        console.error('❌ [useReviewSession] Erro ao finalizar sessão:', error);
      }
    }
  }, [sessionId, currentIndex, totalCards, reviews, cards, reviewIds]);

  return {
    currentCard,
    currentIndex,
    totalCards,
    goToNext,
    goToPrevious,
    canGoPrevious: currentIndex > 0,
    canGoNext: currentIndex < totalCards - 1,
    submitReview,
    reviews,
    sessionId,
  };
}
