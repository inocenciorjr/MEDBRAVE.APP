'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const officialExamsKeys = {
  all: ['official-exams'] as const,
  list: () => [...officialExamsKeys.all, 'list'] as const,
  detail: (id: string) => [...officialExamsKeys.all, 'detail', id] as const,
};

export function useOfficialExams() {
  return useQuery({
    queryKey: officialExamsKeys.list(),
    queryFn: async () => {
      try {
        const { officialExamService } = await import('@/services/officialExamService');
        const result = await officialExamService.getExamsByInstitution();
        return result || [];
      } catch (error) {
        console.error('Erro no hook useOfficialExams:', error);
        // Retorna array vazio em caso de erro para não quebrar a UI
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3, // Tenta 3 vezes antes de falhar
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
  });
}

export function useOfficialExamDetail(id: string) {
  return useQuery({
    queryKey: officialExamsKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/official-exams/${id}`);
      if (!response.ok) throw new Error('Erro ao carregar prova');
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
  });
}
