'use client';

import { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { startOfDay, format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReviewItemCard from './ReviewItemCard';
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
}

interface ReviewTypeCardProps {
  type: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK';
  label: string;
  reviews: ReviewItem[];
  totalCount: number;
  selectedReviews: Set<string>;
  onToggleSelection: (reviewId: string) => void;
  onToggleMultiple: (reviewIds: string[], shouldSelect: boolean) => void;
  onMenuClick: (review: ReviewItem, buttonElement: HTMLButtonElement) => void;
  openMenuReviewId: string | null;
  onExpand?: () => void;
  isLoading?: boolean;
  defaultExpanded?: boolean;
}

function ReviewTypeCard({
  type,
  label,
  reviews,
  totalCount,
  selectedReviews,
  onToggleSelection,
  onToggleMultiple,
  onMenuClick,
  openMenuReviewId,
  onExpand,
  isLoading = false,
  defaultExpanded = false,
}: ReviewTypeCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Expande automaticamente quando defaultExpanded é true
  useEffect(() => {
    if (defaultExpanded && !isExpanded) {
      setIsExpanded(true);
      onExpand?.();
    }
  }, [defaultExpanded]);

  const allSelected = reviews.every(r => selectedReviews.has(r.id));
  const someSelected = reviews.some(r => selectedReviews.has(r.id)) && !allSelected;

  // Agrupar revisões por data
  const reviewsByDate = useMemo(() => {
    const groups = new Map<string, ReviewItem[]>();
    
    reviews.forEach(review => {
      const dueDate = startOfDay(new Date(review.due));
      const dateKey = dueDate.toISOString();
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(review);
    });

    // Ordenar por data (mais próxima primeiro)
    return Array.from(groups.entries())
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
      .map(([dateKey, items]) => ({
        date: new Date(dateKey),
        dateKey,
        reviews: items,
      }));
  }, [reviews]);

  const getDateLabel = useCallback((date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  }, []);

  const toggleDateExpansion = useCallback((dateKey: string) => {
    setExpandedDates(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(dateKey)) {
        newExpanded.delete(dateKey);
      } else {
        newExpanded.add(dateKey);
      }
      return newExpanded;
    });
  }, []);

  const toggleAll = () => {
    if (allSelected) {
      reviews.forEach(r => onToggleSelection(r.id));
    } else {
      reviews.forEach(r => {
        if (!selectedReviews.has(r.id)) {
          onToggleSelection(r.id);
        }
      });
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'FLASHCARD':
        return 'layers';
      case 'QUESTION':
        return 'quiz';
      case 'ERROR_NOTEBOOK':
        return 'book';
      default:
        return 'layers';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'FLASHCARD':
        return 'text-purple-600 dark:text-purple-400';
      case 'QUESTION':
        return 'text-cyan-600 dark:text-cyan-400';
      case 'ERROR_NOTEBOOK':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-primary';
    }
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl 
                    shadow-xl dark:shadow-dark-xl hover:shadow-2xl dark:hover:shadow-dark-2xl 
                    border border-border-light dark:border-border-dark 
                    hover:scale-[1.01] transition-[transform,box-shadow] duration-300 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => {
          if (!isExpanded && onExpand) {
            onExpand();
          }
          setIsExpanded(!isExpanded);
        }}
        className="w-full p-3 sm:p-4 md:p-5 flex justify-between items-center hover:bg-background-light/50 dark:hover:bg-surface-dark/50 
                   transition-[background-color] duration-200 text-left group"
      >
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {/* Checkbox - Removido pois agora seleção é por data */}

          {/* Icon */}
          <div className={`p-2 sm:p-2.5 md:p-3 rounded-lg md:rounded-xl bg-background-light dark:bg-background-dark 
                          shadow-md group-hover:shadow-lg transition-[box-shadow] duration-300`}>
            <span className={`material-symbols-outlined text-xl sm:text-2xl ${getTypeColor()}`}>
              {getTypeIcon()}
            </span>
          </div>

          {/* Info */}
          <div>
            <p className="text-[10px] sm:text-xs text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider font-medium">
              Tipo de Revisão
            </p>
            <p className="font-bold text-base sm:text-lg text-text-light-primary dark:text-text-dark-primary 
                          group-hover:text-primary">
              {label}
            </p>
            <p className="text-[10px] sm:text-xs text-text-light-secondary dark:text-text-dark-secondary font-medium mt-0.5">
              {totalCount} {totalCount === 1 ? 'item' : 'itens'}
            </p>
          </div>
        </div>

        {/* Arrow Icon */}
        <div className={`
          p-1.5 sm:p-2 md:p-2.5 rounded-lg bg-background-light dark:bg-background-dark 
          shadow-md group-hover:shadow-lg
          transition-[transform,box-shadow,background-color] duration-300
          ${isExpanded ? 'rotate-180 bg-primary/10 shadow-primary/20' : 'group-hover:bg-primary/5'}
        `}>
          <span className={`material-symbols-outlined text-lg sm:text-xl md:text-2xl
                          ${isExpanded ? 'text-primary' : 'text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary'}`}>
            expand_more
          </span>
        </div>
      </button>

      {/* Expanded Content */}
      <div
        className={`
          grid transition-[grid-template-rows,opacity] duration-500 ease-in-out
          ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
        `}
      >
        <div className="overflow-hidden">
          <div className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="border-t border-border-light dark:border-border-dark mb-3 sm:mb-4" />
            
            {/* Loading ou Conteúdo */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Carregando revisões...
                </p>
              </div>
            ) : (
              /* Grupos por data */
              <div className="space-y-3">
              {reviewsByDate.map(({ date, dateKey, reviews: dateReviews }) => {
                const isDateExpanded = expandedDates.has(dateKey);
                const isOverdue = date < new Date() && !isToday(date);
                
                return (
                  <div key={dateKey}>
                    {/* Header da Data - Clicável inteiro */}
                    <button
                      onClick={() => toggleDateExpansion(dateKey)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 flex justify-between items-center rounded-lg
                                 cursor-pointer hover:opacity-90
                                 ${isOverdue 
                                   ? 'bg-red-50 dark:bg-red-950/20' 
                                   : 'bg-background-light/50 dark:bg-background-dark/50'
                                 }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* Checkbox para selecionar todos da data */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={dateReviews.length > 0 && dateReviews.every(r => selectedReviews.has(r.id))}
                            indeterminate={
                              dateReviews.length > 0 && 
                              dateReviews.some(r => selectedReviews.has(r.id)) && 
                              !dateReviews.every(r => selectedReviews.has(r.id))
                            }
                            onChange={() => {
                              const allSelected = dateReviews.every(r => selectedReviews.has(r.id));
                              const reviewIds = dateReviews.map(r => r.id);
                              
                              // Se todos estão selecionados, desseleciona todos
                              // Caso contrário, seleciona todos
                              onToggleMultiple(reviewIds, !allSelected);
                            }}
                          />
                        </div>
                        
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-1">
                          <span className={`material-symbols-outlined text-base sm:text-lg ${isOverdue ? 'text-red-500' : 'text-primary'}`}>
                            {isOverdue ? 'warning' : 'calendar_today'}
                          </span>
                          <div className="text-left">
                            <p className={`font-semibold text-xs sm:text-sm capitalize ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-text-light-primary dark:text-text-dark-primary'}`}>
                              {getDateLabel(date)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-text-light-secondary dark:text-text-dark-secondary text-left">
                              {dateReviews.length} {dateReviews.length === 1 ? 'revisão' : 'revisões'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <span className={`material-symbols-outlined text-lg sm:text-xl transition-transform duration-300
                                      ${isDateExpanded ? 'rotate-180' : ''} 
                                      ${isOverdue ? 'text-red-500' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
                        expand_more
                      </span>
                    </button>

                    {/* Cards da data */}
                    <div
                      className={`
                        grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
                        ${isDateExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}
                      `}
                    >
                      <div className="overflow-hidden">
                        <div className="px-1 sm:px-2 pt-2 pb-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
                            {(() => {
                              // Ordenar reviews de forma inteligente
                              const sortedReviews = [...dateReviews].sort((a, b) => {
                                if (a.content_type === 'FLASHCARD' && b.content_type === 'FLASHCARD') {
                                  // Para flashcards: ordenar por coleção > deck > número
                                  const partsA = a.title.split(' / ');
                                  const partsB = b.title.split(' / ');
                                  
                                  // Comparar coleção
                                  const collectionA = partsA[0] || '';
                                  const collectionB = partsB[0] || '';
                                  if (collectionA !== collectionB) {
                                    return collectionA.localeCompare(collectionB);
                                  }
                                  
                                  // Comparar deck (tudo menos o último elemento)
                                  const deckA = partsA.slice(1, -1).join(' / ');
                                  const deckB = partsB.slice(1, -1).join(' / ');
                                  if (deckA !== deckB) {
                                    return deckA.localeCompare(deckB);
                                  }
                                  
                                  // Comparar número do card
                                  const numA = parseInt(partsA[partsA.length - 1]) || 0;
                                  const numB = parseInt(partsB[partsB.length - 1]) || 0;
                                  return numA - numB;
                                }
                                
                                if ((a.content_type === 'QUESTION' || a.content_type === 'ERROR_NOTEBOOK') && 
                                    (b.content_type === 'QUESTION' || b.content_type === 'ERROR_NOTEBOOK')) {
                                  // Para questões/caderno: ordenar por universidade > ano
                                  const uniA = (a as any).university || '';
                                  const uniB = (b as any).university || '';
                                  if (uniA !== uniB) {
                                    return uniA.localeCompare(uniB);
                                  }
                                  
                                  const yearA = (a as any).year || '';
                                  const yearB = (b as any).year || '';
                                  return yearB.localeCompare(yearA); // Ano mais recente primeiro
                                }
                                
                                // Diferentes tipos: manter ordem original
                                return 0;
                              });
                              
                              return sortedReviews.map((review) => (
                                <ReviewItemCard
                                  key={review.id}
                                  review={review}
                                  isSelected={selectedReviews.has(review.id)}
                                  onToggleSelection={onToggleSelection}
                                  onMenuClick={onMenuClick}
                                  isMenuOpen={openMenuReviewId === review.id}
                                />
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ReviewTypeCard);
