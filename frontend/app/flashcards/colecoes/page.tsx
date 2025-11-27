'use client';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TabGroup } from '@/components/ui/TabGroup';
import { MyCollectionsTab } from '@/components/flashcards/MyCollectionsTab';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMyLibrary } from '@/hooks/queries';

export default function ColecoesPage() {
  const router = useRouter();
  const { data, isLoading, error } = useMyLibrary();

  // Mapear dados para o formato esperado pelo componente
  const { myCollections, importedCollections } = useMemo(() => {
    if (!data) return { myCollections: [], importedCollections: [] };

    const mappedMyCollections = (data.myCollections || []).map((collection: any) => ({
      id: collection.id,
      name: collection.name,
      deckCount: collection.deck_count || 0,
      cardCount: collection.card_count || 0,
      newCards: collection.card_count || 0,
      updatedAt: collection.updated_at,
      institution: collection.institution || '',
      tags: collection.tags || [],
      isAdded: true,
      isImported: collection.is_imported || false,
      is_blocked: collection.is_blocked || false,
      thumbnail_url: collection.thumbnail_url || null,
      author_name: collection.author_name || 'Você',
      isFromCommunity: false
    }));
    
    const mappedImportedCollections = (data.importedCollections || []).map((collection: any) => ({
      id: collection.id,
      name: collection.name,
      deckCount: collection.deck_count || 0,
      cardCount: collection.card_count || 0,
      newCards: collection.card_count || 0,
      updatedAt: collection.updated_at,
      institution: collection.institution || '',
      tags: collection.tags || [],
      isAdded: true,
      isImported: collection.is_imported || false,
      is_blocked: collection.is_blocked || false,
      thumbnail_url: collection.thumbnail_url || null,
      author_name: collection.author_name,
      isFromCommunity: true
    }));

    return { myCollections: mappedMyCollections, importedCollections: mappedImportedCollections };
  }, [data]);

  if (error) {
    return (
      <div className="w-full py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Erro ao carregar coleções. Tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Flashcards', icon: 'layers', href: '/flashcards/colecoes' }
          ]}
        />
      </div>

      <div className="w-full py-8">
        {/* Tabs */}
          <TabGroup
            tabs={[
              { id: 'colecoes', label: 'Minhas Coleções', icon: 'folder' },
              { id: 'comunidade', label: 'Comunidade', icon: 'groups' },
            ]}
            activeTab="colecoes"
            onChange={(tabId) => {
              if (tabId === 'comunidade') {
                router.push('/flashcards/comunidade');
              }
            }}
            className="mb-8"
          />

          <MyCollectionsTab
            myCollections={myCollections}
            importedCollections={importedCollections}
            loading={isLoading}
          />
        </div>
    </>
  );
}
