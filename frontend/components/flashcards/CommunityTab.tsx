'use client';

import { useState, useMemo, useEffect } from 'react';
import { Institution, Specialty, CommunitySortOption } from '@/types/flashcards';
import { HorizontalCarousel } from './HorizontalCarousel';
import { InstitutionCard } from './InstitutionCard';
import { SpecialtyCard } from './SpecialtyCard';
import { SearchInput } from './SearchInput';
import { getAllImportedCollectionNames } from '@/services/flashcardService';
import Dropdown from '@/components/ui/Dropdown';
import { Pagination } from './Pagination';
import { CollectionCardSkeleton } from './CollectionCardSkeleton';

interface CommunityTabProps {
  institutions: Institution[];
  specialties: Specialty[];
  loading?: boolean;
}

type MedBraveSortOption = 'alphabetical' | 'newest' | 'oldest' | 'decks' | 'cards';
type CommunitySortOptionExtended = 'likes' | 'hot' | 'imports' | 'decks' | 'cards' | 'recent';

export function CommunityTab({ institutions, specialties, loading = false }: CommunityTabProps) {
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [medbraveSort, setMedbraveSort] = useState<MedBraveSortOption>('alphabetical');
  const [communitySort, setCommunitySort] = useState<CommunitySortOptionExtended>('recent');
  const [medbravePage, setMedbravePage] = useState(1);
  const [communityPage, setCommunityPage] = useState(1);
  const [importedCollections, setImportedCollections] = useState<Set<string>>(new Set());
  const [checkingStatus, setCheckingStatus] = useState(true);

  const medbraveItemsPerPage = 12;
  const communityItemsPerPage = 12;

  // Reset page when sort or search changes
  useEffect(() => {
    setMedbravePage(1);
  }, [medbraveSort, institutionSearch]);

  useEffect(() => {
    setCommunityPage(1);
  }, [communitySort, specialtySearch]);

  useEffect(() => {
    if (specialties.length > 0) {
      console.time('⏱️ [CommunityTab] Verificar status de importação');
      checkImportedStatus(specialties);
    }
  }, [specialties]);

  // Escutar eventos de atualização da biblioteca
  useEffect(() => {
    const handleLibraryUpdate = (event: CustomEvent) => {
      const { action, collectionId } = event.detail;
      if (action === 'removed') {
        handleCollectionRemoved(collectionId);
      } else if (action === 'added') {
        handleCollectionImported(collectionId);
      }
    };

    window.addEventListener('libraryUpdated', handleLibraryUpdate as EventListener);
    return () => {
      window.removeEventListener('libraryUpdated', handleLibraryUpdate as EventListener);
    };
  }, []);

  const checkImportedStatus = async (collections: Specialty[]) => {
    try {
      setCheckingStatus(true);
      
      console.log('🔍 [CommunityTab] Verificando status para', collections.length, 'coleções');
      
      // OTIMIZADO: Buscar todas as coleções importadas de uma vez
      const importedNames = await getAllImportedCollectionNames();
      
      console.log('✅ [CommunityTab] Coleções importadas:', importedNames);
      console.timeEnd('⏱️ [CommunityTab] Verificar status de importação');
      
      const importedSet = new Set(importedNames);
      setImportedCollections(importedSet);
    } catch (error) {
      console.error('Erro ao verificar status de importação:', error);
      console.timeEnd('⏱️ [CommunityTab] Verificar status de importação');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCollectionImported = (collectionName: string) => {
    setImportedCollections(prev => new Set([...prev, collectionName]));
  };

  const handleCollectionRemoved = (collectionName: string) => {
    setImportedCollections(prev => {
      const newSet = new Set(prev);
      newSet.delete(collectionName);
      return newSet;
    });
  };

  const filteredAndSortedInstitutions = useMemo(() => {
    let filtered = institutions.filter((inst) =>
      inst.name.toLowerCase().includes(institutionSearch.toLowerCase())
    );

    switch (medbraveSort) {
      case 'alphabetical':
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      case 'newest':
        return filtered; // Assumindo que já vem ordenado por mais recente
      case 'oldest':
        return [...filtered].reverse();
      case 'decks':
        return [...filtered].sort((a, b) => b.deckCount - a.deckCount);
      case 'cards':
        return filtered; // Adicionar quando tiver cardCount
      default:
        return filtered;
    }
  }, [institutions, institutionSearch, medbraveSort]);

  const filteredAndSortedSpecialties = useMemo(() => {
    let filtered = specialties.filter((spec) =>
      spec.name.toLowerCase().includes(specialtySearch.toLowerCase())
    );

    switch (communitySort) {
      case 'likes':
        return [...filtered].sort((a, b) => b.likes - a.likes);
      case 'hot':
        return [...filtered].sort((a, b) => {
          if (a.isHot && !b.isHot) return -1;
          if (!a.isHot && b.isHot) return 1;
          return b.likes - a.likes;
        });
      case 'imports':
        return [...filtered].sort((a, b) => b.imports - a.imports);
      case 'decks':
        return [...filtered].sort((a, b) => b.deckCount - a.deckCount);
      case 'cards':
        return filtered; // Adicionar quando tiver cardCount
      case 'recent':
      default:
        return filtered;
    }
  }, [specialties, specialtySearch, communitySort]);

  // Paginação MedBRAVE
  const medbraveTotalPages = Math.ceil(filteredAndSortedInstitutions.length / medbraveItemsPerPage);
  const paginatedInstitutions = filteredAndSortedInstitutions.slice(
    (medbravePage - 1) * medbraveItemsPerPage,
    medbravePage * medbraveItemsPerPage
  );

  // Paginação Comunidade
  const communityTotalPages = Math.ceil(filteredAndSortedSpecialties.length / communityItemsPerPage);
  const paginatedSpecialties = filteredAndSortedSpecialties.slice(
    (communityPage - 1) * communityItemsPerPage,
    communityPage * communityItemsPerPage
  );

  return (
    <div className="space-y-8">
      {/* Coleções MedBRAVE */}
      <section className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-sm">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Coleções MedBRAVE
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <SearchInput
                value={institutionSearch}
                onChange={setInstitutionSearch}
                placeholder="Buscar em Coleções MedBRAVE"
                fullWidth
              />
              <Dropdown
                value={medbraveSort}
                onChange={(value) => setMedbraveSort(value as MedBraveSortOption)}
                options={[
                  { value: 'alphabetical', label: 'Ordem alfabética' },
                  { value: 'newest', label: 'Mais novos' },
                  { value: 'oldest', label: 'Mais antigos' },
                  { value: 'decks', label: 'Mais baralhos' }
                ]}
                placeholder="Ordenar por"
                fullWidth
              />
            </div>
          </div>
        </div>

        {loading ? (
          <HorizontalCarousel>
            {Array.from({ length: institutions.length || 6 }).map((_, i) => (
              <CollectionCardSkeleton key={i} />
            ))}
          </HorizontalCarousel>
        ) : (
          <HorizontalCarousel>
            {paginatedInstitutions.map((institution) => (
              <InstitutionCard 
                key={institution.id} 
                institution={institution}
                isImported={importedCollections.has(institution.id)}
                onImported={() => handleCollectionImported(institution.id)}
              />
            ))}
          </HorizontalCarousel>
        )}

        {medbraveTotalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={medbravePage}
              totalPages={medbraveTotalPages}
              onPageChange={setMedbravePage}
            />
          </div>
        )}
      </section>

      {/* Coleções feitas pela comunidade */}
      <section className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-sm">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
              Coleções feitas pela comunidade
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2">
              Aqui você pode importar uma coleção feita pelos usuários
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <SearchInput
                value={specialtySearch}
                onChange={setSpecialtySearch}
                placeholder="Buscar na comunidade"
                fullWidth
              />
              <Dropdown
                value={communitySort}
                onChange={(value) => setCommunitySort(value as CommunitySortOptionExtended)}
                options={[
                  { value: 'recent', label: 'Mais recentes' },
                  { value: 'likes', label: 'Mais curtidas' },
                  { value: 'hot', label: 'Em alta' },
                  { value: 'imports', label: 'Mais importações' },
                  { value: 'decks', label: 'Mais baralhos' }
                ]}
                placeholder="Ordenar por"
                fullWidth
              />
            </div>
          </div>
        </div>

        {loading ? (
          <HorizontalCarousel>
            {Array.from({ length: specialties.length || 6 }).map((_, i) => (
              <CollectionCardSkeleton key={i} />
            ))}
          </HorizontalCarousel>
        ) : (
          <HorizontalCarousel>
            {paginatedSpecialties.map((specialty) => (
              <SpecialtyCard 
                key={specialty.id} 
                specialty={specialty}
                isImported={importedCollections.has(specialty.id)}
                onImported={() => handleCollectionImported(specialty.id)}
                onRemoved={() => handleCollectionRemoved(specialty.id)}
              />
            ))}
          </HorizontalCarousel>
        )}

        {communityTotalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={communityPage}
              totalPages={communityTotalPages}
              onPageChange={setCommunityPage}
            />
          </div>
        )}
      </section>
    </div>
  );
}
