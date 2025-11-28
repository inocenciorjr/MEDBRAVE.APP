'use client';

import { useEffect, useState } from 'react';
import { Deck, Flashcard, Difficulty } from '@/types/flashcards';
import { useFlashcardSession } from '@/lib/hooks/useFlashcardSession';
import { useCardFlip } from '@/lib/hooks/useCardFlip';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { FlashcardStack } from './FlashcardStack';
import { DifficultyButtons } from './DifficultyButtons';
import { ProgressBar } from './ProgressBar';
import { HelpCircle } from 'lucide-react';
import { ReviewInfoModal } from '@/components/reviews/ReviewInfoModal';

interface FlashcardViewProps {
  deck: Deck;
  flashcards: Flashcard[];
  isReviewSession?: boolean;
  sessionId?: string;
}

export function FlashcardView({ deck, flashcards, isReviewSession = false, sessionId }: FlashcardViewProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const isMobile = useIsMobile();
  
  const {
    currentCard,
    currentIndex,
    totalCards,
    goToNext,
    goToPrevious,
    canGoPrevious,
    canGoNext,
    submitReview,
    isCurrentCardAnswered,
    currentCardAnswer,
  } = useFlashcardSession(flashcards, deck.id, sessionId);

  const {
    cardSide,
    flipCard,
    resetCard,
  } = useCardFlip();

  // Reset card to front when moving to next/previous card
  useEffect(() => {
    resetCard();
  }, [currentIndex, resetCard]);

  const handleDifficultySelect = async (difficulty: Difficulty) => {
    // Prevenir cliques múltiplos - se já está processando, ignorar
    if (isCurrentCardAnswered) {
      return;
    }
    
    // Submeter review (o hook já marca como respondido internamente)
    await submitReview(currentCard.id, difficulty);
    
    // Ir para o próximo card
    if (currentIndex < totalCards - 1) {
      await goToNext();
    } else {
      // Se for o último card, voltar para a página da coleção
      const collectionId = deck.collectionId || deck.collection_id;
      if (collectionId) {
        window.location.href = `/flashcards/colecoes/${collectionId}`;
      } else {
        window.location.href = '/flashcards/colecoes';
      }
    }
  };

  const handleFinishSession = () => {
    // Voltar para a página da coleção específica sem mostrar resumo
    const collectionId = deck.collectionId || deck.collection_id;
    if (collectionId) {
      window.location.href = `/flashcards/colecoes/${collectionId}`;
    } else {
      window.location.href = '/flashcards/colecoes';
    }
  };

  if (!currentCard) {
    return (
      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-text-light-primary dark:text-text-dark-primary text-lg">
                Nenhum flashcard disponível neste deck.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-8rem)]">
          <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 md:gap-8 lg:gap-12">
            {/* Header */}
            <header className="w-full flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 px-2 md:px-4 py-3 md:py-4 rounded-xl bg-surface-light/50 dark:bg-surface-dark/50 backdrop-blur-sm border border-border-light/30 dark:border-border-dark/30">
              <button
                onClick={handleFinishSession}
                className="bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark w-full sm:w-auto 
                         text-text-light-secondary dark:text-text-dark-secondary 
                         hover:border-gray-400 dark:hover:border-gray-500 hover:text-text-light-primary dark:hover:text-text-dark-primary
                         px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200
                         focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 
                         shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
                aria-label="Parar sessão"
              >
                <span className="material-symbols-outlined text-base md:text-lg">stop_circle</span>
                <span className="hidden sm:inline">Parar</span>
              </button>
              
              <div className="w-full sm:w-auto flex-1 sm:flex-initial">
                <ProgressBar current={currentIndex + 1} total={totalCards} />
              </div>
              
              <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-center">
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark 
                           text-text-light-secondary dark:text-text-dark-secondary 
                           hover:border-primary hover:text-primary hover:shadow-lg hover:scale-105
                           transition-all duration-200 ease-in-out
                           focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                           rounded-lg w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shadow-md
                           active:scale-95 flex-shrink-0"
                  aria-label="Como funciona o sistema de revisão?"
                  title="Como funciona o sistema de revisão?"
                >
                  <HelpCircle size={16} className="md:w-5 md:h-5" />
                </button>
                
                <button
                  onClick={goToPrevious}
                  disabled={!canGoPrevious}
                  className="bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark 
                           text-text-light-primary dark:text-text-dark-primary 
                           hover:border-primary hover:text-primary hover:shadow-lg hover:scale-105
                           disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:border-border-light dark:disabled:hover:border-border-dark
                           transition-all duration-200 ease-in-out
                           focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                           rounded-lg w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shadow-md
                           active:scale-95 flex-shrink-0"
                  aria-label="Card anterior"
                >
                  <span className="material-symbols-outlined text-xl md:text-2xl">chevron_left</span>
                </button>
                
                <span className="text-xs md:text-sm font-semibold text-text-light-primary dark:text-text-dark-primary min-w-[60px] md:min-w-[80px] text-center bg-surface-light dark:bg-surface-dark px-2 md:px-4 py-1.5 md:py-2 rounded-lg border border-border-light dark:border-border-dark shadow-sm whitespace-nowrap">
                  {currentIndex + 1} de {totalCards}
                </span>
                
                <button
                  onClick={goToNext}
                  disabled={!canGoNext}
                  className="bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark 
                           text-text-light-primary dark:text-text-dark-primary 
                           hover:border-primary hover:text-primary hover:shadow-lg hover:scale-105
                           disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:border-border-light dark:disabled:hover:border-border-dark
                           transition-all duration-200 ease-in-out
                           focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                           rounded-lg w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shadow-md
                           active:scale-95 flex-shrink-0"
                  aria-label="Próximo card"
                >
                  <span className="material-symbols-outlined text-xl md:text-2xl">chevron_right</span>
                </button>
              </div>
            </header>

            {/* Badge de card já respondido */}
            {isCurrentCardAnswered && (
              <div className="w-full px-2 md:px-4">
                <div className="bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg px-3 md:px-4 py-2 md:py-3 flex items-start md:items-center gap-2 md:gap-3 shadow-md">
                  <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl md:text-2xl flex-shrink-0">check_circle</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                      ✅ Flashcard já respondido hoje
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                      Você pode revisar o conteúdo, mas não pode responder novamente
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Flashcard Stack */}
            <div className="relative">
              <FlashcardStack
                card={currentCard}
                cardSide={cardSide}
                onFlip={flipCard}
                showBreadcrumbOnFront={!isReviewSession}
              />
              
              {/* Mobile Flip Button */}
              {isMobile && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => {
                      flipCard();
                      // Scroll to buttons after flip on mobile
                      if (cardSide === 'front') {
                        setTimeout(() => {
                          const buttonsElement = document.getElementById('difficulty-buttons');
                          if (buttonsElement) {
                            buttonsElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }
                        }, 350);
                      }
                    }}
                    className="bg-primary text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">
                      {cardSide === 'front' ? 'visibility' : 'visibility_off'}
                    </span>
                    {cardSide === 'front' ? 'Ver Resposta' : 'Ver Pergunta'}
                  </button>
                </div>
              )}
            </div>

            {/* Difficulty Buttons - Only show when card is flipped to back (answer) */}
            {cardSide === 'back' && (
              <div id="difficulty-buttons">
                <DifficultyButtons 
                  onSelect={handleDifficultySelect}
                  flashcardId={currentCard.id}
                  disabled={isCurrentCardAnswered}
                  selectedDifficulty={currentCardAnswer}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de informação */}
      <ReviewInfoModal 
        isOpen={showInfoModal} 
        onClose={() => setShowInfoModal(false)} 
      />
    </div>
  );
}
