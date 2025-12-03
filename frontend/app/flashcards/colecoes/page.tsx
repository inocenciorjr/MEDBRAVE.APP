'use client';

import { useState } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TabGroup } from '@/components/ui/TabGroup';
import { MyCollectionsTab } from '@/components/flashcards/MyCollectionsTab';
import { CommunityTab } from '@/components/flashcards/CommunityTab';
import { useMemo } from 'react';
import { useMyLibrary, useCommunityCollections } from '@/hooks/queries';

export default function ColecoesPage() {
  const [activeTab, setActiveTab] = useState<'colecoes' | 'comunidade'>('colecoes');
  
  // Dados de Minhas Coleções
  const { data: myData, isLoading: isLoadingMy, error: errorMy } = useMyLibrary();
  
  // Dados da Comunidade - só carrega quando a aba está ativa
  const { data: communityData, isLoading: isLoadingCommunity, error: errorCommunity } = useCommunityCollections();

  // Mapear dados de Minhas Coleções
  const { myCollections, importedCollections } = useMemo(() => {
    if (!myData) return { myCollections: [], importedCollections: [] };

    const mappedMyCollections = (myData.myCollections || []).map((collection: any) => ({
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
    
    const mappedImportedCollections = (myData.importedCollections || []).map((collection: any) => ({
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
  }, [myData]);

  // Mapear dados da Comunidade
  const { institutions, specialties } = useMemo(() => {
    if (!communityData) return { institutions: [], specialties: [] };

    const institutionsData = (communityData.institutions || []).map((collection: any) => ({
      id: collection.id,
      name: collection.name,
      logo: collection.thumbnail_url || collection.image_url || '',
      icon: 'verified',
      iconColor: 'text-blue-600',
      deckCount: collection.deck_count || 0,
      likes: collection.likes || 0,
      imports: collection.imports || 0,
      isHot: collection.is_hot || false,
      author: 'MedBrave Oficial',
      thumbnail_url: collection.thumbnail_url || null,
      image_url: collection.image_url || null,
      isOfficial: true,
      user_id: collection.user_id
    }));

    const specialtiesData = (communityData.specialties || []).map((collection: any) => ({
      id: collection.id,
      name: collection.name,
      icon: 'folder',
      iconColor: 'text-primary',
      deckCount: collection.deck_count || 0,
      likes: collection.likes || 0,
      imports: collection.imports || 0,
      isHot: collection.is_hot || false,
      author: collection.author_name || 'Comunidade',
      thumbnail_url: collection.thumbnail_url || null,
      image_url: collection.image_url || null,
      isOfficial: false,
      user_id: collection.user_id
    }));

    return { institutions: institutionsData, specialties: specialtiesData };
  }, [communityData]);

  const error = activeTab === 'colecoes' ? errorMy : errorCommunity;

  if (error) {
    return (
      <div className="w-full py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            {activeTab === 'colecoes' 
              ? 'Erro ao carregar coleções. Tente novamente.'
              : 'Erro ao carregar coleções da comunidade.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={
            activeTab === 'colecoes'
              ? [{ label: 'Flashcards', icon: 'layers', href: '/flashcards/colecoes' }]
              : [
                  { label: 'Flashcards', icon: 'layers', href: '/flashcards/colecoes' },
                  { label: 'Comunidade', icon: 'groups' }
                ]
          }
        />
      </div>

      <div className="w-full py-8">
        {/* Tabs - sempre visíveis, sem recarregar */}
        <TabGroup
          tabs={[
            { id: 'colecoes', label: 'Minhas Coleções', icon: 'folder' },
            { id: 'comunidade', label: 'Comunidade', icon: 'groups' },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as 'colecoes' | 'comunidade')}
          className="mb-8"
        />

        {/* Conteúdo da aba ativa */}
        {activeTab === 'colecoes' ? (
          <MyCollectionsTab
            myCollections={myCollections}
            importedCollections={importedCollections}
            loading={isLoadingMy}
          />
        ) : (
          <CommunityTab
            institutions={institutions}
            specialties={specialties}
            loading={isLoadingCommunity}
          />
        )}
      </div>
    </>
  );
}
