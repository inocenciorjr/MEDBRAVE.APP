'use client';

import { useState } from 'react';

interface DeleteCollectionModalProps {
  isOpen: boolean;
  collectionName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteCollectionModal({
  isOpen,
  collectionName,
  onConfirm,
  onCancel,
}: DeleteCollectionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setDeletionStatus('Removendo coleção do banco de dados...');
    
    try {
      await onConfirm();
      // Sucesso - o toast será mostrado pelo CollectionHeader
    } catch (error) {
      // Erro - o toast será mostrado pelo CollectionHeader
      setDeletionStatus('');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6 border border-border-light dark:border-border-dark">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">
              warning
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Remover Coleção
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
              Tem certeza que deseja remover permanentemente a coleção <strong className="text-slate-700 dark:text-slate-200">{collectionName}</strong>?
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200 font-semibold mb-1">
                Esta ação é irreversível
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                Todos os baralhos, flashcards e arquivos de mídia desta coleção serão permanentemente deletados.
              </p>
              {isDeleting && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <span className="animate-spin material-symbols-outlined text-sm">
                      progress_activity
                    </span>
                    {deletionStatus || 'Processando...'}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    ⏱️ Coleções com muita mídia podem levar alguns segundos. Os arquivos de mídia serão removidos em segundo plano.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 
                     bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark 
                     rounded-lg hover:bg-background-light dark:hover:bg-background-dark 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 
                     rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin material-symbols-outlined text-base">
                  progress_activity
                </span>
                Removendo...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">delete</span>
                Remover
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
