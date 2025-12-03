'use client';

import { useState, useMemo } from 'react';
import { MentorProgram } from '@/lib/services/mentorProgramService';
import { ProgramCard } from './ProgramCard';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface ProgramGridProps {
  programs: MentorProgram[];
  onAction?: (programId: string, action: 'submit' | 'activate' | 'close' | 'delete') => Promise<void>;
  showActions?: boolean;
  variant?: 'mentor' | 'public';
  itemsPerPage?: number;
  emptyState?: React.ReactNode;
}

export function ProgramGrid({ 
  programs, 
  onAction, 
  showActions = true, 
  variant = 'mentor',
  itemsPerPage = 6,
  emptyState
}: ProgramGridProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(programs.length / itemsPerPage);
  
  const paginatedPrograms = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return programs.slice(startIndex, startIndex + itemsPerPage);
  }, [programs, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Reset to page 1 when programs change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [programs.length, totalPages, currentPage]);

  if (programs.length === 0) {
    return emptyState || null;
  }

  return (
    <div className="space-y-6">
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedPrograms.map((program, index) => (
          <div
            key={program.id}
            className="animate-fadeIn"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ProgramCard
              program={program}
              onAction={onAction}
              showActions={showActions}
              variant={variant}
            />
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {/* First Page */}
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-border-light dark:border-border-dark
              text-text-light-secondary dark:text-text-dark-secondary
              hover:bg-surface-light dark:hover:bg-surface-dark hover:text-primary
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
              transition-all duration-200"
            aria-label="Primeira página"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-border-light dark:border-border-dark
              text-text-light-secondary dark:text-text-dark-secondary
              hover:bg-surface-light dark:hover:bg-surface-dark hover:text-primary
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
              transition-all duration-200"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {generatePageNumbers(currentPage, totalPages).map((page, index) => (
              page === '...' ? (
                <span 
                  key={`ellipsis-${index}`}
                  className="px-2 text-text-light-secondary dark:text-text-dark-secondary"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => goToPage(page as number)}
                  className={`min-w-[36px] h-9 px-3 rounded-lg font-medium text-sm
                    transition-all duration-200
                    ${currentPage === page 
                      ? 'bg-primary text-white shadow-md shadow-primary/30' 
                      : 'border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark hover:text-primary'
                    }`}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          {/* Next Page */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-border-light dark:border-border-dark
              text-text-light-secondary dark:text-text-dark-secondary
              hover:bg-surface-light dark:hover:bg-surface-dark hover:text-primary
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
              transition-all duration-200"
            aria-label="Próxima página"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-border-light dark:border-border-dark
              text-text-light-secondary dark:text-text-dark-secondary
              hover:bg-surface-light dark:hover:bg-surface-dark hover:text-primary
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
              transition-all duration-200"
            aria-label="Última página"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Info */}
      {totalPages > 1 && (
        <p className="text-center text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, programs.length)} de {programs.length} programas
        </p>
      )}
    </div>
  );
}

// Helper function to generate page numbers with ellipsis
function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];
  
  // Always show first page
  pages.push(1);
  
  if (current > 3) {
    pages.push('...');
  }
  
  // Show pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  
  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }
  
  if (current < total - 2) {
    pages.push('...');
  }
  
  // Always show last page
  if (!pages.includes(total)) {
    pages.push(total);
  }
  
  return pages;
}

// Skeleton for loading state
export function ProgramGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-surface-light dark:bg-surface-dark rounded-2xl 
            border border-border-light dark:border-border-dark
            min-h-[420px] overflow-hidden animate-pulse"
        >
          {/* Thumbnail skeleton */}
          <div className="h-40 bg-slate-200 dark:bg-slate-700" />
          
          {/* Content skeleton */}
          <div className="p-5 space-y-4">
            <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
            
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            </div>
            
            <div className="pt-4 border-t border-border-light dark:border-border-dark">
              <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
