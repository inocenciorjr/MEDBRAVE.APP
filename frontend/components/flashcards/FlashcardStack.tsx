'use client';

import React from 'react';
import { Flashcard, CardSide } from '@/types/flashcards';

interface FlashcardStackProps {
  card: Flashcard;
  cardSide: CardSide;
  onFlip: () => void;
  showBreadcrumbOnFront?: boolean;
}

export function FlashcardStack({ card, cardSide, onFlip, showBreadcrumbOnFront = true }: FlashcardStackProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="relative w-full" style={{ perspective: '1000px' }}>
      {/* Background Cards - Stacking Effect */}
      <div
        className="absolute top-0.5 left-0 w-full h-[calc(100%-2px)] bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark shadow-md transform -rotate-2 origin-bottom-center z-[-2]"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 left-0 w-full h-[calc(100%-1px)] bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark shadow-md transform -rotate-1 origin-bottom-center z-[-1]"
        aria-hidden="true"
      />

      {/* Main Card with 3D Flip */}
      <div className="relative w-full" style={{ transformStyle: 'preserve-3d' }}>
        <main
          className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-2xl dark:shadow-dark-2xl border border-border-light dark:border-border-dark w-full relative z-10 transition-transform duration-600"
          style={{
            transformStyle: 'preserve-3d',
            transform: cardSide === 'back' ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* FRONT SIDE */}
          <div
            className={`flex flex-col w-full ${!isMobile ? 'cursor-pointer' : ''}`}
            onClick={!isMobile ? onFlip : undefined}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {/* Front Header - Estilo igual ao header de DECK */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 border-b border-border-light dark:border-border-dark flex items-center justify-center gap-2 md:gap-3">
              <span className="material-symbols-outlined text-primary text-2xl md:text-3xl lg:text-4xl">
                style
              </span>
              <span className="text-base md:text-lg lg:text-xl font-semibold text-primary uppercase tracking-wide">
                Pergunta
              </span>
            </div>

            {/* Front Content */}
            <div className="flex-grow flex flex-col justify-start p-4 md:p-6 lg:p-8 xl:p-10 min-h-[300px] md:min-h-[400px] lg:min-h-[450px] xl:min-h-[500px] max-h-[500px] md:max-h-[600px] lg:max-h-[650px] xl:max-h-[700px] overflow-y-auto">
              <div className="text-center text-text-light-primary dark:text-text-dark-primary text-base md:text-lg font-inter w-full max-w-full my-auto">
                {card.isHtml ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: card.front }} 
                    className="prose prose-sm dark:prose-invert max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:mx-auto [&_img]:my-4 [&_img]:max-h-[400px] [&_img]:object-contain"
                  />
                ) : (
                  <p>{card.front}</p>
                )}
              </div>
            </div>

            {/* Front Breadcrumb */}
            {card.breadcrumb && card.breadcrumb.length > 0 && (
              <div 
                className="p-3 md:p-4 border-t border-border-light dark:border-border-dark flex justify-between items-center text-xs md:text-sm"
                style={{ visibility: showBreadcrumbOnFront ? 'visible' : 'hidden' }}
              >
                <nav className="flex items-center gap-1 md:gap-2 text-text-light-secondary dark:text-text-dark-secondary overflow-x-auto whitespace-nowrap scrollbar-hide">
                  {card.breadcrumb.map((item, index) => (
                    <span key={index} className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                      {index > 0 && (
                        <span className="material-symbols-outlined text-sm md:text-base flex-shrink-0">
                          chevron_right
                        </span>
                      )}
                      <span className={`truncate max-w-[100px] md:max-w-none ${index === card.breadcrumb.length - 1
                        ? 'text-text-light-primary dark:text-text-dark-primary font-medium'
                        : ''
                        }`}>
                        {item}
                      </span>
                    </span>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* BACK SIDE */}
          <div
            className={`absolute inset-0 flex flex-col bg-surface-light dark:bg-surface-dark rounded-lg ${!isMobile ? 'cursor-pointer' : ''}`}
            onClick={!isMobile ? onFlip : undefined}
            style={{
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {/* Back Header - Estilo igual ao header de DECK */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 border-b border-border-light dark:border-border-dark flex items-center justify-center gap-2 md:gap-3">
              <span className="material-symbols-outlined text-primary text-2xl md:text-3xl lg:text-4xl">
                style
              </span>
              <span className="text-base md:text-lg lg:text-xl font-semibold text-primary uppercase tracking-wide">
                Resposta
              </span>
            </div>

            {/* Back Content */}
            <div className="flex-grow flex flex-col justify-start p-4 md:p-6 lg:p-8 xl:p-10 min-h-[300px] md:min-h-[400px] lg:min-h-[450px] xl:min-h-[500px] max-h-[500px] md:max-h-[600px] lg:max-h-[650px] xl:max-h-[700px] overflow-y-auto">
              <div className="text-center text-text-light-primary dark:text-text-dark-primary text-base md:text-lg font-inter w-full max-w-full my-auto">
                {card.isHtml ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: card.back }} 
                    className="prose prose-sm dark:prose-invert max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:mx-auto [&_img]:my-4 [&_img]:max-h-[400px] [&_img]:object-contain"
                  />
                ) : (
                  <p>{card.back}</p>
                )}
              </div>
            </div>

            {/* Back Breadcrumb */}
            {card.breadcrumb && card.breadcrumb.length > 0 && (
              <div className="p-3 md:p-4 border-t border-border-light dark:border-border-dark flex justify-between items-center text-xs md:text-sm">
                <nav className="flex items-center gap-1 md:gap-2 text-text-light-secondary dark:text-text-dark-secondary overflow-x-auto whitespace-nowrap scrollbar-hide">
                  {card.breadcrumb.map((item, index) => (
                    <span key={index} className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                      {index > 0 && (
                        <span className="material-symbols-outlined text-sm md:text-base flex-shrink-0">
                          chevron_right
                        </span>
                      )}
                      <span className={`truncate max-w-[100px] md:max-w-none ${index === card.breadcrumb.length - 1
                        ? 'text-text-light-primary dark:text-text-dark-primary font-medium'
                        : ''
                        }`}>
                        {item}
                      </span>
                    </span>
                  ))}
                </nav>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
