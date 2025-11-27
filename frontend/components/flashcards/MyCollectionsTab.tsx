'use client';

import { useState, useEffect } from 'react';
import { CollectionWithStats } from '@/types/flashcards';
import { CollectionGrid } from './CollectionGrid';
import { SearchInput } from './SearchInput';
import { ImportAnkiButton } from './ImportAnkiButton';
import { CreateCollectionButton } from './CreateCollectionButton';
import { Pagination } from './Pagination';
import { ImportedCollectionCard } from './ImportedCollectionCard';
import Dropdown from '@/components/ui/Dropdown';
import { CollectionGridSkeleton } from './CollectionCardSkeleton';

interface MyCollectionsTabProps {
  myCollections: CollectionWithStats[];
  importedCollections: CollectionWithStats[];
  loading?: boolean;
}

type MySortOption = 'updated' | 'decks' | 'cards';
type ImportedSortOption = 'updated' | 'decks' | 'cards';

export function MyCollectionsTab({ myCollections, importedCollections, loading = false }: MyCollectionsTabProps) {
  const [mySearch, setMySearch] = useState('');
  const [importedSearch, setImportedSearch] = useState('');
  const [myPage, setMyPage] = useState(1);
  const [importedPage, setImportedPage] = useState(1);
  const [mySort, setMySort] = useState<MySortOption>('updated');
  const [importedSort, setImportedSort] = useState<ImportedSortOption>('updated');

  const itemsPerPage = 8;

  // Reset page when sort or search changes
  useEffect(() => {
    setMyPage(1);
  }, [mySort, mySearch]);

  useEffect(() => {
    setImportedPage(1);
  }, [importedSort, importedSearch]);

  // Filter and sort my collections
  const filteredMyCollections = myCollections
    .filter((col) => col.name.toLowerCase().includes(mySearch.toLowerCase()))
    .sort((a, b) => {
      switch (mySort) {
        case 'decks':
          return (b.deckCount || 0) - (a.deckCount || 0);
        case 'cards':
          return (b.cardCount || 0) - (a.cardCount || 0);
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  // Filter and sort imported collections
  const filteredImportedCollections = importedCollections
    .filter((col) => col.name.toLowerCase().includes(importedSearch.toLowerCase()))
    .sort((a, b) => {
      switch (importedSort) {
        case 'decks':
          return (b.deckCount || 0) - (a.deckCount || 0);
        case 'cards':
          return (b.cardCount || 0) - (a.cardCount || 0);
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  // Paginate my collections
  const myTotalPages = Math.ceil(filteredMyCollections.length / itemsPerPage);
  const myPaginatedCollections = filteredMyCollections.slice(
    (myPage - 1) * itemsPerPage,
    myPage * itemsPerPage
  );

  // Paginate imported collections
  const importedTotalPages = Math.ceil(filteredImportedCollections.length / itemsPerPage);
  const importedPaginatedCollections = filteredImportedCollections.slice(
    (importedPage - 1) * itemsPerPage,
    importedPage * itemsPerPage
  );

  return (
    <div className="space-y-10">
      {/* Minhas coleções */}
      <section className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-lg dark:shadow-dark-xl border border-border-light dark:border-border-dark">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
              Minhas coleções
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Coleções que você criou e importou aparecerão aqui
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ImportAnkiButton />
            <CreateCollectionButton />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchInput
            value={mySearch}
            onChange={setMySearch}
            placeholder="Buscar coleção"
            fullWidth
          />
          <Dropdown
            value={mySort}
            onChange={(value) => setMySort(value as MySortOption)}
            options={[
              { value: 'updated', label: 'Mais recentes' },
              { value: 'decks', label: 'Mais baralhos' },
              { value: 'cards', label: 'Mais flashcards' }
            ]}
            placeholder="Ordenar por"
            fullWidth
          />
        </div>

        {loading ? (
          <CollectionGridSkeleton count={myCollections.length || 6} />
        ) : myPaginatedCollections.length > 0 ? (
          <CollectionGrid 
            collections={myPaginatedCollections}
            onDeleted={() => window.location.reload()}
            onUpdated={() => window.location.reload()}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Você ainda não tem coleções. Crie uma nova ou importe da comunidade!
            </p>
          </div>
        )}

        {myTotalPages > 1 && (
          <Pagination
            currentPage={myPage}
            totalPages={myTotalPages}
            onPageChange={setMyPage}
          />
        )}
      </section>

      {/* Coleções importadas da comunidade */}
      <section className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-lg dark:shadow-dark-xl border border-border-light dark:border-border-dark">
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Coleções importadas da comunidade
        </h2>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchInput
            value={importedSearch}
            onChange={setImportedSearch}
            placeholder="Buscar coleção"
            fullWidth
          />
          <Dropdown
            value={importedSort}
            onChange={(value) => setImportedSort(value as ImportedSortOption)}
            options={[
              { value: 'updated', label: 'Mais recentes' },
              { value: 'decks', label: 'Mais baralhos' },
              { value: 'cards', label: 'Mais flashcards' }
            ]}
            placeholder="Ordenar por"
            fullWidth
          />
        </div>

        {/* Grid customizado para coleções importadas */}
        {loading ? (
          <CollectionGridSkeleton count={importedCollections.length || 6} />
        ) : importedPaginatedCollections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {importedPaginatedCollections.map((collection) => (
              <ImportedCollectionCard 
                key={collection.id} 
                collection={collection}
                onDeleted={() => window.location.reload()}
                onUpdated={() => window.location.reload()}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Você ainda não importou nenhuma coleção da comunidade.
            </p>
          </div>
        )}

        {importedTotalPages > 1 && (
          <Pagination
            currentPage={importedPage}
            totalPages={importedTotalPages}
            onPageChange={setImportedPage}
          />
        )}
      </section>
    </div>
  );
}
