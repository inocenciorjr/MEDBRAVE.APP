'use client';

import { useState, useEffect } from 'react';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => void;
  itemName: string;
  itemDescription?: string;
  itemType: 'folder' | 'list' | 'simulado';
  isSaving?: boolean;
}

export default function EditItemModal({
  isOpen,
  onClose,
  onSave,
  itemName,
  itemDescription = '',
  itemType,
  isSaving = false
}: EditItemModalProps) {
  const [name, setName] = useState(itemName);
  const [description, setDescription] = useState(itemDescription);

  useEffect(() => {
    if (isOpen) {
      setName(itemName);
      setDescription(itemDescription);
    }
  }, [isOpen, itemName, itemDescription]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), description.trim() || undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl dark:shadow-dark-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            Editar {itemType === 'folder' ? 'Pasta' : 'Lista'}
          </h3>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                Nome *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary disabled:opacity-50"
                placeholder={`Nome da ${itemType === 'folder' ? 'pasta' : 'lista'}`}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                Descrição
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
                rows={3}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary disabled:opacity-50 resize-none"
                placeholder="Descrição opcional"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                  Salvando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
