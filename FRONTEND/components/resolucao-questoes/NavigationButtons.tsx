'use client';

interface NavigationButtonsProps {
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function NavigationButtons({
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: NavigationButtonsProps) {
  return (
    <div className="flex justify-between items-center">
      <button
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-surface-dark ${
          canGoPrevious
            ? 'bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 border border-border-light dark:border-border-dark'
            : 'bg-border-light dark:bg-border-dark text-text-light-secondary dark:text-text-dark-secondary cursor-not-allowed opacity-50'
        }`}
        aria-label="Questão anterior"
      >
        Anterior
      </button>

      <button
        onClick={onNext}
        disabled={!canGoNext}
        className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-surface-dark ${
          canGoNext
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'bg-border-light dark:bg-border-dark text-text-light-secondary dark:text-text-dark-secondary cursor-not-allowed opacity-50'
        }`}
        aria-label="Próxima questão"
      >
        Próxima
      </button>
    </div>
  );
}
