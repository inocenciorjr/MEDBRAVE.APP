'use client';

import { useEffect, useState } from 'react';
import { Flashcard, Difficulty } from '@/types/flashcards';
import { useReviewSession } from '@/lib/hooks/useReviewSession';
import { useCardFlip } from '@/lib/hooks/useCardFlip';
import { FlashcardStack } from './FlashcardStack';
import { DifficultyButtons } from './DifficultyButtons';
import { ProgressBar } from './ProgressBar';
import { HelpCircle } from 'lucide-react';
import { ReviewInfoModal } from '@/components/reviews/ReviewInfoModal';

interface FlashcardReviewViewProps {
  flashcards: Flashcard[];
  reviewIds: string[];
  onComplete?: () => void;
}

export function FlashcardReviewView({ flashcards, reviewIds, onComplete }: FlashcardReviewViewProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
    currentCard,
    currentIndex,
    totalCards,
    goToNext,
    goToPrevious,
    canGoPrevious,
    canGoNext,
    submitReview,
    reviews,
  } = useReviewSession(flashcards, reviewIds);

  const {
    cardSide,
    flipCard,
    resetCard,
  } = useCardFlip();

  // Reset card to front when moving to next/previous card
  useEffect(() => {
    resetCard();
    setIsProcessing(false); // Reset processing state
  }, [currentIndex, resetCard]);

  const handleDifficultySelect = async (difficulty: Difficulty) => {
    // Prevenir cliques múltiplos
    if (isProcessing) {
      return;
    }
    
    setIsProcessing(true);
    
    // Submeter review em background sem bloquear a UI
    submitReview(currentCard.id, difficulty).catch((error) => {
      console.error('Erro ao submeter review:', error);
    });
    
    // Ir para o próximo card IMEDIATAMENTE sem esperar o submit
    if (currentIndex < totalCards - 1) {
      await goToNext();
    } else {
      // Último card - chamar callback de conclusão
      if (onComplete) {
        onComplete();
      }
    }
  };

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Nenhum flashcard para revisar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Revisão de Flashcards
              </h1>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                Sessão de revisão espaçada
              </p>
            </div>
            <button
              onClick={() => setShowInfoModal(true)}
              className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors"
              aria-label="Informações sobre revisão"
            >
              <HelpCircle className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <ProgressBar 
          current={currentIndex + 1} 
          total={totalCards}
        />
      </div>

      {/* Flashcard Stack */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <FlashcardStack
          card={currentCard}
          cardSide={cardSide}
          onFlip={flipCard}
        />
      </div>

      {/* Difficulty Buttons */}
      {cardSide === 'back' && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <DifficultyButtons
            onSelect={handleDifficultySelect}
            disabled={false}
          />
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <ReviewInfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
        />
      )}
    </div>
  );
}
