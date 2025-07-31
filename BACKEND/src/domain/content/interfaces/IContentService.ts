import {
  Content,
  CreateContentDTO,
  UpdateContentDTO,
  ContentQueryOptions,
  PaginatedContentResult,
} from '../types';

/**
 * Interface para o serviço de conteúdo (artigos)
 */
export interface IContentService {
  /**
   * Cria um novo conteúdo
   * @param data Dados para criação do conteúdo
   * @returns Conteúdo criado
   */
  createContent(data: CreateContentDTO): Promise<Content>;

  /**
   * Obtém um conteúdo pelo ID
   * @param id ID do conteúdo
   * @returns Conteúdo encontrado ou null se não existir
   */
  getContentById(id: string): Promise<Content | null>;

  /**
   * Atualiza um conteúdo existente
   * @param id ID do conteúdo
   * @param data Dados para atualização
   * @returns Conteúdo atualizado ou null se não existir
   */
  updateContent(id: string, data: UpdateContentDTO): Promise<Content | null>;

  /**
   * Exclui um conteúdo
   * @param id ID do conteúdo
   * @returns void
   */
  deleteContent(id: string): Promise<void>;

  /**
   * Lista conteúdos com filtros e paginação
   * @param options Opções de consulta
   * @returns Resultado paginado com conteúdos
   */
  listContent(options?: ContentQueryOptions): Promise<PaginatedContentResult>;

  /**
   * Incrementa o contador de visualizações de um conteúdo
   * @param id ID do conteúdo
   * @returns Conteúdo atualizado ou null se não existir
   */
  incrementViewCount(id: string): Promise<Content | null>;

  /**
   * Publica um conteúdo (muda o status para PUBLISHED)
   * @param id ID do conteúdo
   * @returns Conteúdo atualizado ou null se não existir
   */
  publishContent(id: string): Promise<Content | null>;

  /**
   * Arquiva um conteúdo (muda o status para ARCHIVED)
   * @param id ID do conteúdo
   * @returns Conteúdo atualizado ou null se não existir
   */
  archiveContent(id: string): Promise<Content | null>;

  /**
   * Busca conteúdos por termo
   * @param term Termo de busca
   * @param options Opções de consulta
   * @returns Resultado paginado com conteúdos
   */
  searchContent(term: string, options?: ContentQueryOptions): Promise<PaginatedContentResult>;
}
