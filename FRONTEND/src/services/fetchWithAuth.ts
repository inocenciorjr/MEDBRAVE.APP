import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Cache global para tokens com otimizações avançadas
const tokenCache = new Map<string, { token: string; timestamp: number; refreshPromise?: Promise<string> }>();
const TOKEN_CACHE_DURATION = 50 * 60 * 1000; // 50 minutos

// Pool de requisições para evitar duplicatas
const requestPool = new Map<string, Promise<Response>>();

// Estatísticas de performance
const stats = {
  requests: 0,
  cacheHits: 0,
  tokenRefreshes: 0,
  errors: 0,
  avgResponseTime: 0,
  responseTimes: [] as number[]
};

// Função para gerar chave única da requisição
function generateRequestKey(url: string, init: RequestInit): string {
  const method = init.method || 'GET';
  const body = init.body ? JSON.stringify(init.body) : '';
  return `${method}:${url}:${body}`;
}

// Função para atualizar estatísticas
function updateStats(responseTime: number, fromCache: boolean = false) {
  stats.requests++;
  if (fromCache) stats.cacheHits++;
  
  stats.responseTimes.push(responseTime);
  if (stats.responseTimes.length > 100) {
    stats.responseTimes.shift(); // Manter apenas últimas 100
  }
  
  stats.avgResponseTime = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length;
}

// Função otimizada para obter token
async function getOptimizedToken(user: any, forceRefresh: boolean = false): Promise<string> {
  const cacheKey = user.uid;
  const cached = tokenCache.get(cacheKey);
  const now = Date.now();
  
  // Se tem cache válido e não está forçando refresh
  if (cached && !forceRefresh && (now - cached.timestamp) < TOKEN_CACHE_DURATION) {
    return cached.token;
  }
  
  // Se já tem uma promise de refresh em andamento, aguardar ela
  if (cached?.refreshPromise) {
    try {
      return await cached.refreshPromise;
    } catch (error) {
      // Se falhar, remover da cache e tentar novamente
      tokenCache.delete(cacheKey);
    }
  }
  
  // Criar nova promise de refresh
  const refreshPromise = user.getIdToken(forceRefresh);
  
  // Atualizar cache com a promise
  tokenCache.set(cacheKey, {
    token: cached?.token || '',
    timestamp: cached?.timestamp || 0,
    refreshPromise
  });
  
  try {
    const newToken = await refreshPromise;
    stats.tokenRefreshes++;
    
    // Atualizar cache com novo token
    tokenCache.set(cacheKey, {
      token: newToken,
      timestamp: now,
      refreshPromise: undefined
    });
    
    return newToken;
  } catch (error) {
    // Remover da cache se falhar
    tokenCache.delete(cacheKey);
    throw error;
  }
}

// Helper para garantir que o estado de autenticação esteja pronto
let authReadyPromise: Promise<void> | null = null;
function ensureAuthReady(): Promise<void> {
  if (authReadyPromise) {
    return authReadyPromise;
  }
  authReadyPromise = new Promise((resolve) => {
    const auth = getAuth();
    // onAuthStateChanged retorna o usuário ou null
    // Usamos isso para saber que o Firebase verificou o estado inicial
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // console.log('🔐 [ensureAuthReady] onAuthStateChanged disparado, usuário:', !!user);
      unsubscribe(); // Cancela a inscrição após a primeira verificação
      resolve(); // Resolve a promessa indicando que o estado está pronto
    });
  });
  return authReadyPromise;
}

export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const startTime = performance.now();
  const auth = getAuth();
  let url = typeof input === 'string' ? input : input.toString();

  // Garantir que a URL sempre use o proxy do Vite
  if (!url.startsWith('http') && !url.startsWith('/api')) {
    url = `/api${url.startsWith('/') ? '' : '/'}${url}`;
  }

  // Aguarda o Firebase Auth inicializar seu estado
  await ensureAuthReady(); // <<< ESPERA AQUI

  const user = auth.currentUser; // Pega o usuário APÓS esperar

  if (!user) {
    console.error('❌ [fetchWithAuth] Usuário não autenticado mesmo após aguardar estado.');
    stats.errors++;
    throw new Error('Usuário não autenticado');
  }

  // Gerar chave única para esta requisição
  const requestKey = generateRequestKey(url, init);
  
  // Verificar se já existe uma requisição idêntica em andamento (para GET)
  const method = init.method || 'GET';
  if (method === 'GET' && requestPool.has(requestKey)) {
    const existingRequest = requestPool.get(requestKey)!;
    const response = await existingRequest;
    updateStats(performance.now() - startTime, true);
    return response.clone(); // Clonar para permitir múltiplas leituras
  }

  // Criar a promise da requisição
  const requestPromise = (async (): Promise<Response> => {
    try {
      // Obter token otimizado
      const token = await getOptimizedToken(user, false);

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        ...(init.headers as Record<string, string>),
      };

      // Se há body e não é FormData, definir Content-Type
      if (init.body && !(init.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        ...init,
        headers,
        // Adicionar timeout para evitar requisições infinitas
        signal: init.signal || AbortSignal.timeout(30000), // 30s timeout
      });

      if (response.status === 401) {
        // Token expirado, tentar renovação UMA VEZ
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
          
          updateStats(performance.now() - startTime);
          return retryResponse;
        } catch (refreshError) {
          stats.errors++;
          // Se falhar na renovação, usar token em cache como último recurso
          const cached = tokenCache.get(user.uid);
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
            updateStats(performance.now() - startTime);
            return fallbackResponse;
          }
          throw refreshError;
        }
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
      
      // Se erro de quota, tentar usar token em cache
      if (error instanceof Error && error.message.includes('quota-exceeded')) {
        const cached = tokenCache.get(user.uid);
        
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
      // Remover da pool após completar (para GET)
      if (method === 'GET') {
        requestPool.delete(requestKey);
      }
    }
  })();

  // Adicionar à pool se for GET
  if (method === 'GET') {
    requestPool.set(requestKey, requestPromise);
  }

  return requestPromise;
}

// Função para obter estatísticas
export function getFetchStats() {
  return {
    ...stats,
    cacheHitRate: stats.requests > 0 ? (stats.cacheHits / stats.requests) * 100 : 0,
    errorRate: stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0,
    poolSize: requestPool.size,
    tokenCacheSize: tokenCache.size
  };
}

// Função para limpar cache e pool
export function clearFetchCache() {
  tokenCache.clear();
  requestPool.clear();
  stats.requests = 0;
  stats.cacheHits = 0;
  stats.tokenRefreshes = 0;
  stats.errors = 0;
  stats.avgResponseTime = 0;
  stats.responseTimes = [];
}

// Expor estatísticas no window para debug
if (typeof window !== 'undefined') {
  (window as any).fetchAuthStats = getFetchStats;
  (window as any).clearFetchCache = clearFetchCache;
}

