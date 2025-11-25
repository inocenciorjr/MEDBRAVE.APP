'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { errorNotebookService } from '@/services/errorNotebookService';

export const cadernoErrosKeys = {
  all: ['caderno-erros'] as const,
  entries: () => [...cadernoErrosKeys.all, 'entries'] as const,
  entry: (id: string) => [...cadernoErrosKeys.all, 'entry', id] as const,
  folders: () => [...cadernoErrosKeys.all, 'folders'] as const,
};

export function useCadernoErrosEntries() {
  return useQuery({
    queryKey: cadernoErrosKeys.entries(),
    queryFn: async () => {
      const data = await errorNotebookService.getUserEntries({});
      return data.entries || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCadernoErrosEntry(id: string) {
  return useQuery({
    queryKey: cadernoErrosKeys.entry(id),
    queryFn: async () => {
      const response = await fetch(`/api/error-notebook/${id}`);
      if (!response.ok) throw new Error('Erro ao carregar entrada');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!id,
  });
}
