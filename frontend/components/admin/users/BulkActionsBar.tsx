'use client';

import React from 'react';
import { AdminButton } from '../ui/AdminButton';

interface BulkActionsBarProps {
  selectedCount: number;
  onActivate: () => void;
  onSuspend: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  onActivate,
  onSuspend,
  onDelete,
  onCancel,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl dark:shadow-dark-2xl border-2 border-primary px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Counter */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
              {selectedCount}
            </div>
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              {selectedCount === 1 ? 'usuário selecionado' : 'usuários selecionados'}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-border-light dark:bg-border-dark" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <AdminButton
              size="sm"
              variant="outline"
              onClick={onActivate}
              icon="check_circle"
            >
              Ativar
            </AdminButton>

            <AdminButton
              size="sm"
              variant="outline"
              onClick={onSuspend}
              icon="block"
            >
              Suspender
            </AdminButton>

            <AdminButton
              size="sm"
              variant="danger"
              onClick={onDelete}
              icon="delete"
            >
              Deletar
            </AdminButton>

            <div className="w-px h-8 bg-border-light dark:bg-border-dark" />

            <button
              onClick={onCancel}
              className="px-3 py-2 text-sm text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
