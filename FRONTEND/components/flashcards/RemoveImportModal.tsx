'use client';

import { useState } from 'react';

interface RemoveImportModalProps {
  isOpen: boolean;
  collectionName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function RemoveImportModal({
  isOpen,
  collectionName,
  onConfirm,
  onCancel,
}: RemoveImportModalProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsRemoving(true);
    try {
      await onConfirm();
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl dark:shadow-dark-2xl max-w-md w-full p-6 border border-border-light dark:border-border-dark">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl">
              folder_off
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Remover da biblioteca
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
              Deseja remover a coleção <strong className="text-slate-700 dark:text-slate-200">{collectionName}</strong> da sua biblioteca?
            </p>
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-lg p-3">
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Você pode importar novamente esta coleção a qualquer momento pela aba Comunidade.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            disabled={isRemoving}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 
                     bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark 
                     rounded-lg hover:bg-background-light dark:hover:bg-background-dark 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isRemoving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 
                     rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            {isRemoving ? (
              <>
                <span className="animate-spin material-symbols-outlined text-base">
                  progress_activity
                </span>
                Removendo...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">folder_off</span>
                Remover
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
