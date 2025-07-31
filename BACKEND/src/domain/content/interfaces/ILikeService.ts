import { ContentLike, CreateLikeDTO } from '../types';

/**
 * Interface para o serviço de likes
 */
export interface ILikeService {
  /**
   * Cria um novo like em um conteúdo
   * @param data Dados para criação do like
   * @returns Like criado
   */
  addLike(data: CreateLikeDTO): Promise<ContentLike>;

  /**
   * Remove um like de um conteúdo
   * @param contentId ID do conteúdo
   * @param userId ID do usuário
   * @returns boolean indicando se a operação foi bem-sucedida
   */
  removeLike(contentId: string, userId: string): Promise<boolean>;

  /**
   * Verifica se um usuário deu like em um conteúdo
   * @param contentId ID do conteúdo
   * @param userId ID do usuário
   * @returns boolean indicando se o usuário deu like
   */
  hasUserLiked(contentId: string, userId: string): Promise<boolean>;

  /**
   * Lista likes de um conteúdo
   * @param contentId ID do conteúdo
   * @param limit Limite de resultados
   * @param page Página
   * @returns Lista de likes
   */
  listLikesByContent(
    contentId: string,
    limit?: number,
    page?: number,
  ): Promise<{
    likes: ContentLike[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>;

  /**
   * Lista likes de um usuário
   * @param userId ID do usuário
   * @param limit Limite de resultados
   * @param page Página
   * @returns Lista de likes
   */
  listLikesByUser(
    userId: string,
    limit?: number,
    page?: number,
  ): Promise<{
    likes: ContentLike[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>;

  /**
   * Obtém o total de likes de um conteúdo
   * @param contentId ID do conteúdo
   * @returns Total de likes
   */
  getLikeCount(contentId: string): Promise<number>;
}
