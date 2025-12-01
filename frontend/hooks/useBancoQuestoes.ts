import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import {
  getRootFilters,
  getFilterHierarchy,
  getSubfiltersByFilter,
  countQuestionsByFilter,
  searchQuestions,
  getAvailableYears,
  getInstitutionHierarchy,
  Filter,
  FilterHierarchy,
  SubFilter,
  SearchQuestionsParams,
  SearchQuestionsResponse,
} from '@/services/bancoQuestoesService';

/**
 * Hook para buscar filtros raiz
 */
export function useRootFilters() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFilters() {
      try {
        setLoading(true);
        const data = await getRootFilters();
        setFilters(data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar filtros');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchFilters();
  }, []);

  return { filters, loading, error };
}

/**
 * Hook para buscar hierarquia completa de filtros
 */
export function useFilterHierarchy() {
  const [hierarchy, setHierarchy] = useState<FilterHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHierarchy() {
      try {
        setLoading(true);
        const data = await getFilterHierarchy();
        setHierarchy(data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar hierarquia de filtros');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchHierarchy();
  }, []);

  return { hierarchy, loading, error };
}

/**
 * Hook para buscar subfiltros de um filtro
 */
export function useSubfilters(filterId: string | null, level?: number) {
  const [subfilters, setSubfilters] = useState<SubFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filterId) {
      setSubfilters([]);
      return;
    }

    async function fetchSubfilters() {
      if (!filterId) return;
      
      try {
        setLoading(true);
        const data = await getSubfiltersByFilter(filterId, level);
        setSubfilters(data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar subfiltros');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSubfilters();
  }, [filterId, level]);

  return { subfilters, loading, error };
}

/**
 * Hook para contar questões por filtro individual (deprecated - use useQuestionCount)
 */
export function useQuestionCountByFilter(filterId: string | null) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filterId) {
      setCount(0);
      return;
    }

    async function fetchCount() {
      if (!filterId) return;
      
      try {
        setLoading(true);
        const data = await countQuestionsByFilter(filterId);
        setCount(data);
        setError(null);
      } catch (err) {
        setError('Erro ao contar questões');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchCount();
  }, [filterId]);

  return { count, loading, error };
}

/**
 * Hook para buscar questões com filtros
 */
export function useSearchQuestions(params: SearchQuestionsParams) {
  const [result, setResult] = useState<SearchQuestionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (searchParams: SearchQuestionsParams) => {
    try {
      setLoading(true);
      const data = await searchQuestions(searchParams);
      setResult(data);
      setError(null);
    } catch (err) {
      setError('Erro ao buscar questões');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Só busca se tiver pelo menos um filtro selecionado
    if (params.filterIds?.length || params.subFilterIds?.length) {
      search(params);
    }
  }, [
    JSON.stringify(params.filterIds),
    JSON.stringify(params.subFilterIds),
    JSON.stringify(params.years),
    JSON.stringify(params.institutions),
    params.page,
    params.limit,
  ]);

  return { result, loading, error, search };
}

/**
 * Hook para obter anos disponíveis com hierarquia
 */
export function useAvailableYears() {
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchYears() {
      try {
        setLoading(true);
        const data = await getAvailableYears();
        setYears(data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar anos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchYears();
  }, []);

  return { years, loading, error };
}

/**
 * Hook para contar questões em tempo real baseado nos filtros selecionados
 * Usa React Query para cache automático e otimização
 */
export function useQuestionCount(params: SearchQuestionsParams) {
  const [mounted, setMounted] = useState(false);

  // Detectar quando o componente está montado no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Verificar se tem filtros selecionados
  const hasFilters = 
    (params.filterIds && params.filterIds.length > 0) ||
    (params.subFilterIds && params.subFilterIds.length > 0) ||
    (params.years && params.years.length > 0) ||
    (params.institutions && params.institutions.length > 0);

  // Criar uma chave única baseada nos filtros
  const queryKey = [
    'question-count',
    params.filterIds?.sort(),
    params.subFilterIds?.sort(),
    params.years?.sort(),
    params.institutions?.sort(),
  ];

  // Usar React Query para buscar e cachear a contagem
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.post('/banco-questoes/questions/count', params);
      return response.data.data.count as number;
    },
    enabled: mounted && hasFilters, // Só executar se montado e tiver filtros
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
    gcTime: 5 * 60 * 1000, // Manter no cache por 5 minutos
    placeholderData: (previousData) => previousData, // Manter valor anterior enquanto carrega
  });

  // Se não tem filtros, retornar 0
  if (!hasFilters) {
    return { count: 0, loading: false, isFetching: false, error: null };
  }

  return {
    count: data ?? 0,
    loading: isLoading, // true apenas na primeira carga (sem dados)
    isFetching, // true sempre que está buscando (mesmo com dados em cache)
    error: error ? 'Erro ao contar questões' : null,
  };
}

/**
 * Hook para obter hierarquia de instituições
 */
export function useInstitutionHierarchy() {
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHierarchy() {
      try {
        setLoading(true);
        const data = await getInstitutionHierarchy();
        setHierarchy(data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar instituições');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchHierarchy();
  }, []);

  return { hierarchy, loading, error };
}
