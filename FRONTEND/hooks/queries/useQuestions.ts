'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const questionsKeys = {
  all: ['questions'] as const,
  lists: () => [...questionsKeys.all, 'lists'] as const,
  list: (id: string) => [...questionsKeys.all, 'list', id] as const,
  banco: (filters: any) => [...questionsKeys.all, 'banco', filters] as const,
  session: (id: string) => [...questionsKeys.all, 'session', id] as const,
};

export function useQuestionLists() {
  return useQuery({
    queryKey: questionsKeys.lists(),
    queryFn: async () => {
      const response = await fetch('/api/questions/lists');
      if (!response.ok) throw new Error('Erro ao carregar listas');
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useBancoQuestoes(filters: any) {
  return useQuery({
    queryKey: questionsKeys.banco(filters),
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/questions/banco?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar questões');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: Object.keys(filters).length > 0,
  });
}

export function useQuestionSession(id: string) {
  return useQuery({
    queryKey: questionsKeys.session(id),
    queryFn: async () => {
      const response = await fetch(`/api/questions/session/${id}`);
      if (!response.ok) throw new Error('Erro ao carregar sessão');
      return response.json();
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
