'use client';

import { OfficialExam } from '@/types/official-exams';

interface ExamCardProps {
  exam: OfficialExam;
  onMenuClick: (exam: OfficialExam, buttonElement: HTMLButtonElement) => void;
  isMenuOpen: boolean;
}

export default function ExamCard({ exam, onMenuClick, isMenuOpen }: ExamCardProps) {
  const questionCount = exam.questionIds?.length || 0;

  return (
    <div className={`relative bg-background-light dark:bg-background-dark p-4 rounded-lg 
                    shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl 
                    border-2 border-border-light dark:border-border-dark 
                    hover:border-primary/50 dark:hover:border-primary/50
                    transition-all duration-300 group
                    ${!isMenuOpen ? 'hover:scale-[1.02] hover:-translate-y-0.5' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary 
                        group-hover:text-primary transition-colors duration-200 
                        mb-1 break-words">
            {exam.title}
          </p>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xs text-primary">
              quiz
            </span>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary font-medium">
              {questionCount} questões
            </p>
          </div>
        </div>

        {/* Menu Button - Estilo igual aos dropdowns de filtro */}
        <div className="flex-shrink-0 relative inline-block">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick(exam, e.currentTarget);
            }}
            className={`
              relative p-2 rounded-xl border-2 transition-all duration-200 ease-out
              flex items-center justify-center shadow-sm hover:shadow-md group/btn
              ${isMenuOpen
                ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-4 ring-primary/20 shadow-lg shadow-primary/10'
                : 'border-border-light dark:border-border-dark hover:border-primary/60 hover:shadow-primary/5'
              }
              bg-surface-light dark:bg-surface-dark cursor-pointer hover:bg-background-light dark:hover:bg-background-dark
              focus:outline-none focus:ring-4 focus:ring-primary/20
            `}
          >
            {/* Ícone de seta */}
            <div className={`
              flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center
              transition-all duration-200
              ${isMenuOpen
                ? 'bg-primary text-white rotate-180 scale-110'
                : 'bg-background-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary group-hover/btn:bg-primary/10 group-hover/btn:text-primary'
              }
            `}>
              <svg className="w-3.5 h-3.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
