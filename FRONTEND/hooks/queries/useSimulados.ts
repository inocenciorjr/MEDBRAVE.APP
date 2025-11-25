'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const simuladosKeys = {
  all: ['simulados'] as const,
  list: () => [...simuladosKeys.all, 'list'] as const,
  detail: (id: string) => [...simuladosKeys.all, 'detail', id] as const,
  results: (id: string) => [...simuladosKeys.all, 'results', id] as const,
};

export function useSimulados() {
  return useQuery({
    queryKey: simuladosKeys.list(),
    queryFn: async () => {
      const response = await fetch('/api/simulados');
      if (!response.ok) throw new Error('Erro ao carregar simulados');
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSimuladoDetail(id: string) {
  return useQuery({
    queryKey: simuladosKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/simulados/${id}`);
      if (!response.ok) throw new Error('Erro ao carregar simulado');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!id,
  });
}

export function useSimuladoResults(id: string) {
  return useQuery({
    queryKey: simuladosKeys.results(id),
    queryFn: async () => {
      const response = await fetch(`/api/simulados/${id}/results`);
      if (!response.ok) throw new Error('Erro ao carregar resultados');
      return response.json();
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
