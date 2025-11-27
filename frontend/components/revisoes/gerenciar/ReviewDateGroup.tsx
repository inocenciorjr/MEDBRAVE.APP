'use client';

import { useState } from 'react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReviewItemCard from './ReviewItemCard';

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

interface ReviewDateGroupProps {
  date: Date;
  reviews: ReviewItem[];
  selectedReviews: Set<string>;
  onToggleSelection: (reviewId: string) => void;
  onMenuClick: (review: ReviewItem, buttonElement: HTMLButtonElement) => void;
  openMenuReviewId: string | null;
}

export default function ReviewDateGroup({
  date,
  reviews,
  selectedReviews,
  onToggleSelection,
  onMenuClick,
  openMenuReviewId,
}: ReviewDateGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getDateLabel = () => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isYesterday(date)) return 'Ontem';
    
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  const isOverdue = date < new Date() && !isToday(date);

  return (
    <div className="mb-3">
      {/* Header da Data */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 flex justify-between items-center rounded-lg
                   transition-all duration-200 text-left group
                   ${isOverdue 
                     ? 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30' 
                     : 'bg-background-light/50 dark:bg-background-dark/50 hover:bg-background-light dark:hover:bg-background-dark'
                   }`}
      >
        <div className="flex items-center gap-3">
          <span className={`material-symbols-outlined text-xl ${isOverdue ? 'text-red-500' : 'text-primary'}`}>
            {isOverdue ? 'warning' : 'calendar_today'}
          </span>
          <div>
            <p className={`font-semibold text-sm capitalize ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-text-light-primary dark:text-text-dark-primary'}`}>
              {getDateLabel()}
            </p>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              {reviews.length} {reviews.length === 1 ? 'revisão' : 'revisões'}
            </p>
          </div>
        </div>

        <span className={`material-symbols-outlined transition-transform duration-300 
                        ${isExpanded ? 'rotate-180' : ''} 
                        ${isOverdue ? 'text-red-500' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
          expand_more
        </span>
      </button>

      {/* Cards expandidos */}
      <div
        className={`
          grid transition-all duration-500 ease-in-out
          ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}
        `}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
            {reviews.map((review) => (
              <ReviewItemCard
                key={review.id}
                review={review}
                isSelected={selectedReviews.has(review.id)}
                onToggleSelection={onToggleSelection}
                onMenuClick={onMenuClick}
                isMenuOpen={openMenuReviewId === review.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
