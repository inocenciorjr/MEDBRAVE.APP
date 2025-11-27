'use client';

import { useState, useRef, useEffect } from 'react';

interface ExamMenuProps {
  onViewQuestions: () => void;
  onCreateList: () => void;
  onCreateSimulated: () => void;
}

export default function ExamMenu({ onViewQuestions, onCreateList, onCreateSimulated }: ExamMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className={`
            relative p-2 rounded-lg border-2 transition-all duration-200 ease-out
            flex items-center justify-center shadow-sm hover:shadow-md
            ${isOpen
              ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-4 ring-primary/20 shadow-lg shadow-primary/10'
              : 'border-border-light dark:border-border-dark hover:border-primary/60 hover:shadow-primary/5'
            }
            bg-surface-light dark:bg-surface-dark cursor-pointer hover:bg-background-light dark:hover:bg-background-dark
            focus:outline-none focus:ring-4 focus:ring-primary/20
          `}
        >
          <span className={`material-symbols-outlined text-lg transition-colors duration-200 ${
            isOpen ? 'text-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'
          }`}>
            more_vert
          </span>
        </button>

        {isOpen && (
          <div
            className="absolute z-50 w-56 mt-3 py-2 right-0 bg-surface-light dark:bg-surface-dark
                       border-2 border-primary/20 rounded-xl shadow-2xl dark:shadow-dark-xl
                       max-h-72 overflow-auto animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 backdrop-blur-sm"
            style={{
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(139, 92, 246, 0.1)'
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(onViewQuestions);
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium transition-all duration-150
                         flex items-center gap-3 group/item rounded-t-lg
                         text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-surface-dark 
                         hover:pl-6 border-l-4 border-transparent hover:border-primary/30"
            >
              <span className="material-symbols-outlined text-primary">visibility</span>
              <span className="flex-1">Visualizar Questões</span>
              <svg className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 flex-shrink-0"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(onCreateList);
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium transition-all duration-150
                         flex items-center gap-3 group/item
                         text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-surface-dark 
                         hover:pl-6 border-l-4 border-transparent hover:border-primary/30"
            >
              <span className="material-symbols-outlined text-primary">playlist_add</span>
              <span className="flex-1">Criar Lista</span>
              <svg className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 flex-shrink-0"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(onCreateSimulated);
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium transition-all duration-150
                         flex items-center gap-3 group/item rounded-b-lg
                         text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-surface-dark 
                         hover:pl-6 border-l-4 border-transparent hover:border-primary/30"
            >
              <span className="material-symbols-outlined text-primary">schedule</span>
              <span className="flex-1">Criar Simulado</span>
              <svg className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 flex-shrink-0"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
