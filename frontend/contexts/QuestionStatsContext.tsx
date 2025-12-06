'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

interface QuestionStats {
  [questionId: string]: any;
}

interface QuestionStatsContextType {
  stats: QuestionStats;
  loadingStats: Set<string>;
  preloadStats: (questionIds: string[], answeredQuestionIds?: string[]) => Promise<void>;
  getStats: (questionId: string) => any;
  isLoading: (questionId: string) => boolean;
  invalidateStats: (questionId: string) => void;
}

const QuestionStatsContext = createContext<QuestionStatsContextType | undefined>(undefined);

export function QuestionStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<QuestionStats>({});
  const [loadingStats, setLoadingStats] = useState<Set<string>>(new Set());

  const preloadStats = useCallback(async (questionIds: string[], answeredQuestionIds?: string[]) => {
    // Se answeredQuestionIds foi fornecido, só carregar stats das questões já respondidas
    // Isso evita carregar stats de questões que o usuário ainda não respondeu
    let idsToConsider = questionIds;
    if (answeredQuestionIds) {
      const answeredSet = new Set(answeredQuestionIds);
      idsToConsider = questionIds.filter(id => answeredSet.has(id));
    }
    
    // Filtrar apenas IDs que ainda não foram carregados
    const idsToLoad = idsToConsider.filter(id => !stats[id] && !loadingStats.has(id));
    
    if (idsToLoad.length === 0) {
      return;
    }

    // Marcar como carregando
    setLoadingStats(prev => {
      const newSet = new Set(prev);
      idsToLoad.forEach(id => newSet.add(id));
      return newSet;
    });

    try {
      // Dividir em batches de 50 (limite do backend)
      const BATCH_SIZE = 50;
      const batches: string[][] = [];
      
      for (let i = 0; i < idsToLoad.length; i += BATCH_SIZE) {
        batches.push(idsToLoad.slice(i, i + BATCH_SIZE));
      }

      // Processar todos os batches em paralelo
      const batchPromises = batches.map(async (batch) => {
        const response = await fetchWithAuth('/questions/stats/batch', {
          method: 'POST',
          body: JSON.stringify({ questionIds: batch }),
        });
        return response.json();
      });

      const results = await Promise.all(batchPromises);
      
      // Combinar todos os resultados
      const allStats: Record<string, any> = {};
      results.forEach(data => {
        if (data.success && data.data) {
          Object.assign(allStats, data.data);
        }
      });
      
      setStats(prev => {
        const newStats = { ...prev, ...allStats };
        return newStats;
      });
    } catch (error) {
      console.error('Erro ao carregar stats em batch:', error);
    } finally {
      // Remover todos os IDs do loading
      setLoadingStats(prev => {
        const newSet = new Set(prev);
        idsToLoad.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  }, [stats, loadingStats]);

  const getStats = useCallback((questionId: string) => {
    return stats[questionId];
  }, [stats]);

  const isLoading = useCallback((questionId: string) => {
    return loadingStats.has(questionId);
  }, [loadingStats]);

  // Invalidar stats de uma questão (força recarregar na próxima vez)
  const invalidateStats = useCallback((questionId: string) => {
    setStats(prev => {
      const newStats = { ...prev };
      delete newStats[questionId];
      return newStats;
    });
  }, []);

  return (
    <QuestionStatsContext.Provider value={{ stats, loadingStats, preloadStats, getStats, isLoading, invalidateStats }}>
      {children}
    </QuestionStatsContext.Provider>
  );
}

export function useQuestionStats() {
  const context = useContext(QuestionStatsContext);
  if (!context) {
    throw new Error('useQuestionStats must be used within QuestionStatsProvider');
  }
  return context;
}
