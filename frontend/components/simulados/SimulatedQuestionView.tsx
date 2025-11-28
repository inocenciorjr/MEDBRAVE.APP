'use client';

import { Question } from '@/types/resolucao-questoes';

interface SimulatedQuestionViewProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAlternative?: string;
  onAnswerSelect: (alternativeId: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function SimulatedQuestionView({
  question,
  questionNumber,
  totalQuestions,
  selectedAlternative,
  onAnswerSelect,
  onNext,
  onPrevious,
}: SimulatedQuestionViewProps) {
  return (
    <div className="min-w-[280px] sm:min-w-[600px] bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl dark:shadow-dark-xl p-4 md:p-6 lg:p-8">
      {/* Cabeçalho da Questão - Modo Simulado (apenas ano e universidade) */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-base md:text-lg">
              {questionNumber}
            </span>
          </div>
          <div>
            <p className="text-xs md:text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Questão {questionNumber} de {totalQuestions}
            </p>
            <p className="text-[10px] md:text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
              {question.year} • {question.institution}
            </p>
          </div>
        </div>
      </div>

      {/* Enunciado */}
      <div 
        className="prose prose-sm md:prose dark:prose-invert max-w-none mb-4 md:mb-8 text-slate-700 dark:text-slate-200"
        dangerouslySetInnerHTML={{ __html: question.text }}
      />

      {/* Alternativas */}
      <div className="space-y-2 md:space-y-3 mb-4 md:mb-8">
        {question.alternatives.map((alt) => {
          const isSelected = selectedAlternative === alt.id;
          
          return (
            <button
              key={alt.id}
              onClick={() => onAnswerSelect(alt.id)}
              className={`w-full text-left p-3 md:p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border-light dark:border-border-dark hover:border-primary/50 hover:bg-background-light dark:hover:bg-background-dark'
              }`}
            >
              <div className="flex items-start gap-2 md:gap-3">
                <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-border-light dark:border-border-dark'
                }`}>
                  {isSelected && (
                    <span className="material-symbols-outlined text-white text-xs md:text-sm">
                      check
                    </span>
                  )}
                </div>
                <div 
                  className="flex-1 text-sm md:text-base text-slate-700 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: alt.text }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Navegação */}
      <div className="flex justify-between gap-2">
        <button
          onClick={onPrevious}
          disabled={questionNumber === 1}
          className="px-3 md:px-6 py-2 md:py-3 border-2 border-border-light dark:border-border-dark rounded-lg font-medium text-sm md:text-base text-slate-700 dark:text-slate-200 hover:bg-surface-light dark:hover:bg-surface-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 md:gap-2"
        >
          <span className="material-symbols-outlined text-lg md:text-xl">arrow_back</span>
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <button
          onClick={onNext}
          disabled={questionNumber === totalQuestions}
          className="px-3 md:px-6 py-2 md:py-3 bg-primary text-white rounded-lg font-medium text-sm md:text-base hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 md:gap-2 shadow-lg"
        >
          <span className="hidden sm:inline">Próxima</span>
          <span className="material-symbols-outlined text-lg md:text-xl">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
