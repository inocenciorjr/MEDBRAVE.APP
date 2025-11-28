'use client';

import { useState } from 'react';

interface MobileNotebookCardProps {
  id: string;
  name: string;
  type: 'folder' | 'entry';
  created_at: string;
  question_subject?: string;
  difficulty?: string;
  year?: number;
  institution?: string;
  exam_type?: string;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
  onReview?: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function MobileNotebookCard({
  name,
  type,
  created_at,
  question_subject,
  difficulty,
  year,
  institution,
  exam_type,
  onClick,
  onEdit,
  onDelete,
  onMove,
  onReview,
  isSelected,
  onToggleSelect,
}: MobileNotebookCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDifficultyLabel = (diff?: string) => {
    switch (diff) {
      case 'EASY': return 'Fácil';
      case 'MEDIUM': return 'Média';
      case 'HARD': return 'Difícil';
      case 'VERY_HARD': return 'Muito Difícil';
      default: return diff || '-';
    }
  };

  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'EASY': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'MEDIUM': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'HARD': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'VERY_HARD': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-md border border-border-light dark:border-border-dark overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {/* Checkbox for entries */}
        {type === 'entry' && onToggleSelect && (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-5 h-5 rounded border-2 border-border-light dark:border-border-dark text-primary focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-xl">
            {type === 'folder' ? 'folder_open' : 'book'}
          </span>
        </div>
        
        <div className="flex-1 min-w-0" onClick={onClick}>
          <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary line-clamp-2 mb-1">
            {name}
          </h3>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {formatDate(created_at)}
          </p>
        </div>

        {/* Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors"
        >
          <span className="material-symbols-outlined text-xl">more_vert</span>
        </button>
      </div>

      {/* Info Section - Only for entries */}
      {type === 'entry' && (
        <div className="px-4 pb-4 space-y-2">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {difficulty && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(difficulty)}`}>
                {getDifficultyLabel(difficulty)}
              </span>
            )}
            {exam_type && exam_type !== '-' && (
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-primary/10 dark:bg-primary/20 text-primary">
                {exam_type}
              </span>
            )}
          </div>

          {/* Institution and Year */}
          <div className="flex items-center gap-3 text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {institution && institution !== '-' && (
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">school</span>
                <span className="truncate max-w-[150px]">{institution}</span>
              </div>
            )}
            {year && (
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                <span>{year}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Menu Dropdown */}
      {showMenu && (
        <div className="border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
          {onReview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReview();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">visibility</span>
              Revisar
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setShowMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Editar
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMove();
              setShowMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">drive_file_move</span>
            Mover
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setShowMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors flex items-center gap-2 text-red-600 dark:text-red-400"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}
