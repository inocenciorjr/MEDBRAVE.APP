'use client';

import { useState, useEffect } from 'react';
import { Deck } from '@/types/flashcards';
import { DeckCard } from './DeckCard';
import { FilterBar } from './FilterBar';
import { Pagination } from './Pagination';

interface DeckListProps {
  decks: Deck[];
  showFilters?: boolean;
  onDeckUpdated?: () => void;
  canEdit?: boolean; // Se o usuário pode editar (validado pelo backend)
  collectionInfo?: {
    isOfficial?: boolean;
    isFromCommunity?: boolean;
    authorName?: string;
  };
}

export function DeckList({ decks, showFilters = true, onDeckUpdated, canEdit = true, collectionInfo }: DeckListProps) {
  const [filteredDecks, setFilteredDecks] = useState(decks);
  const [currentPage, setCurrentPage] = useState(1);
  const decksPerPage = 9;

  // Atualizar filteredDecks quando a prop decks mudar
  useEffect(() => {
    setFilteredDecks(decks);
  }, [decks]);

  const handleFilter = (filters: {
    search: string;
    area: string;
    priority: string;
  }) => {
    let filtered = decks;

    if (filters.search) {
      filtered = filtered.filter(deck =>
        deck.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.area) {
      filtered = filtered.filter(deck => deck.area === filters.area);
    }

    if (filters.priority) {
      filtered = filtered.filter(deck => deck.priority?.toString() === filters.priority);
    }

    setFilteredDecks(filtered);
    setCurrentPage(1);
  };

  const indexOfLastDeck = currentPage * decksPerPage;
  const indexOfFirstDeck = indexOfLastDeck - decksPerPage;
  const currentDecks = filteredDecks.slice(indexOfFirstDeck, indexOfLastDeck);
  const totalPages = Math.ceil(filteredDecks.length / decksPerPage);

  return (
    <div>
      {showFilters && <FilterBar onFilter={handleFilter} />}
      
      <section className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8 ${showFilters ? 'my-8' : ''}`}>
        {currentDecks.map(deck => (
          <div key={deck.id} className="h-full">
            <DeckCard deck={deck} onDeckUpdated={onDeckUpdated} canEdit={canEdit} collectionInfo={collectionInfo} />
          </div>
        ))}
      </section>

      {filteredDecks.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {filteredDecks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Nenhum deck encontrado com os filtros aplicados.
          </p>
        </div>
      )}
    </div>
  );
}
