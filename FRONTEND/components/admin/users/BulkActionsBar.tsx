'use client';

import React from 'react';
import { AdminButton } from '@/components/admin/ui/AdminButton';

interface BulkActionsBarProps {
  selectedCount: number;
  onActivate: () => void;
  onSuspend: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onActivate,
  onSuspend,
  onDelete,
  onCancel
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-primary font-medium flex items-center gap-2">
            <span className="material-symbols-outlined">check_circle</span>
            {selectedCount} usuário{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <AdminButton
              size="sm"
              variant="outline"
              onClick={onActivate}
              className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
            >
              <span className="material-symbols-outlined text-sm mr-1">check_circle</span>
              Ativar
            </AdminButton>
            <AdminButton
              size="sm"
              variant="outline"
              onClick={onSuspend}
              className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <span className="material-symbols-outlined text-sm mr-1">block</span>
              Suspender
            </AdminButton>
            <AdminButton
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900/30"
            >
              <span className="material-symbols-outlined text-sm mr-1">delete</span>
              Deletar
            </AdminButton>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
          Cancelar Seleção
        </button>
      </div>
    </div>
  );
};

export default BulkActionsBar;
