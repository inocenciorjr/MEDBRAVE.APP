'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import { HelpCircle } from 'lucide-react';
import { ReviewInfoModal } from '@/components/reviews/ReviewInfoModal';
import { DeleteSuggestionModal } from '@/components/reviews/DeleteSuggestionModal';

interface ReviewButtonsProps {
  onReview: (grade: number) => Promise<void>;
  disabled?: boolean;
  contentType: string;
  contentId: string;
  onCardDeleted?: () => void;
}

interface ReviewPreview {
  scheduledDays: number;
  dueDate: string;
  stability: number;
  difficulty: number;
}

export function ReviewButtons({ onReview, disabled, contentType, contentId, onCardDeleted }: ReviewButtonsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredGrade, setHoveredGrade] = useState<number | null>(null);
  const [previews, setPreviews] = useState<{
    again: ReviewPreview | null;
    hard: ReviewPreview | null;
    good: ReviewPreview | null;
    easy: ReviewPreview | null;
  }>({
    again: null,
    hard: null,
    good: null,
    easy: null,
  });
  const [loadingPreviews, setLoadingPreviews] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{
    consecutiveCount: number;
    grade: 'good' | 'easy';
    scheduledDays?: number;
  } | null>(null);

  // Carregar previews ao montar o componente
  useEffect(() => {
    const loadPreviews = async () => {
      try {
        setLoadingPreviews(true);
        const response = await fetchWithAuth(
          `/api/unified-reviews/preview/${contentType}/${contentId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setPreviews(data.data);
        }
      } catch (error) {
        console.error('Erro ao carregar previews:', error);
      } finally {
        setLoadingPreviews(false);
      }
    };

    loadPreviews();
  }, [contentType, contentId]);

  const handleReview = async (grade: number) => {
    if (disabled || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onReview(grade);
      
      // Se foi GOOD (2) ou EASY (3), verificar sequência
      if (grade === 2 || grade === 3) {
        try {
          const response = await fetchWithAuth(
            `/api/unified-reviews/check-sequence/${contentType}/${contentId}`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.data.shouldSuggestDelete) {
              setDeleteInfo({
                consecutiveCount: data.data.consecutiveCount,
                grade: data.data.grade,
                scheduledDays: data.data.scheduledDays,
              });
              setShowDeleteModal(true);
            }
          }
        } catch (error) {
          console.error('Erro ao verificar sequência:', error);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetchWithAuth(
        `/api/unified-reviews/${contentType}/${contentId}`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        setShowDeleteModal(false);
        // Notificar componente pai que o card foi excluído
        if (onCardDeleted) {
          onCardDeleted();
        }
      }
    } catch (error) {
      console.error('Erro ao excluir revisão:', error);
    }
  };

  const formatDays = (days: number, grade: number) => {
    if (days === 1) return '1 dia';
    
    // HARD (grade 1): +1 dia de range
    if (grade === 1) {
      return `${days}-${days + 1} dias`;
    }
    
    // GOOD (grade 2) e EASY (grade 3): +2 dias de range
    if (grade === 2 || grade === 3) {
      return `${days}-${days + 2} dias`;
    }
    
    // AGAIN (grade 0): valor exato
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  };

  const buttons = [
    {
      grade: 0,
      label: 'Novamente',
      icon: 'refresh',
      color: 'red',
      description: 'Não lembrei',
      preview: previews.again,
    },
    {
      grade: 1,
      label: 'Difícil',
      icon: 'sentiment_dissatisfied',
      color: 'orange',
      description: 'Lembrei com dificuldade',
      preview: previews.hard,
    },
    {
      grade: 2,
      label: 'Bom',
      icon: 'sentiment_satisfied',
      color: 'blue',
      description: 'Lembrei bem',
      preview: previews.good,
    },
    {
      grade: 3,
      label: 'Fácil',
      icon: 'sentiment_very_satisfied',
      color: 'green',
      description: 'Lembrei facilmente',
      preview: previews.easy,
    },
  ];

  const getColorClasses = (color: string, isHovered: boolean) => {
    const baseClasses = 'transition-all duration-200';
    
    switch (color) {
      case 'red':
        return `${baseClasses} ${
          isHovered
            ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30'
            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:border-red-500'
        }`;
      case 'orange':
        return `${baseClasses} ${
          isHovered
            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30'
            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:border-orange-500'
        }`;
      case 'blue':
        return `${baseClasses} ${
          isHovered
            ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:border-blue-500'
        }`;
      case 'green':
        return `${baseClasses} ${
          isHovered
            ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30'
            : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:border-green-500'
        }`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-lg border-t border-border-light dark:border-border-dark shadow-2xl z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-3">
          {/* Botão de ajuda */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowInfoModal(true)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 transition-colors"
              title="Como funciona o sistema de revisão?"
            >
              <HelpCircle size={20} />
            </button>
          </div>

          <div className="text-center">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              Como você avalia sua compreensão deste erro?
            </h3>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              {loadingPreviews ? (
                'Calculando estimativas...'
              ) : hoveredGrade !== null && buttons[hoveredGrade].preview ? (
                `Próxima revisão: ${formatDays(buttons[hoveredGrade].preview!.scheduledDays, hoveredGrade)}`
              ) : (
                'Passe o mouse sobre os botões para ver a estimativa'
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {buttons.map((button) => (
              <button
                key={button.grade}
                onClick={() => handleReview(button.grade)}
                onMouseEnter={() => setHoveredGrade(button.grade)}
                onMouseLeave={() => setHoveredGrade(null)}
                disabled={disabled || isSubmitting}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-xl border-2
                  ${getColorClasses(button.color, hoveredGrade === button.grade)}
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:scale-105 active:scale-95
                `}
              >
                <span className="material-symbols-outlined text-3xl">
                  {button.icon}
                </span>
                <div className="text-center">
                  <div className="font-bold text-sm">{button.label}</div>
                  <div className="text-xs opacity-80">{button.description}</div>
                </div>
              </button>
            ))}
          </div>

          {isSubmitting && (
            <div className="text-center text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Registrando revisão...
            </div>
          )}
        </div>
      </div>

      {/* Modal de informação */}
      <ReviewInfoModal 
        isOpen={showInfoModal} 
        onClose={() => setShowInfoModal(false)} 
      />

      {/* Modal de sugestão de exclusão */}
      {deleteInfo && (
        <DeleteSuggestionModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDelete}
          onKeep={() => setShowDeleteModal(false)}
          consecutiveCount={deleteInfo.consecutiveCount}
          grade={deleteInfo.grade}
          scheduledDays={deleteInfo.scheduledDays || 0}
        />
      )}
    </div>
  );
}
