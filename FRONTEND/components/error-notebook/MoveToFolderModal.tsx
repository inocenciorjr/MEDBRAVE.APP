'use client';

import { useState, useEffect } from 'react';
import { useErrorNotebookFolders } from '@/hooks/useErrorNotebookFolders';

interface MoveToFolderModalProps {
  isOpen: boolean;
  itemType: 'folder' | 'entry';
  itemName: string;
  currentFolderId?: string | null;
  onClose: () => void;
  onMove: (folderId: string | null) => Promise<void>;
  isMoving: boolean;
}

export function MoveToFolderModal({
  isOpen,
  itemType,
  itemName,
  currentFolderId,
  onClose,
  onMove,
  isMoving,
}: MoveToFolderModalProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(currentFolderId || null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const { folders, loading: loadingFolders } = useErrorNotebookFolders();

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setSelectedFolder(currentFolderId || null);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentFolderId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isMoving) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isMoving, onClose]);

  const handleMove = async () => {
    await onMove(selectedFolder);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={!isMoving ? onClose : undefined}
    >
      <div
        className={`bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <span className="material-symbols-outlined text-2xl text-primary">
                drive_file_move
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Mover {itemType === 'folder' ? 'Pasta' : 'Caderno'}
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Selecione o destino
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2">
              Movendo: <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">{itemName}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              Pasta de destino
            </label>
            <select
              value={selectedFolder || ''}
              onChange={(e) => setSelectedFolder(e.target.value || null)}
              disabled={isMoving || loadingFolders}
              className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
            >
              <option value="">Sem pasta (Raiz)</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {selectedFolder === currentFolderId && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Este item já está nesta pasta
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border-light dark:border-border-dark">
          <button
            onClick={onClose}
            disabled={isMoving}
            className="px-4 py-2 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleMove}
            disabled={isMoving || selectedFolder === currentFolderId}
            className="px-6 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isMoving ? 'Movendo...' : 'Mover'}
          </button>
        </div>
      </div>
    </div>
  );
}
