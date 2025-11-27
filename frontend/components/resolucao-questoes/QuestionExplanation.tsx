'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import api from '@/services/api';

interface QuestionExplanationProps {
  questionId: string;
  professorComment: string;
}

export function QuestionExplanation({ questionId, professorComment }: QuestionExplanationProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRatings();
  }, [questionId]);

  const loadRatings = async () => {
    try {
      const response = await api.get(`/explanation-ratings/${questionId}`);
      
      if (response.data) {
        setAverageRating(response.data.averageRating || 0);
        setTotalRatings(response.data.totalRatings || 0);
        setUserRating(response.data.userRating || 0);
        setRating(response.data.userRating || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    }
  };

  const handleRate = async (newRating: number) => {
    if (!user || loading) return;

    try {
      setLoading(true);
      await api.post('/explanation-ratings', {
        question_id: questionId,
        rating: newRating,
      });

      setRating(newRating);
      setUserRating(newRating);
      loadRatings();
    } catch (error) {
      console.error('Erro ao avaliar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-6 shadow-lg border-2 border-primary/20 dark:border-primary/30">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-primary dark:text-primary-light">
            Explicação da Questão
          </h3>
        </div>
      </div>

      {/* Conteúdo da Explicação */}
      <div 
        className="prose dark:prose-invert max-w-none mb-6 text-text-light-primary dark:text-text-dark-primary"
        dangerouslySetInnerHTML={{ __html: professorComment }}
      />

      {/* Sistema de Avaliação */}
      <div className="border-t border-primary/20 dark:border-primary/30 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              Esta explicação foi útil?
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  disabled={!user || loading}
                  className="transition-all hover:scale-125 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}
                >
                  <span 
                    className={`material-symbols-outlined text-3xl ${
                      (hoveredStar >= star || (!hoveredStar && rating >= star))
                        ? 'text-yellow-500'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Estatísticas */}
          {totalRatings > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500 text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                  star
                </span>
                <span className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {averageRating.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>

        {userRating > 0 && (
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
            Você avaliou com {userRating} estrela{userRating > 1 ? 's' : ''}
          </p>
        )}

        {!user && (
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
            Faça login para avaliar esta explicação
          </p>
        )}
      </div>
    </div>
  );
}
