/**
 * Interface genérica para repositórios de dados
 * Fornece operações CRUD básicas para qualquer tipo de entidade
 */
export interface IRepository<T> {
  /**
   * Cria uma nova entidade
   * @param entity Entidade a ser criada
   * @returns Entidade criada
   */
  create(entity: Omit<T, 'id'>): Promise<T>;

  /**
   * Busca uma entidade pelo ID
   * @param id ID da entidade
   * @returns Entidade encontrada ou null se não existir
   */
  findById(id: string): Promise<T | null>;

  /**
   * Busca todas as entidades
   * @param options Opções de paginação e ordenação
   * @returns Lista de entidades
   */
  findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    filters?: Record<string, any>;
  }): Promise<T[]>;

  /**
   * Atualiza uma entidade
   * @param id ID da entidade
   * @param data Dados para atualização
   * @returns Entidade atualizada
   */
  update(id: string, data: Partial<T>): Promise<T>;

  /**
   * Exclui uma entidade
   * @param id ID da entidade
   * @returns Verdadeiro se a exclusão foi bem-sucedida
   */
  delete(id: string): Promise<boolean>;

  /**
   * Conta o número total de entidades
   * @param filters Filtros opcionais
   * @returns Número de entidades
   */
  count(filters?: Record<string, any>): Promise<number>;
}
