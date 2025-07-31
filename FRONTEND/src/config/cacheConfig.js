/**
 * Configurações de Cache e Performance - Frontend MedForum
 * Centralizando todas as constantes para facilitar ajustes
 */

export const CACHE_CONFIG = {
  // TTLs (Time To Live) em milissegundos
  TTL: {
    FILTERS: 2 * 60 * 60 * 1000, // 2 horas - filtros mudam raramente
    SUBFILTERS: 15 * 60 * 1000, // 15 minutos - subfiltros podem ser atualizados
    QUESTIONS: 60 * 60 * 1000, // 1 hora - questões podem ser atualizadas
    COUNTS: 30 * 60 * 1000, // 30 minutos - contagens intermediárias
    USER_PREFERENCES: 24 * 60 * 60 * 1000, // 24 horas - preferências do usuário
    SEARCH_RESULTS: 5 * 60 * 1000, // 5 minutos - resultados de busca
    OPTIMIZED_DATA: 10 * 60 * 1000, // 10 minutos - dados otimizados (filtros + subfiltros)
  },

  // Limites de requisições
  LIMITS: {
    MAX_BATCH_SIZE: 50, // Máximo de filtros por batch para evitar timeout
    MAX_FALLBACK_REQUESTS: 10, // Máximo de requisições individuais no fallback
    MAX_MEMORY_ITEMS: 1000, // Limite de itens em memória
    COMPRESSION_THRESHOLD: 1024, // Comprimir dados > 1KB
    MAX_SELECTED_FILTERS: 20, // Máximo de filtros selecionados
    MAX_SELECTED_SUBFILTERS: 50, // Máximo de subfiltros selecionados
  },

  // Timeouts em milissegundos
  TIMEOUTS: {
    BATCH_REQUEST: 30000, // 30 segundos para requisições batch
    INDIVIDUAL_REQUEST: 15000, // 15 segundos para requisições individuais
    CACHE_CLEANUP: 5 * 60 * 1000, // 5 minutos para limpeza de cache
    OPTIMIZED_LOAD: 20000, // 20 segundos para carregamento otimizado
  },

  // Debounce delays em milissegundos
  DEBOUNCE: {
    SEARCH: 300, // 300ms para busca
    FILTER_CHANGE: 300, // 300ms para mudança de filtros
    COUNT_UPDATE: 2000, // 2 segundos para atualização de contadores
    BACKGROUND_SYNC: 30 * 60 * 1000, // 30 minutos para sincronização em background
  },

  // Configurações de retry
  RETRY: {
    MAX_ATTEMPTS: 3, // Máximo de tentativas
    DELAY_BASE: 1000, // Delay base em ms (exponential backoff)
    DELAY_MAX: 10000, // Delay máximo em ms
  },

  // Configurações de virtualização
  VIRTUALIZATION: {
    THRESHOLD: 50, // Usar virtualização quando há mais de 50 itens
    ITEM_HEIGHT: 40, // Altura estimada de cada item em pixels
    OVERSCAN: 5, // Número de itens extras para renderizar fora da viewport
  }
};

/**
 * Configurações específicas do Banco de Questões
 */
export const BANCO_QUESTOES_CONFIG = {
  // Paginação
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 500,

  // Filtros
  MAX_SELECTED_FILTERS: 20,
  MAX_SELECTED_SUBFILTERS: 50,

  // Performance
  ENABLE_BACKGROUND_SYNC: true,
  ENABLE_CACHE_PRELOAD: true,
  ENABLE_REQUEST_POOLING: true,
  ENABLE_OPTIMIZED_LOADING: true,

  // Logs
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development',
  ENABLE_PERFORMANCE_LOGS: true,

  // UI
  ENABLE_VIRTUALIZATION: true,
  ENABLE_LAZY_LOADING: true,
};

/**
 * Configurações específicas do SubfilterPanel
 */
export const SUBFILTER_PANEL_CONFIG = {
  // Carregamento
  USE_OPTIMIZED_SERVICE: true,
  FALLBACK_TO_OLD_METHOD: true,
  
  // UI
  START_COLLAPSED: true,
  AUTO_EXPAND_SEARCH_RESULTS: false,
  SHOW_COUNTS: true,
  
  // Busca
  MIN_SEARCH_LENGTH: 2,
  SEARCH_DEBOUNCE: 300,
  HIGHLIGHT_SEARCH_TERMS: true,
};

/**
 * Utilitários para configuração
 */
export const ConfigUtils = {
  /**
   * Converte milissegundos para minutos
   */
  msToMinutes: (ms) => Math.round(ms / 60000),

  /**
   * Converte minutos para milissegundos
   */
  minutesToMs: (minutes) => minutes * 60 * 1000,

  /**
   * Gera chave de cache baseada em parâmetros
   */
  generateCacheKey: (prefix, params) => {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  },

  /**
   * Calcula delay exponential backoff
   */
  calculateBackoffDelay: (attempt) => {
    const delay = CACHE_CONFIG.RETRY.DELAY_BASE * Math.pow(2, attempt - 1);
    return Math.min(delay, CACHE_CONFIG.RETRY.DELAY_MAX);
  },

  /**
   * Verifica se deve usar virtualização baseado no número de itens
   */
  shouldUseVirtualization: (itemCount) => {
    return BANCO_QUESTOES_CONFIG.ENABLE_VIRTUALIZATION && 
           itemCount > CACHE_CONFIG.VIRTUALIZATION.THRESHOLD;
  },

  /**
   * Formata tempo de cache para exibição
   */
  formatCacheTime: (ms) => {
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.round(minutes / 60);
    return `${hours}h`;
  },

  /**
   * Verifica se o cache expirou
   */
  isCacheExpired: (timestamp, ttl) => {
    return Date.now() - timestamp > ttl;
  }
};

export default CACHE_CONFIG;