'use client';

import { QuestionList } from '@/types/banco-questoes';

interface ListCardProps {
  list: QuestionList;
}

export default function ListCard({ list }: ListCardProps) {
  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-xl dark:shadow-dark-xl hover:shadow-2xl dark:hover:shadow-dark-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-text-light-primary dark:text-text-dark-primary mb-1">
            {list.name}
          </h3>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            Atualizado em {list.updatedAt.toLocaleDateString('pt-BR')}
          </p>
        </div>
        <button className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-colors">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>

      {/* Tags */}
      {list.tags.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {list.tags.map((tag) => (
            <span
              key={tag.id}
              className={`text-xs font-medium ${tag.color} px-2 py-1 rounded-full`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Progress */}
      <div className="flex justify-between items-center text-sm mb-2">
        <div className="text-text-light-secondary dark:text-text-dark-secondary">
          Progresso:
        </div>
        <div className="font-bold text-text-light-primary dark:text-text-dark-primary">
          {list.progress}%
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-4">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${list.progress}%` }}
        ></div>
      </div>

      {/* Footer */}
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary">
          <span className="material-symbols-outlined text-base text-primary">
            quiz
          </span>
          Questões: <span>{list.totalQuestions}</span>
        </div>
        <div className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary">
          <span className="material-symbols-outlined text-base text-primary">
            calendar_today
          </span>
          Anos: <span>{list.years.length}</span>
        </div>
      </div>
    </div>
  );
}
