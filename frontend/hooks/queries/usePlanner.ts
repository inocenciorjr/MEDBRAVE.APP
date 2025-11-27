'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const plannerKeys = {
  all: ['planner'] as const,
  events: (startDate: string, endDate: string) => [...plannerKeys.all, 'events', startDate, endDate] as const,
  summary: () => [...plannerKeys.all, 'summary'] as const,
};

export function usePlannerEvents(startDate: string, endDate: string) {
  return useQuery({
    queryKey: plannerKeys.events(startDate, endDate),
    queryFn: async () => {
      const response = await fetch(`/api/planner/events?start=${startDate}&end=${endDate}`);
      if (!response.ok) throw new Error('Erro ao carregar eventos');
      return response.json();
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!startDate && !!endDate,
  });
}

export function usePlannerSummary() {
  return useQuery({
    queryKey: plannerKeys.summary(),
    queryFn: async () => {
      const response = await fetch('/api/planner/summary');
      if (!response.ok) throw new Error('Erro ao carregar resumo');
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
