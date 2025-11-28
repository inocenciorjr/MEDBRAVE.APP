'use client';

import { useState, useEffect } from 'react';
import { Difficulty } from '@/types/flashcards';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import { DeleteSuggestionModal } from '@/components/reviews/DeleteSuggestionModal';

interface DifficultyButtonsProps {
  onSelect: (difficulty: Difficulty) => void;
  flashcardId?: string;
  contentType?: string;
  contentId?: string;
  onCardDeleted?: () => void;
  disabled?: boolean;
  selectedDifficulty?: Difficulty;
}

interface ReviewPreview {
  scheduledDays: number;
  dueDate: string;
  stability: number;
  difficulty: number;
}

export function DifficultyButtons({ onSelect, flashcardId, contentType, contentId, onCardDeleted, disabled = false, selectedDifficulty }: DifficultyButtonsProps) {
  // Usar contentType/contentId se fornecidos, senão usar FLASHCARD/flashcardId
  const finalContentType = contentType || 'FLASHCARD';
  const finalContentId = contentId || flashcardId || '';
  const [hoveredDifficulty, setHoveredDifficulty] = useState<Difficulty | null>(null);
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<{
    consecutiveCount: number;
    grade: 'good' | 'easy';
    scheduledDays: number;
  } | null>(null);

  // Carregar previews ao montar o componente
  useEffect(() => {
    const loadPreviews = async () => {
      try {
        setLoadingPreviews(true);
        const response = await fetchWithAuth(
          `/api/unified-reviews/preview/${finalContentType}/${finalContentId}`
        );

        if (response.ok) {
          const data = await response.json();
          console.log('📊 [DifficultyButtons] Previews carregados:', data.data);
          setPreviews(data.data);
        }
      } catch (error) {
        console.error('Erro ao carregar previews:', error);
      } finally {
        setLoadingPreviews(false);
      }
    };

    if (finalContentId) {
      loadPreviews();
    }
  }, [finalContentType, finalContentId]);

  const formatDays = (days: number, difficulty: Difficulty) => {
    if (days === 1) return '1 dia';

    // HARD: +1 dia de range
    if (difficulty === 'hard') {
      return `${days}-${days + 1} dias`;
    }

    // GOOD e EASY: +2 dias de range
    if (difficulty === 'good' || difficulty === 'easy') {
      return `${days}-${days + 2} dias`;
    }

    // AGAIN: valor exato
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  };

  const getPreviewText = (difficulty: Difficulty) => {
    if (loadingPreviews) return '...';
    const preview = previews[difficulty];
    return preview ? formatDays(preview.scheduledDays, difficulty) : '';
  };

  const handleSelect = async (difficulty: Difficulty) => {
    // Registrar resposta IMEDIATAMENTE para não bloquear a UI
    onSelect(difficulty);

    // Verificar sequência em background (sem await) apenas para GOOD ou EASY
    if ((difficulty === 'good' || difficulty === 'easy') && flashcardId) {
      // Fazer verificação em background sem bloquear
      fetchWithAuth(
        `/api/unified-reviews/check-sequence/FLASHCARD/${flashcardId}`
      )
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();

            if (data.data.shouldSuggestDelete) {
              setPendingDifficulty(difficulty);
              setDeleteInfo({
                consecutiveCount: data.data.consecutiveCount,
                grade: data.data.grade,
                scheduledDays: data.data.scheduledDays || 0,
              });
              setShowDeleteModal(true);
            }
          }
        })
        .catch((error) => {
          console.error('Erro ao verificar sequência:', error);
        });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetchWithAuth(
        `/api/unified-reviews/delete/FLASHCARD/${flashcardId}`,
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

  const handleKeep = async () => {
    setShowDeleteModal(false);
    // Agora sim registrar a resposta com a dificuldade que estava pendente
    if (pendingDifficulty) {
      await onSelect(pendingDifficulty);
      setPendingDifficulty(null);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Preview text - mostra no hover (desktop) ou sempre (mobile) */}
      <div className="text-center min-h-[24px] flex items-center justify-center">
        {hoveredDifficulty && !loadingPreviews ? (
          <p className="text-xs md:text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary">
            Próxima revisão: {getPreviewText(hoveredDifficulty)}
          </p>
        ) : (
          <p className="text-xs md:text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary text-center">
            <span className="hidden md:inline">Passe o mouse para ver o tempo estimado</span>
            <span className="md:hidden">Toque em um botão para ver o tempo estimado</span>
          </p>
        )}
      </div>

      <footer className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
        {/* Não lembrei - Vermelho */}
        <button
          onClick={() => handleSelect('again')}
          onMouseEnter={() => !disabled && setHoveredDifficulty('again')}
          onMouseLeave={() => setHoveredDifficulty(null)}
          onTouchStart={() => !disabled && setHoveredDifficulty('again')}
          disabled={disabled}
          className={`bg-red-600 dark:bg-red-600 text-white font-semibold py-3 md:py-4 px-2 md:px-4 rounded-xl md:rounded-2xl 
                     transition-all duration-200 shadow-xl focus:outline-none border-2
                     ${selectedDifficulty === 'again' 
                       ? 'ring-4 ring-yellow-400 border-yellow-400 scale-105' 
                       : 'border-red-700 dark:border-red-700'
                     }
                     ${disabled 
                       ? 'opacity-50 cursor-not-allowed' 
                       : 'hover:bg-red-700 dark:hover:bg-red-700 hover:shadow-2xl focus:ring-4 focus:ring-red-500/50 hover:scale-105 active:scale-95'
                     }`}
          aria-label="Não lembrei - revisar novamente em breve"
        >
          <div className="flex flex-col items-center justify-center gap-1 md:gap-2">
            <span className="material-symbols-outlined text-2xl md:text-3xl font-bold" style={{ display: 'block', lineHeight: 1 }}>refresh</span>
            <span className="text-xs md:text-sm font-bold leading-tight text-center">Não lembrei!</span>
          </div>
        </button>

        {/* Difícil - Cinza escuro */}
        <button
          onClick={() => handleSelect('hard')}
          onMouseEnter={() => !disabled && setHoveredDifficulty('hard')}
          onMouseLeave={() => setHoveredDifficulty(null)}
          onTouchStart={() => !disabled && setHoveredDifficulty('hard')}
          disabled={disabled}
          className={`bg-gray-600 dark:bg-gray-700 text-white font-semibold py-3 md:py-4 px-2 md:px-4 rounded-xl md:rounded-2xl 
                     transition-all duration-200 shadow-xl focus:outline-none border-2
                     ${selectedDifficulty === 'hard' 
                       ? 'ring-4 ring-yellow-400 border-yellow-400 scale-105' 
                       : 'border-gray-700 dark:border-gray-800'
                     }
                     ${disabled 
                       ? 'opacity-50 cursor-not-allowed' 
                       : 'hover:bg-gray-700 dark:hover:bg-gray-800 hover:shadow-2xl focus:ring-4 focus:ring-gray-500/50 hover:scale-105 active:scale-95'
                     }`}
          aria-label="Lembrei, mas achei difícil - revisar em alguns dias"
        >
          <div className="flex flex-col items-center justify-center gap-1 md:gap-2">
            <span className="material-symbols-outlined text-2xl md:text-3xl font-bold" style={{ display: 'block', lineHeight: 1 }}>trending_flat</span>
            <span className="text-xs md:text-sm font-bold leading-tight text-center">Lembrei, mas achei difícil!</span>
          </div>
        </button>

        {/* Bom - Roxo claro */}
        <button
          onClick={() => handleSelect('good')}
          onMouseEnter={() => !disabled && setHoveredDifficulty('good')}
          onMouseLeave={() => setHoveredDifficulty(null)}
          onTouchStart={() => !disabled && setHoveredDifficulty('good')}
          disabled={disabled}
          className={`bg-purple-500 dark:bg-purple-500 text-white font-semibold py-3 md:py-4 px-2 md:px-4 rounded-xl md:rounded-2xl 
                     transition-all duration-200 shadow-xl focus:outline-none border-2
                     ${selectedDifficulty === 'good' 
                       ? 'ring-4 ring-yellow-400 border-yellow-400 scale-105' 
                       : 'border-purple-600 dark:border-purple-600'
                     }
                     ${disabled 
                       ? 'opacity-50 cursor-not-allowed' 
                       : 'hover:bg-purple-600 dark:hover:bg-purple-600 hover:shadow-2xl focus:ring-4 focus:ring-purple-500/50 hover:scale-105 active:scale-95'
                     }`}
          aria-label="Quase consolidado na mente - revisar em uma semana"
        >
          <div className="flex flex-col items-center justify-center gap-1 md:gap-2">
            <span className="material-symbols-outlined text-2xl md:text-3xl font-bold" style={{ display: 'block', lineHeight: 1 }}>trending_up</span>
            <span className="text-xs md:text-sm font-bold leading-tight text-center">Quase consolidado na mente...</span>
          </div>
        </button>

        {/* Fácil - Roxo escuro */}
        <button
          onClick={() => handleSelect('easy')}
          onMouseEnter={() => !disabled && setHoveredDifficulty('easy')}
          onMouseLeave={() => setHoveredDifficulty(null)}
          onTouchStart={() => !disabled && setHoveredDifficulty('easy')}
          disabled={disabled}
          className={`bg-purple-800 dark:bg-purple-900 text-white font-semibold py-3 md:py-4 px-2 md:px-4 rounded-xl md:rounded-2xl 
                     transition-all duration-200 shadow-xl focus:outline-none border-2
                     ${selectedDifficulty === 'easy' 
                       ? 'ring-4 ring-yellow-400 border-yellow-400 scale-105' 
                       : 'border-purple-900 dark:border-purple-950'
                     }
                     ${disabled 
                       ? 'opacity-50 cursor-not-allowed' 
                       : 'hover:bg-purple-900 dark:hover:bg-purple-950 hover:shadow-2xl focus:ring-4 focus:ring-purple-700/50 hover:scale-105 active:scale-95'
                     }`}
          aria-label="Acertei com confiança - revisar em várias semanas"
        >
          <div className="flex flex-col items-center justify-center gap-1 md:gap-2">
            <span className="material-symbols-outlined text-2xl md:text-3xl font-bold" style={{ display: 'block', lineHeight: 1 }}>check_circle</span>
            <span className="text-xs md:text-sm font-bold leading-tight text-center">Acertei com confiança!</span>
          </div>
        </button>
      </footer>

      {/* Modal de sugestão de exclusão */}
      {deleteInfo && (
        <DeleteSuggestionModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDelete}
          onKeep={handleKeep}
          consecutiveCount={deleteInfo.consecutiveCount}
          grade={deleteInfo.grade}
          scheduledDays={deleteInfo.scheduledDays}
        />
      )}
    </div>
  );
}
