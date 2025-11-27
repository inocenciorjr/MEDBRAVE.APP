'use client';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TabGroup } from '@/components/ui/TabGroup';
import { CommunityTab } from '@/components/flashcards/CommunityTab';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCommunityCollections } from '@/hooks/queries';

export default function ComunidadePage() {
  const router = useRouter();
  const { data, isLoading, error } = useCommunityCollections();

  // Mapear dados para o formato esperado pelo componente
  const { institutions, specialties } = useMemo(() => {
    if (!data) return { institutions: [], specialties: [] };

    const institutionsData = (data.institutions || []).map((collection: any) => ({
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

    const specialtiesData = (data.specialties || []).map((collection: any) => ({
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
  }, [data]);

  if (error) {
    return (
      <div className="w-full py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Erro ao carregar coleções da comunidade.</p>
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
            { label: 'Flashcards', icon: 'layers', href: '/flashcards/colecoes' },
            { label: 'Comunidade', icon: 'groups', href: '/flashcards/comunidade' }
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
            activeTab="comunidade"
            onChange={(tabId) => {
              if (tabId === 'colecoes') {
                router.push('/flashcards/colecoes');
              }
            }}
            className="mb-8"
          />

          <CommunityTab
            institutions={institutions}
            specialties={specialties}
            loading={isLoading}
          />
        </div>
    </>
  );
}
