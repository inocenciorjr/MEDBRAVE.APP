'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const reviewsKeys = {
  all: ['reviews'] as const,
  dashboard: () => [...reviewsKeys.all, 'dashboard'] as const,
  preferences: () => [...reviewsKeys.all, 'preferences'] as const,
  list: () => [...reviewsKeys.all, 'list'] as const,
  manage: (contentType?: string) => [...reviewsKeys.all, 'manage', contentType] as const,
  metadata: () => [...reviewsKeys.all, 'metadata'] as const,
};

export function useReviewDashboard() {
  return useQuery({
    queryKey: reviewsKeys.dashboard(),
    queryFn: async () => {
      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
      const response = await fetchWithAuth('/unified-reviews/dashboard');
      if (!response.ok) throw new Error('Erro ao carregar dashboard');
      const result = await response.json();
      // Backend retorna { success: true, data: dashboard }
      return result.success ? result.data : result;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useReviewPreferences() {
  return useQuery({
    queryKey: reviewsKeys.preferences(),
    queryFn: async () => {
      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
      const response = await fetchWithAuth('/review-preferences');
      if (!response.ok) {
        throw new Error('Erro ao carregar preferências');
      }
      const result = await response.json();
      // Backend retorna { success: true, data: prefs }
      return result.success ? result.data : result;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useReviewsMetadata() {
  return useQuery({
    queryKey: reviewsKeys.metadata(),
    queryFn: async () => {
      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
      const response = await fetchWithAuth('/reviews/manage/metadata');
      if (!response.ok) throw new Error('Erro ao carregar metadados');
      const result = await response.json();
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useManageReviews(contentType?: string) {
  return useQuery({
    queryKey: reviewsKeys.manage(contentType),
    queryFn: async () => {
      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
      const url = contentType 
        ? `/reviews/manage?contentType=${contentType}`
        : '/reviews/manage';
      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error('Erro ao carregar revisões');
      const result = await response.json();
      return result.data.reviews;
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!contentType,
  });
}
