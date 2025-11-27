'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userStatisticsService } from '@/services/userStatisticsService';
import { useAuth } from '@/lib/contexts/AuthContext';

export const statisticsKeys = {
  all: ['statistics'] as const,
  detail: (userId?: string) => [...statisticsKeys.all, 'detail', userId] as const,
};

export function useStatistics() {
  const { user, loading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: statisticsKeys.detail(user?.uid),
    queryFn: async () => {
      if (!user?.uid) {
        throw new Error('Usuário não autenticado');
      }
      return await userStatisticsService.getUserStatistics(user.uid);
    },
    enabled: !!user?.uid && !authLoading, // Só executa se tiver userId e auth não estiver carregando
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useRecalculateStatistics() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.uid) {
        throw new Error('Usuário não autenticado');
      }
      return await userStatisticsService.getUserStatistics(user.uid, { forceRecalculate: true });
    },
    onSuccess: () => {
      // Invalidar cache para forçar refetch
      queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
    },
  });
}
