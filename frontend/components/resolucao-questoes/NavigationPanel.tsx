'use client';

import { Question, QuestionListItem } from '@/types/resolucao-questoes';
import { useMemo, useRef, useState, useEffect } from 'react';

interface NavigationPanelProps {
  questions: Question[];
  currentQuestionId: string;
  showEnunciado: boolean;
  onToggleEnunciado: () => void;
  onQuestionClick: (indexOrId: number | string) => void;
  questionStates?: Map<string, 'correct' | 'incorrect' | 'unanswered' | 'answered'>;
}

export function NavigationPanel({
  questions,
  currentQuestionId,
  showEnunciado,
  onToggleEnunciado,
  onQuestionClick,
  questionStates,
}: NavigationPanelProps) {
  const ITEMS_PER_PAGE = 20;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  // Encontrar a página atual baseada na questão ativa
  const currentIndex = questions.findIndex(q => q?.id === currentQuestionId);
  const currentPage = Math.floor(currentIndex / ITEMS_PER_PAGE);
  const totalPages = Math.ceil(questions.length / ITEMS_PER_PAGE);
  
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
  
  // Questões da página atual
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, questions.length);
  const currentPageQuestions = questions.slice(startIndex, endIndex);

  const questionItems = useMemo(() => {
    return currentPageQuestions.map((q, idx): QuestionListItem & { index: number } => ({
      id: q?.id || `placeholder-${startIndex + idx}`,
      questionNumber: q?.questionNumber || 0,
      state: (questionStates?.get(q?.id) || 'unanswered') as 'correct' | 'incorrect' | 'unanswered' | 'answered',
      index: startIndex + idx, // Índice real na lista completa
    }));
  }, [currentPageQuestions, questionStates, startIndex]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let answered = 0;
    let unanswered = 0;
    
    questions.forEach(q => {
      const state = questionStates?.get(q?.id) || 'unanswered';
      if (state === 'correct') correct++;
      else if (state === 'incorrect') incorrect++;
      else if (state === 'answered') answered++;
      else unanswered++;
    });
    
    return { correct, incorrect, answered, unanswered, total: questions.length };
  }, [questions, questionStates]);

  const goToPage = (page: number) => {
    if (page < 0 || page >= totalPages) return;
    const firstQuestionIndex = page * ITEMS_PER_PAGE;
    // Usar índice diretamente para funcionar mesmo com placeholders
    onQuestionClick(firstQuestionIndex);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg dark:shadow-dark-xl p-4 xl:p-5 2xl:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
          Navegação
        </h3>
        {totalPages > 1 && (
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {startIndex + 1}-{endIndex} de {questions.length}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-4 p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
        <div className="flex items-center gap-2">
          {stats.correct > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-green-500"></div>
              <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {stats.correct}
              </span>
            </div>
          )}
          {stats.incorrect > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-red-500"></div>
              <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {stats.incorrect}
              </span>
            </div>
          )}
          {stats.answered > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-purple-500"></div>
              <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {stats.answered}
              </span>
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
          {stats.correct + stats.incorrect + stats.answered}/{stats.total}
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

      {/* Question Grid */}
      <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-2 xl:gap-3">
        {questionItems.map((item) => (
          <QuestionButton
            key={`${item.id}-${item.index}`}
            item={item}
            isActive={item.id === currentQuestionId}
            onClick={() => onQuestionClick(item.index)}
          />
        ))}
      </div>
    </div>
  );
}

interface QuestionButtonProps {
  item: QuestionListItem;
  isActive: boolean;
  onClick: () => void;
}

function QuestionButton({ item, isActive, onClick }: QuestionButtonProps) {
  const getButtonClass = () => {
    const baseClass = 'flex items-center justify-center w-9 h-9 xl:w-10 xl:h-10 2xl:w-11 2xl:h-11 rounded-md font-semibold transition-all border-2 bg-background-light dark:bg-background-dark text-sm xl:text-base';
    
    if (item.state === 'correct') {
      return `${baseClass} border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20`;
    }
    
    if (item.state === 'incorrect') {
      return `${baseClass} border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20`;
    }
    
    if (item.state === 'answered') {
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
      aria-label={`Questão ${item.questionNumber}`}
      aria-current={isActive ? 'true' : undefined}
    >
      {item.questionNumber}
    </button>
  );
}
