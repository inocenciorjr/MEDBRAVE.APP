import { useState, useCallback, useEffect } from 'react';
import { Flashcard, Difficulty, CardReview } from '@/types/flashcards';
import { calculateNextReview } from '@/lib/services/spacedRepetition';
import { getStudySession, updateStudySession } from '@/lib/services/deckSessionService';

export function useFlashcardSession(flashcards: Flashcard[], deckId: string, sessionId?: string) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviews, setReviews] = useState<CardReview[]>([]);
  const [cards, setCards] = useState<Flashcard[]>(flashcards);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [answeredCards, setAnsweredCards] = useState<Map<string, Difficulty>>(new Map());
  const [previouslyAnsweredCards, setPreviouslyAnsweredCards] = useState<Map<string, Difficulty>>(new Map());

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;
  
  // Verificar se é uma sessão de revisão (não deve salvar progresso em deck_study_sessions)
  const isReviewSession = deckId === 'review-session' || !deckId;
  
  // Verificar se o card atual já foi respondido (nesta sessão OU anteriormente hoje)
  const currentCardAnswer = isReviewSession 
    ? (answeredCards.get(currentCard?.id) || previouslyAnsweredCards.get(currentCard?.id))
    : undefined;
  const isCurrentCardAnswered = currentCardAnswer !== undefined;

  // Load session progress on mount
  useEffect(() => {
    async function loadSession() {
      if (!deckId || flashcards.length === 0) {
        setSessionLoaded(true);
        return;
      }
      
      // Se for sessão de revisão, carregar cards já respondidos hoje E progresso
      if (isReviewSession && sessionId) {
        console.log('🔄 [loadSession] Sessão de revisão detectada - carregando progresso e cards respondidos');
        try {
          const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
          
          // Carregar progresso da sessão
          const sessionResponse = await fetchWithAuth(`/api/review-sessions/${sessionId}`);
          if (sessionResponse.ok) {
            const sessionResult = await sessionResponse.json();
            const session = sessionResult.data.session;
            
            // Restaurar índice salvo
            if (session.current_index !== undefined && session.current_index < flashcards.length) {
              setCurrentIndex(session.current_index);
              console.log('✅ [loadSession] Progresso restaurado - índice:', session.current_index);
            }
          }
          
          // Carregar cards já respondidos
          const response = await fetchWithAuth('/unified-reviews/today?limit=1000');
          
          if (response.ok) {
            const result = await response.json();
            const todayReviews = result.data?.reviews || [];
            
            // Mapear grade (0-3) para difficulty
            const gradeToQuality: Record<number, Difficulty> = {
              0: 'again',
              1: 'hard',
              2: 'good',
              3: 'easy',
            };
            
            // Filtrar apenas flashcards que estão na sessão atual e mapear para Map<id, difficulty>
            const flashcardIds = new Set(flashcards.map(f => f.id));
            const answeredMap = new Map<string, Difficulty>();
            
            todayReviews
              .filter((r: any) => r.content_type === 'FLASHCARD' && flashcardIds.has(r.content_id))
              .forEach((r: any) => {
                const difficulty = gradeToQuality[r.last_grade] || 'good';
                answeredMap.set(r.content_id, difficulty);
              });
            
            console.log('✅ [loadSession] Cards já respondidos hoje:', answeredMap.size);
            setPreviouslyAnsweredCards(answeredMap);
          }
        } catch (error) {
          console.error('❌ [loadSession] Erro ao carregar sessão:', error);
        }
        
        setSessionLoaded(true);
        return;
      }

      try {
        // Criar/buscar sessão (necessário para poder atualizar depois)
        await getStudySession(deckId);
        
        // Buscar estatísticas reais do deck (baseado nos fsrs_cards)
        const { getDeckStats } = await import('@/lib/services/deckSessionService');
        const stats = await getDeckStats(deckId);
        
        console.log('📊 [loadSession] Stats do deck:', {
          totalCards: stats.totalCards,
          studiedCards: stats.studiedCards,
          newCards: stats.newCards
        });
        
        // Iniciar do primeiro card não estudado
        // Se estudou X cards, começar do card X+1 (índice X)
        const startIndex = Math.min(stats.studiedCards, flashcards.length - 1);
        
        console.log('✅ [loadSession] Iniciando do índice:', startIndex);
        setCurrentIndex(startIndex);
        
        setSessionLoaded(true);
      } catch (error) {
        console.error('❌ [loadSession] Erro ao carregar sessão:', error);
        setSessionLoaded(true);
      }
    }

    loadSession();
  }, [deckId, flashcards.length, isReviewSession]);

  // Reset when flashcards change
  useEffect(() => {
    setCards(flashcards);
    if (!sessionLoaded) {
      setCurrentIndex(0);
      setReviews([]);
    }
  }, [flashcards, sessionLoaded]);

  const goToNext = useCallback(async () => {
    if (currentIndex < totalCards - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      
      // Salvar progresso da sessão de revisão
      if (isReviewSession && sessionId) {
        console.log('⏭️ [goToNext] Salvando progresso da sessão de revisão:', newIndex);
        try {
          const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
          console.log('🔄 [goToNext] Chamando:', `/api/review-sessions/${sessionId}/progress`);
          await fetchWithAuth(`/api/review-sessions/${sessionId}/progress`, {
            method: 'PATCH', // Tentar PATCH ao invés de PUT
            body: JSON.stringify({ current_index: newIndex }),
          });
          console.log('✅ [goToNext] Progresso salvo com sucesso');
        } catch (error) {
          console.error('❌ [goToNext] Erro ao salvar progresso:', error);
        }
        return;
      }
      
      // Salvar progresso de deck normal
      if (!isReviewSession) {
        console.log('➡️ [goToNext] Salvando progresso:', {
          deckId,
          current_index: newIndex,
          studied_cards: reviews.length,
        });
        
        // Salvar progresso
        try {
          await updateStudySession(deckId, {
            current_index: newIndex,
            studied_cards: reviews.length,
            reviewed_card_ids: reviews.map(r => r.cardId),
          });
          console.log('✅ [goToNext] Progresso salvo com sucesso');
        } catch (error) {
          console.error('❌ [goToNext] Erro ao salvar progresso:', error);
        }
      }
    }
  }, [currentIndex, totalCards, deckId, reviews, isReviewSession, sessionId]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const submitReview = useCallback(async (cardId: string, difficulty: Difficulty) => {
    // Se for sessão de revisão e o card já foi respondido (nesta sessão ou anteriormente), não permite responder novamente
    if (isReviewSession && (answeredCards.has(cardId) || previouslyAnsweredCards.has(cardId))) {
      console.log('⚠️ [submitReview] Card já respondido anteriormente');
      return;
    }
    
    const review: CardReview = {
      cardId,
      difficulty,
      reviewedAt: new Date().toISOString(),
    };
    
    const newReviews = [...reviews, review];
    setReviews(newReviews);
    
    // Marcar card como respondido na sessão de revisão com a dificuldade escolhida
    if (isReviewSession) {
      setAnsweredCards(prev => new Map(prev).set(cardId, difficulty));
    }
    
    // Não salvar progresso se for sessão de revisão
    if (!isReviewSession) {
      console.log('📝 [submitReview] Salvando progresso:', {
        deckId,
        current_index: currentIndex,
        studied_cards: newReviews.length,
        reviewed_card_ids: newReviews.map(r => r.cardId),
      });
      
      // Salvar progresso imediatamente após revisão
      try {
        await updateStudySession(deckId, {
          current_index: currentIndex,
          studied_cards: newReviews.length,
          reviewed_card_ids: newReviews.map(r => r.cardId),
        });
        console.log('✅ [submitReview] Progresso salvo com sucesso');
      } catch (error) {
        console.error('❌ [submitReview] Erro ao salvar progresso da revisão:', error);
      }
    } else {
      console.log('📝 [submitReview] Sessão de revisão - não salva em deck_study_sessions');
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

    // Enviar revisão para o backend (sistema unificado de revisões)
    try {
      // Mapear difficulty para grade do sistema unificado (0-3)
      const qualityMap: Record<Difficulty, number> = {
        'again': 0,  // Again = 0 (FSRS AGAIN)
        'hard': 1,   // Hard = 1 (FSRS HARD)
        'good': 2,   // Good = 2 (FSRS GOOD)
        'easy': 3,   // Easy = 3 (FSRS EASY)
      };

      const grade = qualityMap[difficulty];
      
      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
      await fetchWithAuth(`/unified-reviews/record`, {
        method: 'POST',
        body: JSON.stringify({
          content_type: 'FLASHCARD',
          content_id: cardId,
          grade,
          review_time_ms: 0, // Pode adicionar tracking de tempo depois
        }),
      });
    } catch (error) {
      console.error('Erro ao registrar revisão:', error);
      // Não bloqueia a UI se falhar
    }
  }, [deckId, currentIndex, reviews, isReviewSession, answeredCards, previouslyAnsweredCards]);

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
    isCurrentCardAnswered,
    currentCardAnswer,
  };
}
