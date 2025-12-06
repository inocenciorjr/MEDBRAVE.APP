'use client';

import { useState, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import Checkbox from '@/components/ui/Checkbox';

interface ReviewItem {
  id: string;
  content_id: string;
  content_type: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK';
  title: string;
  due: string;
  last_review: string | null;
  review_count: number;
  state: string;
  stability: number;
  difficulty: number;
  university?: string;
  year?: string;
}

interface ReviewItemCardProps {
  review: ReviewItem;
  isSelected: boolean;
  onToggleSelection: (reviewId: string) => void;
  onMenuClick: (review: ReviewItem, buttonElement: HTMLButtonElement) => void;
  isMenuOpen: boolean;
}

function ReviewItemCard({
  review,
  isSelected,
  onToggleSelection,
  onMenuClick,
  isMenuOpen,
}: ReviewItemCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const titleRef = useRef<HTMLParagraphElement>(null);

  return (
    <div 
      className={`relative bg-surface-light dark:bg-surface-dark rounded-xl
                    shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl 
                    border-2 transition-[transform,box-shadow,border-color] duration-300 group
                    ${isSelected 
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 z-10' 
                      : 'border-border-light dark:border-border-dark hover:border-primary/50 dark:hover:border-primary/50'
                    }
                    ${!isMenuOpen ? 'hover:scale-[1.02] hover:-translate-y-1 hover:z-20' : ''}`}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Header */}
      <div className="bg-background-light dark:bg-background-dark px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onChange={() => onToggleSelection(review.id)}
              />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide">
              {review.content_type === 'FLASHCARD' ? 'Flashcard' : review.content_type === 'QUESTION' ? 'Questão' : 'Caderno de Erros'}
            </span>
          </div>
          
          {/* Menu Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick(review, e.currentTarget);
            }}
            className={`
              relative p-1.5 rounded-lg border transition-all duration-200
              flex items-center justify-center
              ${isMenuOpen
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border-light dark:border-border-dark hover:border-primary/60 text-text-light-secondary dark:text-text-dark-secondary hover:text-primary'
              }
            `}
          >
            <span className="material-symbols-outlined text-base">more_vert</span>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          {review.content_type === 'FLASHCARD' ? (
            // Flashcard: Formatar hierarquia
            (() => {
              const parts = review.title.split(' / ');
              if (parts.length >= 2) {
                const collection = parts[0]; // Nome completo da coleção
                const deckPath = parts.slice(1, -1).join(' › ');
                const rawCardNumber = parts[parts.length - 1];
                
                // Converter número do card: 0 → 1, 1 → 2, etc (índice começa em 0)
                const numericValue = parseInt(rawCardNumber);
                const cardNumber = !isNaN(numericValue) 
                  ? String(numericValue + 1)
                  : rawCardNumber;
                
                return (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide">
                      {collection}
                    </p>
                    {deckPath && (
                      <p 
                        ref={titleRef}
                        className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary 
                                    group-hover:text-primary line-clamp-2"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipPosition({
                            top: rect.bottom + 8,
                            left: rect.left
                          });
                          setShowTooltip(true);
                        }}
                        onMouseLeave={() => setShowTooltip(false)}
                      >
                        {deckPath}
                      </p>
                    )}
                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      Flashcard Nº {cardNumber}
                    </p>
                  </div>
                );
              }
              
              // Fallback se não tiver formato esperado
              return (
                <div>
                  <p 
                    ref={titleRef}
                    className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary 
                                group-hover:text-primary break-words line-clamp-3"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPosition({
                        top: rect.bottom + 8,
                        left: rect.left
                      });
                      setShowTooltip(true);
                    }}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    {review.title}
                  </p>
                </div>
              );
            })()
          ) : (
            // Questões e Caderno de Erros: Manter formato original
            <div>
              <div>
                <p 
                  ref={titleRef}
                  className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary 
                              group-hover:text-primary break-words line-clamp-3"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltipPosition({
                      top: rect.bottom + 8,
                      left: rect.left
                    });
                    setShowTooltip(true);
                  }}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  {review.title}
                </p>
                
                {/* Informações da questão/caderno */}
                {(review.university || review.year) && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    {/* Universidade */}
                    {review.university && (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-sm">school</span>
                        <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">{review.university}</span>
                      </div>
                    )}
                    
                    {/* Ano e Revisões na mesma linha */}
                    <div className="flex items-center gap-3">
                      {review.year && (
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-sm">calendar_today</span>
                          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">{review.year}</span>
                        </div>
                      )}
                      
                      {/* Badge de Revisões */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 dark:bg-primary/20 w-fit">
                        <span className="material-symbols-outlined text-primary text-xs">history</span>
                        <p className="text-xs font-semibold text-primary whitespace-nowrap">
                          {review.review_count} {review.review_count === 1 ? 'revisão realizada' : 'revisões realizadas'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Badge de Revisões - Para flashcards (sempre embaixo) */}
        {review.content_type === 'FLASHCARD' && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 dark:bg-primary/20 w-fit">
            <span className="material-symbols-outlined text-primary text-xs">history</span>
            <p className="text-xs font-semibold text-primary whitespace-nowrap">
              {review.review_count} {review.review_count === 1 ? 'revisão realizada' : 'revisões realizadas'}
            </p>
          </div>
        )}
      </div>
      
      {/* Tooltip com createPortal */}
      {showTooltip && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed px-4 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                     text-sm font-medium rounded-lg shadow-2xl border-2 border-slate-700 dark:border-slate-300
                     pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            zIndex: 99999,
            maxWidth: '600px',
            width: 'max-content',
          }}
        >
          {review.content_type === 'FLASHCARD' ? (
            // Para flashcards, formatar o tooltip de forma amigável
            (() => {
              const parts = review.title.split(' / ');
              if (parts.length >= 2) {
                const collection = parts[0];
                const deckName = parts.slice(1, -1).join(' › ');
                const cardNumber = parts[parts.length - 1];
                const numericValue = parseInt(cardNumber);
                const displayNumber = !isNaN(numericValue) ? numericValue + 1 : cardNumber;
                
                return (
                  <div className="space-y-1">
                    <div className="text-xs opacity-75">{collection}</div>
                    <div className="font-bold">{deckName}</div>
                    <div className="text-xs opacity-75">Flashcard Nº {displayNumber}</div>
                  </div>
                );
              }
              return review.title;
            })()
          ) : (
            review.title
          )}
          <span className="absolute bottom-full left-4 transform -mt-[2px]
                       w-0 h-0 border-l-[6px] border-l-transparent 
                       border-r-[6px] border-r-transparent 
                       border-b-[6px] border-b-slate-900 dark:border-b-slate-100"></span>
        </div>,
        document.body
      )}
    </div>
  );
}

export default memo(ReviewItemCard);
