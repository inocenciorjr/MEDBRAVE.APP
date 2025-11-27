import { useState, useCallback, useEffect } from 'react';
import { CardSide } from '@/types/flashcards';

export function useCardFlip() {
  const [cardSide, setCardSide] = useState<CardSide>('front');

  const flipCard = useCallback(() => {
    // Flip immediately with 3D rotation
    setCardSide(prev => prev === 'front' ? 'back' : 'front');
  }, []);

  const resetCard = useCallback(() => {
    setCardSide('front');
  }, []);

  // Reset card to front when component unmounts or card changes
  useEffect(() => {
    return () => {
      resetCard();
    };
  }, [resetCard]);

  return {
    cardSide,
    flipCard,
    resetCard,
  };
}
