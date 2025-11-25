'use client';

import { useState, useEffect } from 'react';
import { CollectionWithStats } from '@/types/flashcards';
import { SearchInput } from '@/components/flashcards/SearchInput';
import { ImportAnkiButton } from '@/components/flashcards/ImportAnkiButton';
import { CreateCollectionButton } from '@/components/flashcards/CreateCollectionButton';
import { Pagination } from '@/components/flashcards/Pagination';
import { adminFlashcardService } from '@/services/adminFlashcardService';
import Dropdown from '@/components/ui/Dropdown';
import { useRouter } from 'next/navigation';

interface AdminCollectionsTabProps {
  myCollections: CollectionWithStats[];
  importedCollections: CollectionWithStats[];
}

type MySortOption = 'updated' | 'decks' | 'cards';

export function AdminCollectionsTab({ myCollections, importedCollections }: AdminCollectionsTabProps) {
  const router = useRouter();
  const [mySearch, setMySearch] = useState('');
  const [importedSearch, setImportedSearch] = useState('');
  const [myPage, setMyPage] = useState(1);
  const [importedPage, setImportedPage] = useState(1);
  const [mySort, setMySort] = useState<MySortOption>('updated');
  const [importedSort, setImportedSort] = useState<MySortOption>('updated');
  const [loading, setLoading] = useState<string | null>(null);

  // Estado local para gerenciar as coleções
  const [localMyCollections, setLocalMyCollections] = useState(myCollections);
  const [localImportedCollections, setLocalImportedCollections] = useState(importedCollections);

  const itemsPerPage = 6;

  // Atualizar estado local quando props mudarem
  useEffect(() => {
    setLocalMyCollections(myCollections);
    setLocalImportedCollections(importedCollections);
  }, [myCollections, importedCollections]);

  // Reset page when sort or search changes
  useEffect(() => {
    setMyPage(1);
  }, [mySort, mySearch]);

  useEffect(() => {
    setImportedPage(1);
  }, [importedSort, importedSearch]);

  const handleMarkAsOfficial = async (collectionName: string) => {
    try {
      setLoading(collectionName);
      await adminFlashcardService.markAsOfficial(collectionName);

      // Atualizar estado local
      setLocalMyCollections(prev =>
        prev.map(col => col.name === collectionName ? { ...col, is_official: true } : col)
      );
      setLocalImportedCollections(prev =>
        prev.map(col => col.name === collectionName ? { ...col, is_official: true } : col)
      );

      alert('Coleção marcada como oficial com sucesso!');
      
      // Recarregar a página para garantir dados atualizados
      router.refresh();
    } catch (error) {
      console.error('Erro ao marcar como oficial:', error);
      alert('Erro ao marcar coleção como oficial');
    } finally {
      setLoading(null);
    }
  };

  const handleUnmarkAsOfficial = async (collectionName: string) => {
    try {
      setLoading(collectionName);
      await adminFlashcardService.unmarkAsOfficial(collectionName);

      // Atualizar estado local
      setLocalMyCollections(prev =>
        prev.map(col => col.name === collectionName ? { ...col, is_official: false } : col)
      );
      setLocalImportedCollections(prev =>
        prev.map(col => col.name === collectionName ? { ...col, is_official: false } : col)
      );

      alert('Coleção desmarcada como oficial com sucesso!');
    } catch (error) {
      console.error('Erro ao desmarcar como oficial:', error);
      alert('Erro ao desmarcar coleção como oficial');
    } finally {
      setLoading(null);
    }
  };

  // Filter and sort my collections
  const filteredMyCollections = localMyCollections
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
  const filteredImportedCollections = localImportedCollections
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
              Minhas coleções oficiais
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Gerencie as coleções oficiais MedBrave
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

        {/* Grid de coleções */}
        {myPaginatedCollections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {myPaginatedCollections.map((collection) => (
              <div
                key={collection.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-dark-lg p-6 hover:shadow-xl dark:hover:shadow-dark-xl transition-all duration-300 hover:-translate-y-1 border border-border-light dark:border-border-dark"
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-2 line-clamp-2">
                      {collection.name}
                    </h3>

                    <div className="flex items-center gap-4 mb-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">folder</span>
                        <span>{collection.deckCount || 0} decks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">quiz</span>
                        <span>{collection.cardCount || 0} cards</span>
                      </div>
                    </div>

                    {collection.is_official && (
                      <div className="mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span className="text-xs font-medium">Oficial MedBrave</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => router.push(`/admin/flashcards/${encodeURIComponent(collection.id)}`)}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-violet-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                      Ver
                    </button>

                    {collection.is_official ? (
                      <button
                        onClick={() => handleUnmarkAsOfficial(collection.name)}
                        disabled={loading === collection.name}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {loading === collection.name ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-lg">cancel</span>
                            Desmarcar
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkAsOfficial(collection.name)}
                        disabled={loading === collection.name}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {loading === collection.name ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-lg">verified</span>
                            Marcar Oficial
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Você ainda não criou nenhuma coleção.
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

      {/* Coleções importadas */}
      {importedPaginatedCollections.length > 0 && (
        <section className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-lg dark:shadow-dark-xl border border-border-light dark:border-border-dark">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Coleções importadas
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
              onChange={(value) => setImportedSort(value as MySortOption)}
              options={[
                { value: 'updated', label: 'Mais recentes' },
                { value: 'decks', label: 'Mais baralhos' },
                { value: 'cards', label: 'Mais flashcards' }
              ]}
              placeholder="Ordenar por"
              fullWidth
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {importedPaginatedCollections.map((collection) => (
              <div
                key={collection.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-dark-lg p-6 hover:shadow-xl dark:hover:shadow-dark-xl transition-all duration-300 hover:-translate-y-1 border border-border-light dark:border-border-dark"
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-2 line-clamp-2">
                      {collection.name}
                    </h3>

                    <div className="flex items-center gap-4 mb-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">folder</span>
                        <span>{collection.deckCount || 0} decks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">quiz</span>
                        <span>{collection.cardCount || 0} cards</span>
                      </div>
                    </div>

                    {collection.is_official && (
                      <div className="mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span className="text-xs font-medium">Oficial MedBrave</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => router.push(`/admin/flashcards/${encodeURIComponent(collection.id)}`)}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-violet-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                      Ver
                    </button>

                    {collection.is_official ? (
                      <button
                        onClick={() => handleUnmarkAsOfficial(collection.name)}
                        disabled={loading === collection.name}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {loading === collection.name ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-lg">cancel</span>
                            Desmarcar
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkAsOfficial(collection.name)}
                        disabled={loading === collection.name}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {loading === collection.name ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-lg">verified</span>
                            Marcar Oficial
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {importedTotalPages > 1 && (
            <Pagination
              currentPage={importedPage}
              totalPages={importedTotalPages}
              onPageChange={setImportedPage}
            />
          )}
        </section>
      )}
    </div>
  );
}
