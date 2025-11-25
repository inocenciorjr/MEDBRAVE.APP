'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/lib/contexts/ToastContext';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deckId: string) => void;
  collectionId: string;
}

export function CreateDeckModal({
  isOpen,
  onClose,
  onSuccess,
  collectionId
}: CreateDeckModalProps) {
  const toast = useToast();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
      setDeckName('');
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleCreate = async () => {
    if (!deckName.trim()) {
      toast.error('Por favor, insira um nome para o deck');
      return;
    }

    try {
      setIsCreating(true);

      const response = await fetchWithAuth('/flashcards/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: deckName.trim(),
          collection_id: collectionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao criar deck');
      }

      const data = await response.json();
      toast.success('Deck criado com sucesso!');
      onSuccess(data.id);
      onClose();
    } catch (error) {
      console.error('Error creating deck:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar deck');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreate();
    }
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl dark:shadow-dark-2xl max-w-md w-full p-8 transition-all duration-300 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Criar Novo Deck
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
              close
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              Nome do Deck
            </label>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Cardiologia Básica"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-background-light dark:bg-background-dark border-2 border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl font-medium text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !deckName.trim()}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">add</span>
                  Criar Deck
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
