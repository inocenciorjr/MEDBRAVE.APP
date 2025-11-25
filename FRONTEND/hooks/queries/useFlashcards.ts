'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyLibrary, getCommunityCollections } from '@/services/flashcardService';

export const flashcardsKeys = {
  all: ['flashcards'] as const,
  library: () => [...flashcardsKeys.all, 'library'] as const,
  community: () => [...flashcardsKeys.all, 'community'] as const,
  collection: (id: string) => [...flashcardsKeys.all, 'collection', id] as const,
  decks: (collectionId: string) => [...flashcardsKeys.all, 'decks', collectionId] as const,
};

export function useMyLibrary() {
  return useQuery({
    queryKey: flashcardsKeys.library(),
    queryFn: async () => {
      const response = await getMyLibrary();
      if (!response.success) {
        throw new Error('Erro ao carregar biblioteca');
      }
      return {
        myCollections: response.myCollections || [],
        importedCollections: response.importedCollections || [],
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useCommunityCollections() {
  return useQuery({
    queryKey: flashcardsKeys.community(),
    queryFn: async () => {
      const response = await getCommunityCollections({
        page: 1,
        limit: 50,
        sortBy: 'recent'
      });
      
      if (!response.success || !response.data) {
        return { institutions: [], specialties: [] };
      }

      const collections = Array.isArray(response.data) ? response.data : [];
      
      const officialCollections = collections.filter((c: any) => c.is_official === true);
      const communityCollections = collections.filter((c: any) => c.is_official !== true);

      return {
        institutions: officialCollections,
        specialties: communityCollections,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: flashcardsKeys.collection(id),
    queryFn: async () => {
      const { getCollection } = await import('@/lib/api/flashcards');
      return getCollection(id);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!id,
  });
}

export function useCollectionDecks(collectionId: string) {
  return useQuery({
    queryKey: flashcardsKeys.decks(collectionId),
    queryFn: async () => {
      const { getDecksByCollection } = await import('@/lib/api/flashcards');
      return getDecksByCollection(collectionId);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!collectionId,
  });
}
