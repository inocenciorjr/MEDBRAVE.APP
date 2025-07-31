/**
 * Interface para serviço de cache genérico
 * Define métodos comuns para operações de cache
 */
export interface ICacheService {
  /**
   * Define um valor no cache
   * @param key Chave para o valor
   * @param value Valor a armazenar
   * @param ttl Tempo de vida em segundos (padrão: 3600 = 1 hora)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Obtém um valor do cache
   * @param key Chave do valor
   * @returns Valor armazenado ou null se não existir ou estiver expirado
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Remove um valor do cache
   * @param key Chave do valor
   */
  delete(key: string): Promise<void>;

  /**
   * Verifica se uma chave existe no cache e não está expirada
   * @param key Chave a verificar
   * @returns Verdadeiro se a chave existir e não estiver expirada
   */
  has(key: string): Promise<boolean>;

  /**
   * Limpa todas as entradas de cache expiradas
   * @returns Número de entradas limpas
   */
  cleanupExpired(): Promise<number>;

  /**
   * Limpa todo o cache
   * @returns Número de entradas limpas
   */
  clear(): Promise<number>;

  /**
   * Função utilitária que envolve outra função com cache
   * @param key Chave para o cache
   * @param fn Função a ser executada se o valor não estiver em cache
   * @param ttl Tempo de vida em segundos
   * @returns Resultado da função ou valor em cache
   */
  remember<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
}
