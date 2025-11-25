// Serviço de cache simples
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

class CacheService {
  private cache = new Map<string, { data: any; expiry: number; lastAccessed: number }>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };
  private maxSize = 1000; // Limite máximo de itens no cache

  async get(key: string) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateSize();
      return null;
    }
    
    // Atualizar último acesso para LRU
    item.lastAccessed = Date.now();
    this.stats.hits++;
    return item.data;
  }

  async set(key: string, data: any, ttl: number = 5 * 60 * 1000) {
    // Limpar cache se estiver muito cheio
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
      lastAccessed: Date.now()
    });
    this.updateSize();
  }

  // Cache específico para filtros com TTL longo
  async getFilters(): Promise<any[] | null> {
    return await this.get('filters:all');
  }

  async setFilters(filters: any[], ttl: number = 30 * 60 * 1000): Promise<void> {
    await this.set('filters:all', filters, ttl);
  }

  // Cache específico para subfiltros por filtro pai
  async getSubFilters(parentId: string): Promise<any[] | null> {
    return await this.get(`subfilters:${parentId}`);
  }

  async setSubFilters(parentId: string, subFilters: any[], ttl: number = 10 * 60 * 1000): Promise<void> {
    await this.set(`subfilters:${parentId}`, subFilters, ttl);
  }

  // Cache específico para contagens
  async getCount(params: any): Promise<number | null> {
    const cacheKey = this.generateCountCacheKey(params);
    return await this.get(cacheKey);
  }

  async setCount(params: any, count: number, ttl: number = 2 * 60 * 1000): Promise<void> {
    const cacheKey = this.generateCountCacheKey(params);
    await this.set(cacheKey, count, ttl);
  }

  // Método específico para cache de questões
  async getCachedQuestions(params: any): Promise<any[] | null> {
    const cacheKey = this.generateQuestionsCacheKey(params);
    return await this.get(cacheKey);
  }

  // Método específico para armazenar questões no cache
  async cacheQuestions(params: any, questions: any[], ttl: number = 5 * 60 * 1000): Promise<void> {
    const cacheKey = this.generateQuestionsCacheKey(params);
    await this.set(cacheKey, questions, ttl);
  }

  // Gera chave única para cache de questões baseada nos parâmetros
  private generateQuestionsCacheKey(params: any): string {
    const { signal, ...cacheableParams } = params;
    return `questions:${JSON.stringify(cacheableParams, Object.keys(cacheableParams).sort())}`;
  }

  // Gera chave única para cache de contagens
  private generateCountCacheKey(params: any): string {
    const { signal, ...cacheableParams } = params;
    return `count:${JSON.stringify(cacheableParams, Object.keys(cacheableParams).sort())}`;
  }

  // Remove itens menos recentemente usados
  private evictLRU() {
    let oldestKey = '';
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

  private updateSize() {
    this.stats.size = this.cache.size;
  }

  // Limpar cache expirado
  cleanExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
    this.updateSize();
  }

  getStats() {
    return { ...this.stats };
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0 };
  }

  // Invalidar cache relacionado a filtros
  invalidateFilters() {
    for (const key of this.cache.keys()) {
      if (key.startsWith('filters:') || key.startsWith('subfilters:') || key.startsWith('count:')) {
        this.cache.delete(key);
      }
    }
    this.updateSize();
  }
}

export const cacheService = new CacheService();

