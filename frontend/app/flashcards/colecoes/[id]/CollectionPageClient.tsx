'use client';

import { DeckList } from '@/components/flashcards/DeckList';
import { CollectionHeader } from '@/components/flashcards/CollectionHeader';
import { DeckFilterBar } from '@/components/flashcards/DeckFilterBar';
import { CreateDeckModal } from '@/components/flashcards/CreateDeckModal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useEffect, useState, useCallback } from 'react';
import { Deck } from '@/types/flashcards';
import { useCollection, useCollectionDecks } from '@/hooks/queries';

interface CollectionPageClientProps {
  id: string;
}

export default function CollectionPageClient({ id }: CollectionPageClientProps) {
  // Usar React Query
  const { data: collection, isLoading: loadingCollection, error: collectionError } = useCollection(id);
  const { data: decks = [], isLoading: loadingDecks } = useCollectionDecks(id);
  
  const [filteredDecks, setFilteredDecks] = useState<Deck[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loading = loadingCollection || loadingDecks;
  const error = collectionError ? 'Erro ao carregar coleção' : null;

  // Atualizar filteredDecks quando decks mudar
  useEffect(() => {
    setFilteredDecks(decks);
  }, [decks]);

  const handleFilter = useCallback((filters: { search: string; sortBy: string }) => {
    console.log('🔍 [FILTER] Aplicando filtros:', filters);
    console.log('🔍 [FILTER] Total de decks:', decks.length);

    let filtered = [...decks];

    // Aplicar busca
    if (filters.search) {
      filtered = filtered.filter(deck =>
        deck.name.toLowerCase().includes(filters.search.toLowerCase())
      );
      console.log('🔍 [FILTER] Após busca:', filtered.length);
    }

    // Aplicar ordenação
    console.log('🔍 [FILTER] Aplicando ordenação:', filters.sortBy);
    switch (filters.sortBy) {
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = new Date(a.updatedAt ?? a.updated_at ?? a.createdAt ?? a.created_at ?? 0).getTime();
          const dateB = new Date(b.updatedAt ?? b.updated_at ?? b.createdAt ?? b.created_at ?? 0).getTime();
          return dateB - dateA;
        });
        break;
      case 'oldest':
        filtered.sort((a, b) => {
          const dateA = new Date(a.createdAt ?? a.created_at ?? 0).getTime();
          const dateB = new Date(b.createdAt ?? b.created_at ?? 0).getTime();
          return dateA - dateB;
        });
        break;
      case 'most_cards':
        filtered.sort((a, b) => {
          // Converter para número (pode vir como string do banco)
          const countA = Number(a.totalCards || a.flashcard_count || a.card_count || 0);
          const countB = Number(b.totalCards || b.flashcard_count || b.card_count || 0);
          console.log(`🔍 [SORT] ${a.name}: ${countA} vs ${b.name}: ${countB}`);
          return countB - countA;
        });
        break;
    }

    console.log('🔍 [FILTER] Decks após ordenação:', filtered.map(d => ({
      name: d.name,
      count: d.totalCards || d.flashcard_count || d.card_count
    })));

    setFilteredDecks(filtered);
  }, [decks]);

  // Aplicar ordenação inicial quando os decks são carregados
  useEffect(() => {
    if (decks.length > 0) {
      handleFilter({ search: '', sortBy: 'recent' });
    }
  }, [decks, handleFilter]);

  const handleDeckCreated = (deckId: string) => {
    // React Query vai recarregar automaticamente
  };

  if (loading) {
    return (
      null
    );
  }

  if (error || !collection) {
    return (
      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error || 'Coleção não encontrada'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Flashcards', href: '/flashcards/colecoes', icon: 'layers' },
            { label: collection.name, icon: 'collections_bookmark' },
          ]}
        />
      </div>

      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 md:py-8">
          <div className="max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto">
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl dark:shadow-dark-xl p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
              <CollectionHeader collection={collection} />

              <div className="mt-8">
                <DeckFilterBar
                  onFilter={handleFilter}
                  onCreateDeck={collection.canEdit ? () => setShowCreateModal(true) : undefined}
                  canEdit={collection.canEdit}
                  collectionId={collection.id}
                  isImported={collection.isFromCommunity}
                  onLibraryToggle={() => {}}
                />
                <DeckList
                  decks={filteredDecks}
                  onDeckUpdated={() => {}}
                  showFilters={false}
                  canEdit={collection.canEdit}
                  collectionInfo={{
                    isOfficial: collection.is_official,
                    isFromCommunity: collection.isFromCommunity,
                    authorName: collection.author_name
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Create Deck Modal */}
        <CreateDeckModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleDeckCreated}
          collectionId={id}
        />
      </div>
    </>
  );
}
