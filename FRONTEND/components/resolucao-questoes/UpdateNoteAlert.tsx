'use client';

import { useState } from 'react';

interface UpdateNote {
  id: string;
  title: string;
  content: string;
  last_updated_date: string;
}

interface UpdateNoteAlertProps {
  note: UpdateNote;
}

export function UpdateNoteAlert({ note }: UpdateNoteAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-6">
      <div className="flex items-start">
        <span className="material-symbols-outlined mr-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0">
          warning
        </span>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <p className="font-bold text-yellow-800 dark:text-yellow-200">
              {note.title}
            </p>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors ml-2"
              aria-label={isExpanded ? 'Recolher' : 'Expandir'}
            >
              <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">
                {isExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
          
          {isExpanded && (
            <div className="mt-2 text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
              {note.content}
            </div>
          )}
          
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-3">
            Última Atualização em {formatDate(note.last_updated_date)}
          </p>
        </div>
      </div>
    </div>
  );
}
