'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { reviewsKeys } from '@/hooks/queries/useReviews';
import { format } from 'date-fns';

interface ReviewTypeData {
  pending: number;
  completed: number;
  total: number;
  reviewIds: string[];
}

interface TodayReviews {
  FLASHCARD: ReviewTypeData;
  QUESTION: ReviewTypeData;
  ERROR_NOTEBOOK: ReviewTypeData;
}

const defaultReviewData: ReviewTypeData = {
  pending: 0,
  completed: 0,
  total: 0,
  reviewIds: [],
};

export function TodayReviewsSection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<TodayReviews>({
    FLASHCARD: { ...defaultReviewData },
    QUESTION: { ...defaultReviewData },
    ERROR_NOTEBOOK: { ...defaultReviewData },
  });

  const loadTodayReviews = useCallback(async () => {
    try {
      setLoading(true);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      const response = await fetch(
        `/api/unified-reviews/planner?limit=200&startDate=${todayStr}&endDate=${todayStr}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );

      const result = await response.json();

      if (result.success && result.data.grouped[todayStr]) {
        const todayData = result.data.grouped[todayStr];
        
        const newReviews: TodayReviews = {
          FLASHCARD: { ...defaultReviewData },
          QUESTION: { ...defaultReviewData },
          ERROR_NOTEBOOK: { ...defaultReviewData },
        };

        (['FLASHCARD', 'QUESTION', 'ERROR_NOTEBOOK'] as const).forEach((type) => {
          const typeData = todayData[type];
          if (typeData) {
            const pendingReviews = typeData.reviews || [];
            const completedCount = typeData.completed_count || 0;
            
            newReviews[type] = {
              pending: pendingReviews.length,
              completed: completedCount,
              total: pendingReviews.length + completedCount,
              reviewIds: pendingReviews.map((r: any) => r.id),
            };
          }
        });

        setReviews(newReviews);
      }
    } catch (error) {
      console.error('Erro ao carregar revisões de hoje:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayReviews();

    const handleReviewsUpdated = () => {
      loadTodayReviews();
      queryClient.invalidateQueries({ queryKey: reviewsKeys.dashboard() });
    };

    window.addEventListener('reviews-updated', handleReviewsUpdated);
    return () => window.removeEventListener('reviews-updated', handleReviewsUpdated);
  }, [loadTodayReviews, queryClient]);

  const handleStartReview = async (contentType: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK') => {
    const reviewData = reviews[contentType];
    if (reviewData.pending === 0) return;

    try {
      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
      const today = new Date();
      const dateStr = format(today, 'yyyy-MM-dd');

      const response = await fetchWithAuth('/api/review-sessions', {
        method: 'POST',
        body: JSON.stringify({
          content_type: contentType,
          review_ids: reviewData.reviewIds,
          date: dateStr,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar sessão');
      }

      const result = await response.json();
      const sessionId = result.data.session.id;

      const routes: Record<string, string> = {
        FLASHCARD: `/revisoes/flashcards/sessao/${sessionId}`,
        QUESTION: `/revisoes/questoes/sessao/${sessionId}`,
        ERROR_NOTEBOOK: `/revisoes/caderno-erros/sessao/${sessionId}`,
      };

      router.push(routes[contentType]);
    } catch (error) {
      console.error('Erro ao iniciar revisão:', error);
    }
  };

  // Cores do design system - usando primary (#7C3AED) como base
  const reviewTypes = [
    { 
      key: 'FLASHCARD' as const, 
      label: 'Flashcards', 
      icon: 'layers',
      // Roxo - cor primary do sistema
      bgColor: 'bg-primary/10 dark:bg-primary/20',
      textColor: 'text-primary dark:text-primary',
      iconBg: 'bg-primary',
      progressBg: 'bg-primary',
    },
    { 
      key: 'QUESTION' as const, 
      label: 'Questões', 
      icon: 'list_alt',
      // Cyan - usando tokens de progress-bar
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
      textColor: 'text-progress-bar-cyan-light dark:text-progress-bar-cyan-dark',
      iconBg: 'bg-progress-bar-cyan-light dark:bg-progress-bar-cyan-dark',
      progressBg: 'bg-progress-bar-cyan-light dark:bg-progress-bar-cyan-dark',
    },
    { 
      key: 'ERROR_NOTEBOOK' as const, 
      label: 'Caderno de Erros', 
      icon: 'book',
      // Verde - para caderno de erros
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      iconBg: 'bg-emerald-600 dark:bg-emerald-500',
      progressBg: 'bg-emerald-600 dark:bg-emerald-500',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-32 bg-border-light dark:bg-border-dark rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-border-light dark:bg-border-dark rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const hasAnyReviews = Object.values(reviews).some(r => r.total > 0);

  return (
    <div>
      <h3 className="font-display font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-3">
        Revisões de Hoje
      </h3>

      {!hasAnyReviews ? (
        <div className="text-center py-6 text-text-light-secondary dark:text-text-dark-secondary">
          <span className="material-symbols-outlined text-3xl mb-2 block opacity-50">
            check_circle
          </span>
          <p className="text-sm font-inter">Nenhuma revisão para hoje</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviewTypes.map(({ key, label, icon, bgColor, textColor, iconBg, progressBg }) => {
            const data = reviews[key];
            if (data.total === 0) return null;

            const isComplete = data.pending === 0;
            const percentage = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

            return (
              <button
                key={key}
                onClick={() => !isComplete && handleStartReview(key)}
                disabled={isComplete}
                className={`
                  w-full p-3 rounded-lg transition-all duration-200
                  border border-border-light dark:border-border-dark
                  ${isComplete 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 cursor-default' 
                    : `${bgColor} hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-dark-lg cursor-pointer`
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isComplete ? 'bg-emerald-500' : iconBg}
                  `}>
                    <span className="material-symbols-outlined text-white text-xl">
                      {isComplete ? 'check' : icon}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-display font-semibold text-sm ${isComplete ? 'text-emerald-700 dark:text-emerald-300' : textColor}`}>
                        {label}
                      </span>
                      <span className={`text-xs font-inter font-medium ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
                        {isComplete ? 'Concluído' : `${data.pending} pendentes`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-background-light dark:bg-background-dark rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : progressBg}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
