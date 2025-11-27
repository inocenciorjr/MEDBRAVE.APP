'use client';

import { ErrorNotebookEntry } from '@/services/errorNotebookService';
import { useMemo, useRef, useState, useEffect } from 'react';

interface ErrorNotebookNavigationPanelProps {
  entries: ErrorNotebookEntry[];
  currentEntryId: string;
  onEntryClick: (index: number) => void;
  entryStates?: Map<string, 'reviewed' | 'pending' | 'again' | 'hard' | 'good' | 'easy'>;
}

export function ErrorNotebookNavigationPanel({
  entries,
  currentEntryId,
  onEntryClick,
  entryStates,
}: ErrorNotebookNavigationPanelProps) {
  const ITEMS_PER_PAGE = 20;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  // Encontrar a página atual baseada na entrada ativa
  const currentIndex = entries.findIndex(e => e?.id === currentEntryId);
  const currentPage = Math.floor(currentIndex / ITEMS_PER_PAGE);
  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
  
  // Verificar se pode rolar
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const hasOverflow = container.scrollWidth > container.clientWidth;
    
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      hasOverflow && container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };
  
  useEffect(() => {
    // Aguardar renderização completa antes de verificar scroll
    const timer = setTimeout(() => {
      checkScroll();
    }, 100);
    
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        clearTimeout(timer);
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
    
    return () => clearTimeout(timer);
  }, [totalPages]);
  
  // Scroll horizontal
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };
  
  // Entradas da página atual
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, entries.length);
  const currentPageEntries = entries.slice(startIndex, endIndex);

  const entryItems = useMemo(() => {
    return currentPageEntries.map((e, idx) => ({
      id: e?.id || `placeholder-${startIndex + idx}`,
      entryNumber: startIndex + idx + 1,
      state: (entryStates?.get(e?.id) || 'pending') as 'reviewed' | 'pending' | 'again' | 'hard' | 'good' | 'easy',
      index: startIndex + idx, // Índice real na lista completa
    }));
  }, [currentPageEntries, entryStates, startIndex]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    let again = 0;
    let hard = 0;
    let good = 0;
    let easy = 0;
    let pending = 0;
    
    entries.forEach(e => {
      const state = entryStates?.get(e?.id) || 'pending';
      if (state === 'again') again++;
      else if (state === 'hard') hard++;
      else if (state === 'good') good++;
      else if (state === 'easy') easy++;
      else pending++;
    });
    
    const reviewed = again + hard + good + easy;
    return { again, hard, good, easy, pending, reviewed, total: entries.length };
  }, [entries, entryStates]);

  const goToPage = (page: number) => {
    if (page < 0 || page >= totalPages) return;
    const firstEntryIndex = page * ITEMS_PER_PAGE;
    onEntryClick(firstEntryIndex);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg dark:shadow-dark-xl p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
          Navegação
        </h3>
        {totalPages > 1 && (
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {startIndex + 1}-{endIndex} de {entries.length}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-4 p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
        <div className="flex items-center gap-2 flex-wrap">
          {stats.again > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-red-600"></div>
              <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {stats.again}
              </span>
            </div>
          )}
          {stats.hard > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-gray-600"></div>
              <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {stats.hard}
              </span>
            </div>
          )}
          {stats.good > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-purple-500"></div>
              <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {stats.good}
              </span>
            </div>
          )}
          {stats.easy > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-purple-800"></div>
              <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {stats.easy}
              </span>
            </div>
          )}
          {stats.pending > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-gray-400"></div>
              <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {stats.pending}
              </span>
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
          {stats.reviewed}/{stats.total}
        </span>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center mb-4 gap-2">
          {/* Seta esquerda para scroll */}
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-border-light dark:bg-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Rolar para esquerda"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          
          {/* Container com scroll horizontal */}
          <div 
            ref={scrollContainerRef}
            className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar"
          >
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  className={`flex-shrink-0 w-7 h-7 rounded-md text-xs font-medium transition-all border ${
                    i === currentPage
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 hover:border-primary/30'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Seta direita para scroll */}
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-border-light dark:bg-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Rolar para direita"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      )}

      {/* Entry Grid */}
      <div className="grid grid-cols-5 gap-3">
        {entryItems.map((item) => (
          <EntryButton
            key={`${item.id}-${item.index}`}
            item={item}
            isActive={item.id === currentEntryId}
            onClick={() => onEntryClick(item.index)}
          />
        ))}
      </div>
    </div>
  );
}

interface EntryButtonProps {
  item: {
    id: string;
    entryNumber: number;
    state: 'reviewed' | 'pending' | 'again' | 'hard' | 'good' | 'easy';
    index: number;
  };
  isActive: boolean;
  onClick: () => void;
}

function EntryButton({ item, isActive, onClick }: EntryButtonProps) {
  const getButtonClass = () => {
    const baseClass = 'flex items-center justify-center w-10 h-10 rounded-md font-semibold transition-all border-2 bg-background-light dark:bg-background-dark';
    
    // Cores baseadas na avaliação (igual aos botões de dificuldade)
    if (item.state === 'again') {
      return `${baseClass} border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20`;
    }
    if (item.state === 'hard') {
      return `${baseClass} border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950/20`;
    }
    if (item.state === 'good') {
      return `${baseClass} border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20`;
    }
    if (item.state === 'easy') {
      return `${baseClass} border-purple-800 text-purple-800 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20`;
    }
    if (item.state === 'reviewed') {
      return `${baseClass} border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20`;
    }
    
    return `${baseClass} border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary shadow-sm hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 hover:border-primary/50 hover:shadow-md`;
  };

  return (
    <button
      onClick={onClick}
      className={`${getButtonClass()} ${
        isActive ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-surface-dark scale-105' : ''
      }`}
      aria-label={`Entrada ${item.entryNumber}`}
      aria-current={isActive ? 'true' : undefined}
    >
      {item.entryNumber}
    </button>
  );
}
