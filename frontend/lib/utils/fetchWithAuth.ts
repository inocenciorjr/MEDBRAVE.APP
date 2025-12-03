/**
 * Utilitário para requisições HTTP autenticadas
 * 
 * Este módulo fornece uma função otimizada para fazer requisições HTTP
 * com autenticação automática, incluindo:
 * - Cache de tokens
 * - Pool de requisições para evitar duplicatas
 * - Retry automático em caso de token expirado
 * - Estatísticas de performance
 * - Timeout de 30 segundos
 * 
 * @module lib/utils/fetchWithAuth
 */

import { createClient } from '@/lib/supabase/client';
import { supabaseAuthService } from '@/lib/services/supabaseAuthService';
import type { TokenCache, FetchStats } from '@/lib/types/auth';

const supabase = createClient();

/**
 * Duração do cache de tokens em milissegundos (4 minutos)
 * Reduzido para garantir que tokens sejam renovados antes de expirar
 */
const TOKEN_CACHE_DURATION = 4 * 60 * 1000;

/**
 * Cache global de tokens com timestamp e promise de refresh
 * Chave: user.id
 * Valor: { token, timestamp, refreshPromise }
 */
const tokenCache = new Map<string, TokenCache>();

/**
 * Pool de requisições para evitar duplicatas
 * Chave: método:url:body
 * Valor: Promise<Response>
 */
const requestPool = new Map<string, Promise<Response>>();

/**
 * Estatísticas de performance das requisições
 */
const stats = {
  requests: 0,
  cacheHits: 0,
  tokenRefreshes: 0,
  errors: 0,
  avgResponseTime: 0,
  responseTimes: [] as number[]
};

/**
 * Flag que indica se o estado de autenticação já foi inicializado
 * Após a primeira verificação, não precisa mais aguardar
 */
let authReady = false;

/**
 * Promise que garante que o estado de autenticação está pronto
 * Inicializada apenas uma vez na primeira chamada
 */
let authReadyPromise: Promise<void> | null = null;

/**
 * Cache do usuário atual para evitar chamadas repetidas ao Supabase
 */
let cachedUser: any = null;
let cachedUserTimestamp = 0;
const USER_CACHE_DURATION = 5000; // 5 segundos para getSession()
const USER_REVALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutos para revalidação com getUser()
let lastRevalidationTimestamp = 0;

/**
 * Garante que o estado de autenticação do Supabase está inicializado
 * 
 * OTIMIZADO: Após a primeira verificação, retorna imediatamente
 * sem bloquear requisições subsequentes.
 * 
 * @returns Promise que resolve quando o estado está pronto
 * @private
 */
function ensureAuthReady(): Promise<void> {
  // Se já foi inicializado, retornar imediatamente
  if (authReady) {
    return Promise.resolve();
  }
  
  // Se já tem promise em andamento, retornar ela
  if (authReadyPromise) {
    return authReadyPromise;
  }
  
  // Criar nova promise de inicialização OTIMIZADA
  authReadyPromise = new Promise((resolve) => {
    // Verificar se já tem sessão imediatamente (síncrono se possível)
    supabase.auth.getSession().then(({ data: { session } }) => {
      authReady = true; // Marcar como pronto
      resolve();
    }).catch(() => {
      // Em caso de erro, marcar como pronto mesmo assim
      authReady = true;
      resolve();
    });
  });
  
  return authReadyPromise;
}

/**
 * Realiza requisição HTTP autenticada com otimizações
 * 
 * Esta função adiciona automaticamente o token de autenticação às requisições,
 * implementa retry em caso de token expirado, usa pool de requisições para
 * evitar duplicatas, e coleta estatísticas de performance.
 * 
 * Características:
 * - Aguarda inicialização do estado de autenticação
 * - Adiciona Authorization header automaticamente
 * - Pool de requisições GET para evitar duplicatas
 * - Retry automático em caso de 401 (token expirado)
 * - Timeout de 30 segundos
 * - Fallback para token em cache em caso de erro de quota
 * - Coleta de estatísticas de performance
 * 
 * @param input - URL ou Request object
 * @param init - Opções da requisição (método, headers, body, etc)
 * @returns Promise com Response da requisição
 * @throws Error se usuário não estiver autenticado ou requisição falhar
 * 
 * @example
 * ```typescript
 * // GET request
 * const response = await fetchWithAuth('/api/users');
 * const users = await response.json();
 * 
 * // POST request
 * const response = await fetchWithAuth('/api/users', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'João' })
 * });
 * ```
 */
export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const startTime = performance.now();
  let url = typeof input === 'string' ? input : input.toString();

  // Transformar URL para usar proxy do Next.js
  if (!url.startsWith('http') && !url.startsWith('/api')) {
    url = `/api${url.startsWith('/') ? '' : '/'}${url}`;
  }

  // Aguardar inicialização do estado de autenticação
  const authReadyStart = performance.now();
  await ensureAuthReady();
  const authReadyEnd = performance.now();

  // Obter usuário atual (OTIMIZADO com revalidação periódica)
  const getUserStart = performance.now();
  let user = cachedUser;
  const now = Date.now();
  
  // Verificar se precisa revalidar com o servidor (a cada 5 minutos)
  const needsRevalidation = (now - lastRevalidationTimestamp) > USER_REVALIDATION_INTERVAL;
  
  // Verificar se o cache está válido
  if (!cachedUser || (now - cachedUserTimestamp) > USER_CACHE_DURATION) {
    if (needsRevalidation) {
      // SEGURANÇA: A cada 5 minutos, validar com o servidor
      const { data: { user: validatedUser } } = await supabase.auth.getUser();
      user = validatedUser;
      lastRevalidationTimestamp = now;
    } else {
      // PERFORMANCE: Usar getSession() para leitura rápida do localStorage
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user || null;
    }
    
    cachedUser = user;
    cachedUserTimestamp = now;
  }
  
  const getUserEnd = performance.now();

  if (!user) {
    console.error('❌ [fetchWithAuth] Usuário não autenticado');
    stats.errors++;
    throw new Error('Usuário não autenticado');
  }

  // Gerar chave única para esta requisição
  const requestKey = generateRequestKey(url, init);
  
  // Verificar pool de requisições (apenas para GET)
  const method = init.method || 'GET';
  if (method === 'GET' && requestPool.has(requestKey)) {
    const existingRequest = requestPool.get(requestKey)!;
    const response = await existingRequest;
    updateStats(performance.now() - startTime, true);
    return response.clone();
  }

  // Criar promise da requisição
  const requestPromise = (async (): Promise<Response> => {
    try {
      // Obter token otimizado
      const tokenStart = performance.now();
      const token = await getOptimizedToken(user, false);
      const tokenEnd = performance.now();

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'X-User-Timezone': typeof window !== 'undefined' 
          ? Intl.DateTimeFormat().resolvedOptions().timeZone 
          : 'America/Sao_Paulo',
        ...(init.headers as Record<string, string>),
      };

      // Adicionar Content-Type se houver body e não for FormData
      if (init.body && !(init.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      const fetchStart = performance.now();
      const response = await fetch(url, {
        ...init,
        headers,
        signal: init.signal || AbortSignal.timeout(30000), // 30s timeout
      });
      const fetchEnd = performance.now();

      // Retry em caso de 401 (token expirado)
      if (response.status === 401) {
        try {
          const newToken = await getOptimizedToken(user, true);
          
          const retryResponse = await fetch(url, {
            ...init,
            headers: {
              'Authorization': `Bearer ${newToken}`,
              ...init.headers,
              ...(init.body && !(init.body instanceof FormData) && { 'Content-Type': 'application/json' }),
            },
            signal: init.signal || AbortSignal.timeout(30000),
          });
          
          // 204 No Content é sucesso no retry também
          if (retryResponse.status === 204) {
            updateStats(performance.now() - startTime);
            return retryResponse;
          }
          
          updateStats(performance.now() - startTime);
          return retryResponse;
        } catch (refreshError) {
          stats.errors++;
          
          // Fallback: tentar usar token em cache
          const cached = tokenCache.get(user.id);
          if (cached) {
            const fallbackResponse = await fetch(url, {
              ...init,
              headers: {
                'Authorization': `Bearer ${cached.token}`,
                ...init.headers,
                ...(init.body && !(init.body instanceof FormData) && { 'Content-Type': 'application/json' }),
              },
              signal: init.signal || AbortSignal.timeout(30000),
            });
            
            // 204 No Content é sucesso no fallback também
            if (fallbackResponse.status === 204) {
              updateStats(performance.now() - startTime);
              return fallbackResponse;
            }
            
            updateStats(performance.now() - startTime);
            return fallbackResponse;
          }
          
          throw refreshError;
        }
      }

      // 204 No Content é sucesso, mas não tem body
      if (response.status === 204) {
        updateStats(performance.now() - startTime);
        return response;
      }

      if (!response.ok) {
        stats.errors++;
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      updateStats(performance.now() - startTime);
      return response;
    } catch (error) {
      stats.errors++;
      
      // Fallback em caso de erro de quota
      if (error instanceof Error && error.message.includes('quota-exceeded')) {
        const cached = tokenCache.get(user.id);
        
        if (cached) {
          const headers: Record<string, string> = {
            'Authorization': `Bearer ${cached.token}`,
            ...(init.headers as Record<string, string>),
          };

          if (init.body && !(init.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
          }

          const fallbackResponse = await fetch(url, {
            ...init,
            headers,
            signal: init.signal || AbortSignal.timeout(30000),
          });
          
          updateStats(performance.now() - startTime);
          return fallbackResponse;
        }
      }
      
      updateStats(performance.now() - startTime);
      throw error;
    } finally {
      // Remover do pool após completar (apenas GET)
      if (method === 'GET') {
        requestPool.delete(requestKey);
      }
    }
  })();

  // Adicionar ao pool se for GET
  if (method === 'GET') {
    requestPool.set(requestKey, requestPromise);
  }

  return requestPromise;
}

/**
 * Gera chave única para identificar uma requisição
 * 
 * @param url - URL da requisição
 * @param init - Opções da requisição
 * @returns Chave única no formato "método:url:body"
 * @private
 */
function generateRequestKey(url: string, init: RequestInit): string {
  const method = init.method || 'GET';
  const body = init.body ? JSON.stringify(init.body) : '';
  return `${method}:${url}:${body}`;
}

/**
 * Atualiza estatísticas de performance
 * 
 * @param responseTime - Tempo de resposta em milissegundos
 * @param fromCache - Se a resposta veio do cache
 * @private
 */
function updateStats(responseTime: number, fromCache: boolean = false): void {
  stats.requests++;
  if (fromCache) stats.cacheHits++;
  
  stats.responseTimes.push(responseTime);
  
  // Manter apenas últimas 100 medições
  if (stats.responseTimes.length > 100) {
    stats.responseTimes.shift();
  }
  
  // Calcular média
  stats.avgResponseTime = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length;
}

/**
 * Obtém token otimizado com cache e renovação automática
 * 
 * @param user - Usuário atual
 * @param forceRefresh - Força renovação do token ignorando cache
 * @returns Promise com token válido
 * @private
 */
async function getOptimizedToken(user: any, forceRefresh: boolean = false): Promise<string> {
  const cacheKey = user.id;
  const cached = tokenCache.get(cacheKey);
  const now = Date.now();
  
  // Usar cache se válido e não está forçando refresh
  if (cached && !forceRefresh && (now - cached.timestamp) < TOKEN_CACHE_DURATION) {
    return cached.token;
  }
  
  // Se já tem refresh em andamento, aguardar
  if (cached?.refreshPromise) {
    try {
      return await cached.refreshPromise;
    } catch (error) {
      tokenCache.delete(cacheKey);
    }
  }
  
  // Criar nova promise de refresh
  const refreshPromise = supabaseAuthService.getValidToken() as Promise<string>;
  
  // Atualizar cache com promise
  tokenCache.set(cacheKey, {
    token: cached?.token || '',
    timestamp: cached?.timestamp || 0,
    refreshPromise
  });
  
  try {
    const newToken = await refreshPromise;
    
    if (!newToken) {
      throw new Error('Falha ao obter token válido');
    }
    
    stats.tokenRefreshes++;
    
    // Atualizar cache com novo token
    tokenCache.set(cacheKey, {
      token: newToken,
      timestamp: now,
      refreshPromise: undefined
    });
    
    return newToken;
  } catch (error) {
    tokenCache.delete(cacheKey);
    throw error;
  }
}

/**
 * Obtém estatísticas de performance das requisições
 * 
 * @returns Objeto com estatísticas completas
 * 
 * @example
 * ```typescript
 * const stats = getFetchStats();
 * console.log('Taxa de cache hits:', stats.cacheHitRate);
 * console.log('Tempo médio de resposta:', stats.avgResponseTime);
 * ```
 */
export function getFetchStats(): FetchStats {
  return {
    ...stats,
    cacheHitRate: stats.requests > 0 ? (stats.cacheHits / stats.requests) * 100 : 0,
    errorRate: stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0,
    poolSize: requestPool.size,
    tokenCacheSize: tokenCache.size
  };
}

/**
 * Limpa todos os caches e estatísticas
 * 
 * Útil para testes ou quando o usuário faz logout
 * 
 * @example
 * ```typescript
 * clearFetchCache();
 * console.log('Caches limpos');
 * ```
 */
export function clearFetchCache(): void {
  tokenCache.clear();
  requestPool.clear();
  cachedUser = null;
  cachedUserTimestamp = 0;
  lastRevalidationTimestamp = 0;
  stats.requests = 0;
  stats.cacheHits = 0;
  stats.tokenRefreshes = 0;
  stats.errors = 0;
  stats.avgResponseTime = 0;
  stats.responseTimes = [];
}

/**
 * Expor funções de debug no objeto window (apenas em desenvolvimento)
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).fetchAuthStats = getFetchStats;
  (window as any).clearFetchCache = clearFetchCache;
}
