'use client';

import { useState, useRef, useEffect } from 'react';

interface ErrorNotebookItemMenuProps {
  itemType: 'folder' | 'entry';
  onEdit: () => void;
  onDelete: () => void;
  onMove?: () => void;
  onReview?: () => void;
}

export function ErrorNotebookItemMenu({
  itemType,
  onEdit,
  onDelete,
  onMove,
  onReview,
}: ErrorNotebookItemMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMenuClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-all hover:scale-110 active:scale-95"
        aria-label="Menu de ações"
      >
        <span className="material-symbols-outlined text-xl text-text-light-secondary dark:text-text-dark-secondary">
          more_vert
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl dark:shadow-dark-xl border border-border-light dark:border-border-dark z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {itemType === 'entry' && onReview && (
            <button
              onClick={(e) => handleMenuClick(e, onReview)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-xl text-primary">
                visibility
              </span>
              <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                Revisar
              </span>
            </button>
          )}

          <button
            onClick={(e) => handleMenuClick(e, onEdit)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-light dark:hover:bg-background-dark transition-colors"
          >
            <span className="material-symbols-outlined text-xl text-text-light-secondary dark:text-text-dark-secondary">
              edit
            </span>
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Editar
            </span>
          </button>

          {onMove && (
            <button
              onClick={(e) => handleMenuClick(e, onMove)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            >
              <span className="material-symbols-outlined text-xl text-text-light-secondary dark:text-text-dark-secondary">
                drive_file_move
              </span>
              <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                Mover
              </span>
            </button>
          )}

          <div className="border-t border-border-light dark:border-border-dark" />

          <button
            onClick={(e) => handleMenuClick(e, onDelete)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <span className="material-symbols-outlined text-xl text-red-600 dark:text-red-400">
              delete
            </span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              Excluir
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
