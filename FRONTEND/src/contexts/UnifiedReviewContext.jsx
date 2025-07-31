import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { unifiedReviewService } from '../services/unifiedReviewService';
import { useAuth } from './AuthContext';
import { CACHE_CONFIG } from '../config/cacheConfig';

// ✅ MELHORIA 1: Configurações otimizadas de cache e debounce
const DEBOUNCE_DELAY = 1000; // Reduzido para 1 segundo (mais responsivo)
const AGGRESSIVE_DEBOUNCE = 500; // Debounce agressivo para recordReviewResult
const CACHE_DURATION = CACHE_CONFIG.TTL.SEARCH_RESULTS; // 5 minutos via config

// ✅ MELHORIA 1: Cache global unificado para todos os tipos de dados
const globalCache = {
  dueReviews: { data: null, timestamp: 0, promise: null, debounceTimer: null },
  dailySummary: { data: null, timestamp: 0, promise: null, debounceTimer: null },
  todayReviews: { data: null, timestamp: 0, promise: null, debounceTimer: null },
  allReviews: { data: null, timestamp: 0, promise: null, debounceTimer: null },
  // Cache para componentes individuais de getAllReviews
  completedReviews: { data: null, timestamp: 0, promise: null },
  futureReviews: { data: null, timestamp: 0, promise: null },
  recordReviewDebounceTimer: null // ✅ Timer para debounce agressivo de recordReviewResult
};

// Função para limpar timers de debounce
const clearDebounceTimer = (cacheKey) => {
  if (globalCache[cacheKey]?.debounceTimer) {
    clearTimeout(globalCache[cacheKey].debounceTimer);
    globalCache[cacheKey].debounceTimer = null;
  }
};

/**
 * Contexto global para gerenciar revisões unificadas
 */
const UnifiedReviewContext = createContext({
  dueReviews: [],
  dailySummary: null,
  filteredReviews: [],
  loading: false,
  error: null,
  
  // Novos estados para todas as revisões
  allReviews: null,
  completedReviews: [],
  futureReviews: [],
  
  loadDueReviews: () => {},
  loadDailySummary: () => {},
  loadAllReviews: () => {},
  recordReviewResult: () => {},
  activeFilter: 'all',
  lastFetch: null,
  applyFilter: () => {},
  refresh: () => {},
  loadDashboardData: () => {},
  clearCache: () => {},
  isInitialized: false,
  CACHE_DURATION: 0
});

export const UnifiedReviewProvider = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dueReviews, setDueReviews] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastFetch, setLastFetch] = useState(null); // Cache timestamp
  const [pendingRequest, setPendingRequest] = useState(false); // Debouncing flag

  // Função para inicialização lazy - definida sem dependências circulares
  const initializeIfNeeded = useCallback(async () => {
    if (!user?.uid || isInitialized) return;
    
    // Inicialização lazy removida
    setIsInitialized(true);
    
    // Não chamar as funções aqui para evitar dependência circular
    // A inicialização real acontecerá quando as funções forem chamadas
  }, [user?.uid, isInitialized]);

  // Função para carregar resumo diário com cache global
  const loadDailySummary = useCallback(async (force = false) => {
    if (!user?.uid) return;
    
    // Inicializar se necessário
    if (!isInitialized && !force) {
      initializeIfNeeded();
    }
    
    const now = Date.now();
    const cache = globalCache.dailySummary;
    
    // Verificar cache válido
    if (!force && cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      // Usando cache para dailySummary
      setDailySummary(cache.data);
      return cache.data;
    }
    
    // Se já há uma promise em andamento, aguardar ela
    if (cache.promise) {
      // Aguardando promise existente
      try {
        const result = await cache.promise;
        setDailySummary(result);
        return result;
      } catch (error) {
        // Se falhar, limpar cache e tentar novamente
        cache.promise = null;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Carregando dailySummary do servidor
      
      // Criar nova promise e armazenar no cache
      cache.promise = unifiedReviewService.getDailySummary();
      const summary = await cache.promise;
      
      // Atualizar cache
      cache.data = summary;
      cache.timestamp = now;
      cache.promise = null;
      
      // DailySummary recebido
      
      setDailySummary(summary);
      
      // Estado após setDailySummary verificado
      return summary;
    } catch (err) {
      console.error('Erro ao carregar resumo diário:', err);
      cache.promise = null;
      setError(err.message || 'Erro ao carregar resumo diário');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, isInitialized, initializeIfNeeded]);

  // Função para carregar revisões pendentes com cache global
  const loadDueReviews = useCallback(async (limit = 200, force = false) => {
    if (!user?.uid) return;
    
    // Inicializar se necessário
    if (!isInitialized && !force) {
      initializeIfNeeded();
    }
    
    const now = Date.now();
    const cache = globalCache.dueReviews;
    
    // ✅ CORREÇÃO: Cache mais restritivo para evitar duplicações
    if (!force && cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      // Usando cache para dueReviews
      setDueReviews(cache.data);
      return cache.data;
    }
    
    // ✅ CORREÇÃO: Evitar múltiplas requisições simultâneas
    if (cache.promise && !force) {
      // Aguardando promise existente
      try {
        const result = await cache.promise;
        setDueReviews(result || []);
        return result;
      } catch (error) {
        console.error('❌ [UnifiedReview] Erro na promise existente:', error);
        cache.promise = null;
      }
    }
    
    // ✅ CORREÇÃO: Limpar promise anterior se forçando refresh
    if (force && cache.promise) {
      cache.promise = null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Carregando dueReviews do servidor
      
      // Criar nova promise e armazenar no cache
      cache.promise = unifiedReviewService.getDueReviews(limit);
      const reviews = await cache.promise;
      
      // Atualizar cache
      cache.data = reviews || [];
      cache.timestamp = now;
      cache.promise = null;
      
      setDueReviews(reviews || []);
      // Revisões carregadas
      return reviews;
    } catch (err) {
      console.error('Erro ao carregar revisões pendentes:', err);
      cache.promise = null;
      setError(err.message || 'Erro ao carregar revisões pendentes');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, isInitialized, initializeIfNeeded]);

  // Cache para revisões de hoje
  const todayReviewsCache = useRef({ data: null, timestamp: null, promise: null });
  const [todayReviews, setTodayReviews] = useState([]);
  
  // Cache para todas as revisões (página de revisões)
  const allReviewsCache = useRef({ data: null, timestamp: null, promise: null });
  const [allReviews, setAllReviews] = useState({ pending: [], completed: [], future: [] });
  const [completedReviews, setCompletedReviews] = useState([]);
  const [futureReviews, setFutureReviews] = useState([]);

  // Função para limpar cache
  const clearCache = useCallback(() => {
    globalCache.dueReviews.data = null;
    globalCache.dueReviews.timestamp = 0;
    globalCache.dailySummary.data = null;
    globalCache.dailySummary.timestamp = 0;
    todayReviewsCache.current = { data: null, timestamp: null, promise: null };
    allReviewsCache.current = { data: null, timestamp: null, promise: null };
    setDueReviews([]);
    setTodayReviews([]);
    setAllReviews({ pending: [], completed: [], future: [] });
    setCompletedReviews([]);
    setFutureReviews([]);
    setDailySummary(null);
    setLastFetch(null);
    console.log('🧹 [UnifiedReviewContext] Cache limpo');
  }, []);

  // Função para carregar apenas revisões de hoje (otimizada para dashboard)
  const loadTodayReviews = useCallback(async (force = false) => {
    if (!user?.uid) return [];
    
    // Inicializar se necessário
    if (!isInitialized) {
      await initializeIfNeeded();
    }
    
    const cache = todayReviewsCache.current;
    const now = Date.now();
    
    // Verificar cache válido (5 minutos)
    if (!force && cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      setTodayReviews(cache.data);
      return cache.data;
    }
    
    // Se já há uma promise em andamento, aguardar ela
    if (cache.promise) {
      try {
        const result = await cache.promise;
        setTodayReviews(result);
        return result;
      } catch (error) {
        cache.promise = null;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Criar nova promise e armazenar no cache
      cache.promise = unifiedReviewService.getTodayReviews(50);
      const reviews = await cache.promise;
      
      // Atualizar cache
      cache.data = reviews;
      cache.timestamp = now;
      cache.promise = null;
      
      setTodayReviews(reviews);
      return reviews;
    } catch (err) {
      console.error('Erro ao carregar revisões de hoje:', err);
      cache.promise = null;
      setError(err.message || 'Erro ao carregar revisões de hoje');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, isInitialized, initializeIfNeeded]);

  // ✅ MELHORIA 2: Função otimizada para carregar todas as revisões reutilizando dados existentes
  const loadAllReviews = useCallback(async (force = false) => {
    if (!user?.uid) return { pending: [], completed: [], future: [] };
    
    // Inicializar se necessário
    if (!isInitialized) {
      await initializeIfNeeded();
    }
    
    const now = Date.now();
    
    // ✅ OTIMIZAÇÃO: Verificar cache global unificado primeiro
    if (!force && globalCache.allReviews.data && (now - globalCache.allReviews.timestamp) < CACHE_DURATION) {
      console.log('⚡ [UnifiedReviewContext] Usando cache global de todas as revisões');
      const cachedData = globalCache.allReviews.data;
      setAllReviews(cachedData);
      setCompletedReviews(cachedData.completed);
      setFutureReviews(cachedData.future);
      return cachedData;
    }
    
    // ✅ OTIMIZAÇÃO: Tentar reutilizar dados existentes de caches individuais
    if (!force) {
      const canReuseData = {
        pending: globalCache.dueReviews.data && (now - globalCache.dueReviews.timestamp) < CACHE_DURATION,
        completed: globalCache.completedReviews.data && (now - globalCache.completedReviews.timestamp) < CACHE_DURATION,
        future: globalCache.futureReviews.data && (now - globalCache.futureReviews.timestamp) < CACHE_DURATION
      };
      
      // Se temos pelo menos 2 dos 3 tipos de dados em cache, reutilizar
      const validCaches = Object.values(canReuseData).filter(Boolean).length;
      if (validCaches >= 2) {
        console.log('🔄 [UnifiedReviewContext] Reutilizando dados existentes de caches individuais');
        const reusedData = {
          pending: canReuseData.pending ? globalCache.dueReviews.data : [],
          completed: canReuseData.completed ? globalCache.completedReviews.data : [],
          future: canReuseData.future ? globalCache.futureReviews.data : []
        };
        
        // Fazer apenas as requisições necessárias para dados faltantes
        const missingRequests = [];
        if (!canReuseData.pending) missingRequests.push('pending');
        if (!canReuseData.completed) missingRequests.push('completed');
        if (!canReuseData.future) missingRequests.push('future');
        
        if (missingRequests.length > 0) {
          console.log('🔍 [UnifiedReviewContext] Carregando apenas dados faltantes:', missingRequests);
          // Fazer requisições seletivas apenas para dados faltantes
          const promises = missingRequests.map(type => {
            switch (type) {
              case 'pending': return unifiedReviewService.getDueReviews(500);
              case 'completed': return unifiedReviewService.getCompletedReviews({ limit: 100, days: 30 });
              case 'future': return unifiedReviewService.getFutureReviews({ limit: 200 });
              default: return Promise.resolve([]);
            }
          });
          
          const results = await Promise.all(promises);
          missingRequests.forEach((type, index) => {
            reusedData[type] = results[index];
            // Atualizar cache individual
            if (type === 'pending') {
              globalCache.dueReviews.data = results[index];
              globalCache.dueReviews.timestamp = now;
            } else {
              globalCache[`${type}Reviews`].data = results[index];
              globalCache[`${type}Reviews`].timestamp = now;
            }
          });
        }
        
        // Atualizar cache global e estados
        globalCache.allReviews.data = reusedData;
        globalCache.allReviews.timestamp = now;
        setAllReviews(reusedData);
        setCompletedReviews(reusedData.completed);
        setFutureReviews(reusedData.future);
        return reusedData;
      }
    }
    
    // Se já há uma promise em andamento, aguardar ela
    if (globalCache.allReviews.promise) {
      try {
        const result = await globalCache.allReviews.promise;
        setAllReviews(result);
        setCompletedReviews(result.completed);
        setFutureReviews(result.future);
        return result;
      } catch (error) {
        globalCache.allReviews.promise = null;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 [UnifiedReviewContext] Carregando todas as revisões do servidor (requisição completa)...');
      
      // Criar nova promise e armazenar no cache global
      globalCache.allReviews.promise = unifiedReviewService.getAllReviews();
      const allReviewsData = await globalCache.allReviews.promise;
      
      // Processar revisões pendentes para incluir atrasadas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const processedPending = allReviewsData.pending.filter(item => {
        if (!item.due) return true; // Se não tem data, considerar pendente
        
        try {
          let dueDate;
          if (item.due.toDate && typeof item.due.toDate === 'function') {
            dueDate = item.due.toDate();
          } else if (item.due.seconds) {
            dueDate = new Date(item.due.seconds * 1000);
          } else if (typeof item.due === 'string') {
            dueDate = new Date(item.due);
          } else if (typeof item.due === 'number') {
            dueDate = item.due > 1000000000000 ? new Date(item.due) : new Date(item.due * 1000);
          } else {
            dueDate = new Date(item.due);
          }
          
          if (isNaN(dueDate.getTime())) return true;
          dueDate.setHours(0, 0, 0, 0);
          
          // Incluir revisões de hoje e anteriores (atrasadas)
          return dueDate <= today;
        } catch (e) {
          return true; // Em caso de erro, incluir na lista
        }
      });
      
      const processedData = {
        pending: processedPending,
        completed: allReviewsData.completed,
        future: allReviewsData.future
      };
      
      // ✅ OTIMIZAÇÃO: Atualizar cache global unificado e caches individuais
      globalCache.allReviews.data = processedData;
      globalCache.allReviews.timestamp = now;
      globalCache.allReviews.promise = null;
      
      // Atualizar caches individuais para reutilização futura
      globalCache.dueReviews.data = processedData.pending;
      globalCache.dueReviews.timestamp = now;
      globalCache.completedReviews.data = processedData.completed;
      globalCache.completedReviews.timestamp = now;
      globalCache.futureReviews.data = processedData.future;
      globalCache.futureReviews.timestamp = now;
      
      setAllReviews(processedData);
      setDueReviews(processedData.pending);
      setCompletedReviews(processedData.completed);
      setFutureReviews(processedData.future);
      
      console.log('✅ [UnifiedReviewContext] Todas as revisões carregadas e cache atualizado:', {
        pending: processedData.pending.length,
        completed: processedData.completed.length,
        future: processedData.future.length
      });
      
      return processedData;
    } catch (err) {
      console.error('❌ [UnifiedReviewContext] Erro ao carregar todas as revisões:', err);
      cache.promise = null;
      setError(err.message || 'Erro ao carregar revisões');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, isInitialized, initializeIfNeeded]);

  // Função otimizada para carregar dados do dashboard
  const loadDashboardData = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Opção 1: Carregar apenas revisões de hoje (mais eficiente)
      const todayReviewsData = await loadTodayReviews();
      
      // Criar um summary básico baseado nas revisões de hoje
      const basicSummary = {
        todayItems: todayReviewsData.length,
        todayReviews: todayReviewsData,
        flashcards: todayReviewsData.filter(r => r.contentType === 'FLASHCARD').length,
        questions: todayReviewsData.filter(r => r.contentType === 'QUESTION').length,
        errorNotes: todayReviewsData.filter(r => r.contentType === 'ERROR_NOTEBOOK').length,
        estimatedTimeMinutes: Math.round(
          (todayReviewsData.filter(r => r.contentType === 'FLASHCARD').length * 1.5) +
          (todayReviewsData.filter(r => r.contentType === 'QUESTION').length * 2.5) +
          (todayReviewsData.filter(r => r.contentType === 'ERROR_NOTEBOOK').length * 2.0)
        )
      };
      
      setDailySummary(basicSummary);
      setLastFetch(Date.now());
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, loadTodayReviews]);

  // ✅ MELHORIA 3: Função para registrar resultado de revisão com debounce agressivo
  const recordReviewResult = useCallback(async (reviewId, result, contentType, reviewTimeMs) => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Registrar a revisão
      const recordResult = await unifiedReviewService.recordReview(
        reviewId, 
        result, 
        reviewTimeMs, 
        contentType
      );
      
      // ✅ OTIMIZAÇÃO: Invalidar cache de forma mais seletiva
      globalCache.dueReviews.data = null;
      globalCache.dueReviews.timestamp = 0;
      globalCache.dailySummary.data = null;
      globalCache.dailySummary.timestamp = 0;
      globalCache.todayReviews.data = null;
      globalCache.todayReviews.timestamp = 0;
      
      // ✅ DEBOUNCE AGRESSIVO: Limpar timer anterior se existir
      if (globalCache.recordReviewDebounceTimer) {
        clearTimeout(globalCache.recordReviewDebounceTimer);
      }
      
      // ✅ DEBOUNCE AGRESSIVO: Aguardar AGGRESSIVE_DEBOUNCE antes de atualizar
      globalCache.recordReviewDebounceTimer = setTimeout(async () => {
        try {
          console.log('🔄 [UnifiedReviewContext] Atualizando dados após debounce de revisões');
          const [reviews, summary] = await Promise.all([
            loadDueReviews(200, true),
            loadDailySummary(true)
          ]);
          setLastFetch(Date.now());
          globalCache.recordReviewDebounceTimer = null;
        } catch (error) {
          console.error('❌ [UnifiedReview] Erro ao atualizar após revisão:', error);
          globalCache.recordReviewDebounceTimer = null;
        }
      }, AGGRESSIVE_DEBOUNCE); // 500ms de debounce agressivo
      
      return recordResult;
    } catch (err) {
      console.error('❌ [UnifiedReview] Erro ao registrar revisão:', err);
      setError(err.message || 'Erro ao registrar revisão');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, loadDueReviews, loadDailySummary]);

  // Função para aplicar filtros
  const applyFilter = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  // ✅ MELHORIA 4: Função para atualizar dados (refresh) otimizada com execução em paralelo
  const refresh = useCallback(async (force = false) => {
    if (!user?.uid) return;
    
    console.log('🔄 [UnifiedReviewContext] Refresh solicitado', { force, pendingRequest });
    
    // ✅ OTIMIZAÇÃO: Controle mais rigoroso de requisições duplicadas
    if (pendingRequest && !force) {
      console.log('⏸️ [UnifiedReviewContext] Refresh já em andamento, ignorando');
      return;
    }
    
    try {
      setPendingRequest(true);
      setLoading(true);
      setError(null);
      
      // ✅ OTIMIZAÇÃO: Invalidar cache de forma seletiva se forçando refresh
      if (force) {
        console.log('🧹 [UnifiedReviewContext] Invalidando cache devido ao force=true');
        globalCache.dueReviews.data = null;
        globalCache.dueReviews.timestamp = 0;
        globalCache.dailySummary.data = null;
        globalCache.dailySummary.timestamp = 0;
        globalCache.todayReviews.data = null;
        globalCache.todayReviews.timestamp = 0;
      }
      
      // ✅ EXECUÇÃO EM PARALELO: loadDueReviews() + loadDailySummary() conforme solicitado
      console.log('⚡ [UnifiedReviewContext] Executando loadDueReviews + loadDailySummary em paralelo');
      const [reviews, summary] = await Promise.all([
        loadDueReviews(200, force),
        loadDailySummary(force)
      ]);
      
      setLastFetch(Date.now());
      
      console.log('✅ [UnifiedReviewContext] Refresh concluído com sucesso', {
        reviewsCount: reviews?.length || 0,
        summaryItems: summary?.todayItems || 0
      });
      
      return { reviews, summary };
    } catch (err) {
      console.error('❌ [UnifiedReview] Erro no refresh:', err);
      setError(err.message || 'Erro ao atualizar dados');
      throw err;
    } finally {
      setLoading(false);
      setPendingRequest(false);
    }
  }, [user?.uid, pendingRequest, loadDueReviews, loadDailySummary]);



  // Aplicar filtro quando dueReviews mudar
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredReviews(dueReviews);
    } else {
      const filtered = dueReviews.filter(review => {
        switch (activeFilter) {
          case 'flashcards':
            return review.contentType === 'FLASHCARD';
          case 'questions':
            return review.contentType === 'QUESTION';
          case 'error-notes':
            return review.contentType === 'ERROR_NOTE';
          case 'overdue':
            const now = new Date();
            const dueDate = review.dueDate || review.nextReviewDate || review.nextReviewAt;
            if (!dueDate) return false;
            
            let reviewDate;
            if (dueDate.toDate && typeof dueDate.toDate === 'function') {
              reviewDate = dueDate.toDate();
            } else if (dueDate instanceof Date) {
              reviewDate = dueDate;
            } else {
              reviewDate = new Date(dueDate);
            }
            
            return reviewDate < now;
          default:
            return true;
        }
      });
      setFilteredReviews(filtered);
    }
  }, [dueReviews, activeFilter]);

  // DEBUG: Monitorar mudanças no dailySummary removido

  // ✅ CORREÇÃO: Apenas limpar dados quando usuário sair - não carregar automaticamente
  useEffect(() => {
    if (user?.uid && !isInitialized) {
      // Usuário autenticado, contexto inicializado
      setIsInitialized(true);
    } else if (!user?.uid) {
      // Limpar dados quando usuário sair
      setDueReviews([]);
      setDailySummary(null);
      setFilteredReviews([]);
      setActiveFilter('all');
      setIsInitialized(false);
      setLastFetch(null);
      setError(null);
    }
  }, [user?.uid, isInitialized]);

  const value = {
    // Estados
    loading,
    error,
    dueReviews,
    todayReviews,
    dailySummary,
    filteredReviews,
    activeFilter,
    isInitialized,
    
    // Novos estados para todas as revisões
    allReviews,
    completedReviews,
    futureReviews,
    
    // Funções
    loadDueReviews,
    loadTodayReviews,
    loadDailySummary,
    loadDashboardData,
    loadAllReviews,
    recordReviewResult,
    applyFilter,
    refresh,
    clearCache,
    
    // Utilitários
    lastFetch,
    CACHE_DURATION
  };
  
  // DEBUG: Log do valor do contexto removido
  
  // DEBUG: Verificação da estrutura do value removida
  
  // DEBUG: Teste de verificação do value removido

  return (
    <UnifiedReviewContext.Provider value={value}>
      {children}
    </UnifiedReviewContext.Provider>
  );
};

export const useUnifiedReview = () => {
  const context = useContext(UnifiedReviewContext);
  if (!context) {
    throw new Error('useUnifiedReview deve ser usado dentro de UnifiedReviewProvider');
  }
  return context;
};

export default UnifiedReviewContext;