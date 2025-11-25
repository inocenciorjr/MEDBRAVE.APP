import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseOptimizedDataOptions {
  cacheTime?: number; // tempo em ms para considerar cache válido
  staleTime?: number; // tempo em ms para considerar dados "stale" mas ainda usáveis
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
}

const cache = new Map<string, CacheEntry<any>>();

export function useOptimizedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseOptimizedDataOptions = {}
) {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutos
    staleTime = 30 * 1000, // 30 segundos
    refetchOnMount = true,
    refetchOnWindowFocus = false,
  } = options;

  const [data, setData] = useState<T | null>(() => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data;
    }
    return null;
  });
  
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async (force = false) => {
    // Evita múltiplas requisições simultâneas
    if (fetchingRef.current && !force) return;

    const cached = cache.get(key);
    const now = Date.now();

    // Se tem cache válido e não é forçado, usa o cache
    if (!force && cached && now - cached.timestamp < staleTime) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      cache.set(key, { data: result, timestamp: now });
      setData(result);
    } catch (err) {
      setError(err as Error);
      // Se falhar mas tem cache, usa o cache mesmo que stale
      if (cached) {
        setData(cached.data);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [key, fetcher, staleTime]);

  // Fetch inicial
  useEffect(() => {
    if (refetchOnMount || !data) {
      fetchData();
    }
  }, []);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp > staleTime) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, key, staleTime, fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  const invalidate = useCallback(() => {
    cache.delete(key);
  }, [key]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
    isStale: data ? (Date.now() - (cache.get(key)?.timestamp || 0)) > staleTime : false,
  };
}

// Função para limpar todo o cache
export function clearAllCache() {
  cache.clear();
}

// Função para limpar cache específico
export function clearCache(key: string) {
  cache.delete(key);
}
