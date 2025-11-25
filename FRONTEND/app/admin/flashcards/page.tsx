'use client';

import { TabNavigation } from '@/components/flashcards/TabNavigation';
import { AdminCollectionsTab } from '@/components/admin/flashcards/AdminCollectionsTab';
import { useEffect, useState, useRef } from 'react';
import { getCollectionsMetadata, getMyLibrary } from '@/services/flashcardService';
import { useAuth } from '@/lib/contexts/AuthContext';
import loading from '@/app/flashcards/colecoes/loading';
import { CollectionWithStats } from '@/types/flashcards';

export default function AdminFlashcardsPage() {
  const { user, loading: authLoading } = useAuth();
  const [myCollections, setMyCollections] = useState<CollectionWithStats[]>([]);
  const [importedCollections, setImportedCollections] = useState<CollectionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Aguardar autenticação antes de carregar dados
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      setError('Você precisa estar autenticado para acessar esta página');
      return;
    }

    async function loadCollections() {
      try {
        setLoading(true);
        setError(null);

        // Buscar coleções próprias (do admin)
        const collectionsResponse = await getCollectionsMetadata();
        if (collectionsResponse.success && collectionsResponse.data) {
          setMyCollections(collectionsResponse.data);
        }

        // Buscar biblioteca (coleções importadas pelo admin)
        const libraryResponse = await getMyLibrary();
        if (libraryResponse.success) {
          // Combinar myCollections e importedCollections
          const allCollections = [
            ...(libraryResponse.myCollections || []),
            ...(libraryResponse.importedCollections || [])
          ];
          
          const mappedData = allCollections.map((collection: any) => ({
            id: collection.id || collection.name,
            name: collection.name,
            deckCount: collection.deck_count || 0,
            cardCount: collection.card_count || 0,
            newCards: collection.card_count || 0,
            createdAt: collection.created_at || collection.updated_at || new Date().toISOString(),
            updatedAt: collection.updated_at,
            institution: collection.institution || '',
            tags: collection.tags || [],
            isAdded: true,
            is_blocked: collection.is_blocked || false,
            is_official: collection.is_official || false,
            thumbnail_url: collection.thumbnail_url || null,
            author_name: 'MedBrave Oficial',
            isFromCommunity: false,
            isOfficial: collection.is_official || false
          }));
          setImportedCollections(mappedData);
        }
      } catch (err) {
        console.error('Erro ao carregar coleções:', err);
        setError('Erro ao carregar coleções. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }

    loadCollections();
  }, [authLoading, user?.uid]); // Usar apenas uid para evitar re-renders desnecessários

  // Removido: loading state tratado pelo loading.tsx (skeleton)

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <header>
            <h1 className="text-4xl font-semibold text-slate-700 dark:text-slate-200">
              Coleções Oficiais MedBrave
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Gerencie as coleções oficiais que aparecerão na aba Comunidade
            </p>
          </header>

          <TabNavigation activeTab="minhas-colecoes" />

          <AdminCollectionsTab
            myCollections={myCollections}
            importedCollections={importedCollections}
          />
        </div>
      </div>
    </div>
  );
}
