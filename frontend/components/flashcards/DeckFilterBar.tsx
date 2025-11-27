'use client';

import { useState, useEffect } from 'react';
import { SearchInput } from './SearchInput';
import Dropdown from '../ui/Dropdown';
import { useToast } from '@/lib/contexts/ToastContext';

interface DeckFilterBarProps {
  onFilter: (filters: {
    search: string;
    sortBy: string;
  }) => void;
  onCreateDeck?: () => void;
  canEdit?: boolean; // Se o usuário pode criar decks (validado pelo backend)
  collectionId?: string; // ID da coleção (para adicionar à biblioteca)
  isImported?: boolean; // Se já está na biblioteca
  onLibraryToggle?: () => void; // Callback quando adiciona/remove da biblioteca
}

export function DeckFilterBar({ 
  onFilter, 
  onCreateDeck, 
  canEdit = true,
  collectionId,
  isImported = false,
  onLibraryToggle
}: DeckFilterBarProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [isLoading, setIsLoading] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(isImported);
  const toast = useToast();

  // Atualizar estado quando a prop mudar
  useEffect(() => {
    setIsInLibrary(isImported);
  }, [isImported]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilter({ search: value, sortBy });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    onFilter({ search, sortBy: value });
  };

  const sortOptions = [
    { value: 'recent', label: 'Mais recentes' },
    { value: 'oldest', label: 'Mais antigos' },
    { value: 'most_cards', label: 'Mais flashcards' },
  ];

  const handleLibraryToggle = async () => {
    if (!collectionId) return;
    
    setIsLoading(true);
    try {
      if (isInLibrary) {
        // Remover da biblioteca
        const { removeCollectionFromLibrary } = await import('@/services/flashcardService');
        await removeCollectionFromLibrary(collectionId);
        setIsInLibrary(false);
        toast.success('Removido da biblioteca');
        if (onLibraryToggle) onLibraryToggle();
      } else {
        // Adicionar à biblioteca
        const { addCollectionToLibrary } = await import('@/services/flashcardService');
        await addCollectionToLibrary(collectionId);
        setIsInLibrary(true);
        toast.success('Adicionado à biblioteca!');
        if (onLibraryToggle) onLibraryToggle();
      }
    } catch (error: any) {
      console.error('Erro ao atualizar biblioteca:', error);
      toast.error(error.message || 'Erro ao atualizar biblioteca');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="md:col-span-1">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar deck..."
            fullWidth
          />
        </div>

        {/* Sort Dropdown */}
        <div className="md:col-span-1">
          <Dropdown
            options={sortOptions}
            value={sortBy}
            onChange={handleSortChange}
            placeholder="Ordenar por..."
            fullWidth
          />
        </div>

        {/* Create Deck Button ou Add to Library Button */}
        <div className="md:col-span-1">
          {canEdit && onCreateDeck ? (
            <button
              onClick={onCreateDeck}
              className="w-full h-14 px-6 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Criar Deck
            </button>
          ) : !canEdit && collectionId && (
            <button
              onClick={handleLibraryToggle}
              disabled={isLoading}
              className={`w-full h-14 px-6 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
                isInLibrary
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processando...
                </>
              ) : isInLibrary ? (
                <>
                  <span className="material-symbols-outlined text-xl">check_circle</span>
                  Na Biblioteca
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">download</span>
                  Adicionar à Biblioteca
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
