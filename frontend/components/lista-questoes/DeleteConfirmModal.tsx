'use client';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: 'folder' | 'list' | 'simulado';
  isDeleting?: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isDeleting = false
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl dark:shadow-dark-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">
              warning
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
              Excluir {itemType === 'folder' ? 'Pasta' : 'Lista'}
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Tem certeza que deseja excluir <strong>{itemName}</strong>?
              {itemType === 'folder' && (
                <span className="block mt-2 text-red-600 dark:text-red-400">
                  Atenção: Todas as subpastas e listas dentro desta pasta também serão excluídas.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                Excluindo...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">delete</span>
                Excluir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
