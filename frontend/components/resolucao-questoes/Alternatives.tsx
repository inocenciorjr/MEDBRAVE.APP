'use client';

import { Alternative } from '@/types/resolucao-questoes';
import { memo, useState } from 'react';

interface AlternativesProps {
  alternatives: Alternative[];
  selectedAlternative: string | null;
  isAnswered: boolean;
  correctAlternative: string;
  onSelect: (alternativeId: string) => void;
}

export function Alternatives({
  alternatives,
  selectedAlternative,
  isAnswered,
  correctAlternative,
  onSelect,
}: AlternativesProps) {
  const [strikethroughStates, setStrikethroughStates] = useState<Record<string, boolean>>({});

  const toggleStrikethrough = (alternativeId: string) => {
    setStrikethroughStates(prev => ({
      ...prev,
      [alternativeId]: !prev[alternativeId]
    }));
  };

  return (
    <div className="mt-6 md:mt-8 space-y-3 md:space-y-4">
      {alternatives.map((alternative) => (
        <AlternativeItem
          key={alternative.id}
          alternative={alternative}
          isSelected={selectedAlternative === alternative.id}
          isAnswered={isAnswered}
          isCorrect={alternative.id === correctAlternative}
          isStrikethrough={strikethroughStates[alternative.id] || false}
          onSelect={() => onSelect(alternative.id)}
          onToggleStrikethrough={() => toggleStrikethrough(alternative.id)}
        />
      ))}
    </div>
  );
}

interface AlternativeItemProps {
  alternative: Alternative;
  isSelected: boolean;
  isAnswered: boolean;
  isCorrect: boolean;
  isStrikethrough: boolean;
  onSelect: () => void;
  onToggleStrikethrough: () => void;
}

const AlternativeItem = memo(function AlternativeItem({
  alternative,
  isSelected,
  isAnswered,
  isCorrect,
  isStrikethrough,
  onSelect,
  onToggleStrikethrough,
}: AlternativeItemProps) {
  const getAlternativeClass = () => {
    if (!isAnswered) {
      // Se está selecionada mas ainda não confirmou, destaca com a cor primária (roxo)
      if (isSelected) {
        return 'bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-primary/50 hover:bg-purple-100 dark:hover:bg-purple-900/30 shadow-md hover:shadow-lg';
      }
      return 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 hover:border-primary/30 dark:hover:border-primary/30 shadow-sm hover:shadow-md';
    }
    
    if (isCorrect) {
      return 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-500/50 shadow-md';
    }
    
    if (isSelected && !isCorrect) {
      return 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-500/50 shadow-md';
    }
    
    return 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm';
  };

  const getLetterClass = () => {
    if (!isAnswered) {
      // Se está selecionada mas ainda não confirmou, destaca a letra com a cor primária (roxo)
      if (isSelected) {
        return 'bg-primary text-white';
      }
      return 'bg-border-light dark:bg-border-dark text-text-light-primary dark:text-text-dark-primary';
    }
    
    if (isCorrect) {
      return 'bg-green-500 text-white';
    }
    
    if (isSelected && !isCorrect) {
      return 'bg-red-500 text-white';
    }
    
    return 'bg-border-light dark:bg-border-dark text-text-light-primary dark:text-text-dark-primary';
  };

  const getTextClass = () => {
    if (!isAnswered) {
      return 'text-text-light-primary dark:text-text-dark-primary';
    }
    
    if (isCorrect) {
      return 'text-green-800 dark:text-green-200';
    }
    
    if (isSelected && !isCorrect) {
      return 'text-red-800 dark:text-red-200';
    }
    
    return 'text-text-light-primary dark:text-text-dark-primary';
  };

  return (
    <div className="relative group" suppressHydrationWarning>
      <div
        onClick={!isAnswered ? onSelect : undefined}
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between w-full p-3 md:p-4 rounded-lg shadow-sm transition-all ${getAlternativeClass()} ${
          !isAnswered ? 'cursor-pointer' : 'cursor-default'
        }`}
        role="button"
        tabIndex={!isAnswered ? 0 : -1}
        onKeyDown={(e) => {
          if (!isAnswered && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onSelect();
          }
        }}
        aria-label={`Alternativa ${alternative.letter}: ${alternative.text}`}
        suppressHydrationWarning
      >
        <div className="flex items-start sm:items-center gap-3 md:gap-4 flex-1 min-w-0">
          {/* Letter Badge */}
          <div
            className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full font-bold transition-colors flex-shrink-0 text-sm md:text-base ${getLetterClass()}`}
          >
            {isAnswered && isCorrect ? (
              <span className="material-symbols-outlined text-base md:text-lg">check</span>
            ) : isAnswered && isSelected && !isCorrect ? (
              <span className="material-symbols-outlined text-base md:text-lg">close</span>
            ) : (
              alternative.letter
            )}
          </div>

          {/* Alternative Text */}
          <div 
            className={`text-left flex-1 text-sm md:text-base ${getTextClass()} ${isStrikethrough ? 'line-through opacity-50' : ''}
              prose prose-sm dark:prose-invert max-w-none
              [&_p]:m-0 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:inline [&_img]:max-h-20`}
            dangerouslySetInnerHTML={{ __html: alternative.text }}
          />
        </div>

        {/* Icons Container - Scissors and Percentage */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-4 flex-shrink-0 justify-end sm:justify-start">
          {/* Scissors Button */}
          {!isAnswered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStrikethrough();
              }}
              className={`p-1.5 md:p-2 rounded-lg transition-all ${
                isStrikethrough
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
              }`}
              aria-label={isStrikethrough ? 'Remover risco' : 'Riscar alternativa'}
              title={isStrikethrough ? 'Remover risco' : 'Riscar alternativa'}
            >
              <span className="material-symbols-outlined text-base md:text-lg" style={{ transform: 'scaleX(-1)' }}>
                cut
              </span>
            </button>
          )}
          
          {/* Percentage Badge - Only show after answered */}
          {isAnswered && alternative.percentage !== undefined && (
            <span 
              className="text-xs md:text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary bg-border-light dark:bg-border-dark px-2 md:px-3 py-1 rounded-full cursor-help whitespace-nowrap"
              title="Porcentagem de respostas nesta alternativa"
              suppressHydrationWarning
            >
              {alternative.percentage}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
