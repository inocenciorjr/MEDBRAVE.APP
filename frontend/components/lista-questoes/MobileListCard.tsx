'use client';

import { useState } from 'react';

interface ListStats {
  answered: number;
  correct: number;
  incorrect: number;
  total: number;
}

interface MobileListCardProps {
  id: string;
  name: string;
  type: 'folder' | 'list' | 'simulado';
  created_at: string;
  question_count?: number;
  stats?: ListStats;
  userResult?: {
    status: 'in_progress' | 'completed' | 'abandoned';
    score: number;
    correct_count: number;
    incorrect_count: number;
    total_questions: number;
  };
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onDuplicateErrors?: () => void;
  onCreateSimulated?: () => void;
}

export function MobileListCard({
  name,
  type,
  created_at,
  question_count,
  stats,
  userResult,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onDuplicateErrors,
  onCreateSimulated,
}: MobileListCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getIcon = () => {
    if (type === 'folder') return 'folder_open';
    if (type === 'simulado') return 'schedule';
    return 'article';
  };

  const getTypeLabel = () => {
    if (type === 'folder') return 'Pasta';
    if (type === 'simulado') return 'Simulado';
    return 'Lista';
  };

  const getProgressPercentage = () => {
    if (type === 'list' && stats && stats.total > 0) {
      return Math.round((stats.answered / stats.total) * 100);
    }
    if (type === 'simulado' && userResult) {
      return Math.round((userResult.score || 0) * 100);
    }
    return 0;
  };

  const getStatusColor = () => {
    if (type === 'simulado') {
      if (userResult?.status === 'completed') return 'text-green-600 dark:text-green-400';
      if (userResult?.status === 'in_progress') return 'text-yellow-600 dark:text-yellow-400';
      return 'text-gray-600 dark:text-gray-400';
    }
    
    const percentage = getProgressPercentage();
    if (percentage === 100) return 'text-green-600 dark:text-green-400';
    if (percentage > 0) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-md border border-border-light dark:border-border-dark overflow-hidden">
      {/* Header com ícone, nome e menu */}
      <div className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-xl">
            {getIcon()}
          </span>
        </div>
        
        <div className="flex-1 min-w-0" onClick={onClick}>
          <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate mb-1">
            {name}
          </h3>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            Criado em {formatDate(created_at)}
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

      {/* Stats Section - Only for lists and simulados */}
      {type !== 'folder' && (
        <div className="px-4 pb-4 space-y-3">
          {/* Progress Bar */}
          {(stats || userResult) && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">
                  Progresso
                </span>
                <span className={`font-semibold ${getStatusColor()}`}>
                  {getProgressPercentage()}%
                </span>
              </div>
              <div className="w-full h-2 bg-background-light dark:bg-background-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-background-light dark:bg-background-dark rounded-lg p-2 text-center">
              <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
                Questões
              </div>
              <div className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
                {question_count || userResult?.total_questions || 0}
              </div>
            </div>
            
            <div className="bg-background-light dark:bg-background-dark rounded-lg p-2 text-center">
              <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
                Acertos
              </div>
              <div className="text-base font-semibold text-green-600 dark:text-green-400">
                {stats?.correct || userResult?.correct_count || 0}
              </div>
            </div>
            
            <div className="bg-background-light dark:bg-background-dark rounded-lg p-2 text-center">
              <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
                Erros
              </div>
              <div className="text-base font-semibold text-red-600 dark:text-red-400">
                {stats?.incorrect || userResult?.incorrect_count || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Dropdown */}
      {showMenu && (
        <div className="border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
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
          
          {onDuplicate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">content_copy</span>
              Duplicar
            </button>
          )}
          
          {onDuplicateErrors && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateErrors();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">error</span>
              Duplicar Erros
            </button>
          )}
          
          {onCreateSimulated && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSimulated();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">schedule</span>
              Criar Simulado
            </button>
          )}
          
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
