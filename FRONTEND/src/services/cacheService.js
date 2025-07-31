import { CACHE_CONFIG } from '../config/cacheConfig';

// Cache TTL padrão
const DEFAULT_TTL = CACHE_CONFIG.TTL.SUBFILTERS;

// Serviço de cache simples para o frontbrave
class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, size: 0 };
    this.maxSize = CACHE_CONFIG.LIMITS.MAX_MEMORY_ITEMS; // Limite máximo de itens no cache
  }

  // Método genérico para buscar dados do cache
  async get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Verificar se o item expirou
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Atualizar último acesso
    item.lastAccessed = Date.now();
    this.stats.hits++;
    return item.data;
  }

  // Método genérico para armazenar dados no cache
  async set(key, data, ttl = 5 * 60 * 1000) { // TTL padrão de 5 minutos
    // Limpar cache se estiver muito cheio
    if (this.cache.size >= this.maxSize) {
      this.clearOldest();
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
      lastAccessed: Date.now()
    });
    
    this.updateStats();
  }

  // Cache específico para filtros com TTL longo
  async getFilters() {
    return await this.get('filters');
  }

  async setFilters(filters, ttl = 30 * 60 * 1000) { // TTL padrão de 30 minutos
    await this.set('filters', filters, ttl);
  }

  // Cache específico para subfiltros por filtro pai
  async getSubFilters(filterId) {
    return await this.get(`subfilters:${filterId}`);
  }

  async setSubFilters(filterId, subFilters, ttl = 10 * 60 * 1000) { // TTL padrão de 10 minutos
    await this.set(`subfilters:${filterId}`, subFilters, ttl);
  }

  // Cache específico para contagens
  async getCachedCount(params) {
    const cacheKey = this.generateCountCacheKey(params);
    return await this.get(cacheKey);
  }

  async cacheCount(params, count, ttl = 5 * 60 * 1000) {
    const cacheKey = this.generateCountCacheKey(params);
    await this.set(cacheKey, count, ttl);
  }

  // Método específico para cache de questões
  async getCachedQuestions(params) {
    const cacheKey = this.generateQuestionsCacheKey(params);
    return await this.get(cacheKey);
  }

  // Método específico para armazenar questões no cache
  async cacheQuestions(params, questions, ttl = 5 * 60 * 1000) {
    const cacheKey = this.generateQuestionsCacheKey(params);
    await this.set(cacheKey, questions, ttl);
  }

  // Gera chave única para cache de questões baseada nos parâmetros
  generateQuestionsCacheKey(params) {
    const { signal, ...cacheableParams } = params;
    return `questions:${JSON.stringify(cacheableParams, Object.keys(cacheableParams).sort())}`;
  }

  // Gera chave única para cache de contagens
  generateCountCacheKey(params) {
    const { signal, ...cacheableParams } = params;
    return `count:${JSON.stringify(cacheableParams, Object.keys(cacheableParams).sort())}`;
  }

  // Limpar itens mais antigos quando o cache está cheio
  clearOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Atualizar estatísticas
  updateStats() {
    this.stats.size = this.cache.size;
  }

  // Limpar cache expirado
  clearExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
    this.updateStats();
  }

  // Obter estatísticas do cache
  getStats() {
    return { ...this.stats };
  }

  // Limpar todo o cache
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0 };
  }

  // Invalidar cache relacionado a filtros
  invalidateFilters() {
    for (const key of this.cache.keys()) {
      if (key.startsWith('filters') || key.startsWith('subfilters:')) {
        this.cache.delete(key);
      }
    }
    this.updateStats();
  }
}

// Exportar instância única do serviço
export const cacheService = new CacheService();

// 🚀 SERVIÇO DE CACHE OTIMIZADO PARA FLASHCARDS
class FlashcardsCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    
    // Configurações de TTL (Time To Live) em millisegundos
    this.TTL_CONFIG = {
      metadata: 5 * 60 * 1000,      // 5 minutos
      collections: 2 * 60 * 1000,   // 2 minutos
      decks: 30 * 1000,             // 30 segundos
      stats: 60 * 1000,             // 1 minuto
      community: 10 * 60 * 1000,    // 10 minutos
    };
    
    // Limpeza automática do cache a cada 5 minutos
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  // Gerar chave do cache
  generateKey(type, params = {}) {
    const keyParts = [type];
    
    if (params.userId) keyParts.push(`user:${params.userId}`);
    if (params.collection) keyParts.push(`collection:${params.collection}`);
    if (params.page) keyParts.push(`page:${params.page}`);
    if (params.limit) keyParts.push(`limit:${params.limit}`);
    
    return keyParts.join('_');
  }

  // Verificar se item está válido no cache
  isValid(key, type) {
    if (!this.cache.has(key) || !this.timestamps.has(key)) {
      return false;
    }
    
    const timestamp = this.timestamps.get(key);
    const ttl = this.TTL_CONFIG[type] || 30000; // Default 30s
    
    return (Date.now() - timestamp) < ttl;
  }

  // Obter item do cache
  get(type, params = {}) {
    const key = this.generateKey(type, params);
    
    if (this.isValid(key, type)) {
      console.log(`📦 Cache HIT: ${key}`);
      return this.cache.get(key);
    }
    
    // Se não é válido, remover do cache
    this.cache.delete(key);
    this.timestamps.delete(key);
    
    console.log(`❌ Cache MISS: ${key}`);
    return null;
  }

  // Armazenar item no cache
  set(type, data, params = {}) {
    const key = this.generateKey(type, params);
    
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now());
    
    console.log(`💾 Cache SET: ${key} (${this.cache.size} items no cache)`);
  }

  // Invalidar cache específico
  invalidate(type, params = {}) {
    const key = this.generateKey(type, params);
    
    this.cache.delete(key);
    this.timestamps.delete(key);
    
    console.log(`🗑️ Cache INVALIDATED: ${key}`);
  }

  // Invalidar cache por padrão
  invalidatePattern(pattern) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.timestamps.delete(key);
    });
    
    console.log(`🗑️ Cache PATTERN INVALIDATED: ${pattern} (${keysToDelete.length} items)`);
  }

  // Limpeza automática de itens expirados
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, timestamp] of this.timestamps.entries()) {
      // Usar TTL máximo de 10 minutos para limpeza
      if ((now - timestamp) > (10 * 60 * 1000)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.timestamps.delete(key);
    });
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache CLEANUP: ${keysToDelete.length} itens expirados removidos`);
    }
  }

  // Limpar todo o cache
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    
    console.log('🗑️ Cache CLEARED completamente');
  }

  // Estatísticas do cache
  getStats() {
    return {
      size: this.cache.size,
      types: Array.from(this.cache.keys()).reduce((acc, key) => {
        const type = key.split('_')[0];
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// Instância singleton do cache
const flashcardsCache = new FlashcardsCache();

export default flashcardsCache;