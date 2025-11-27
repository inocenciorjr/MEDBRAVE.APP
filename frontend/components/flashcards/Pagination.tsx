'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-center items-center mt-8 text-sm text-text-light-secondary dark:text-text-dark-secondary gap-4">
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          « Anterior
        </button>

        <div className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-full shadow-lg font-semibold">
          {currentPage}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Próxima página"
        >
          Próximo »
        </button>
      </div>
    </div>
  );
}
