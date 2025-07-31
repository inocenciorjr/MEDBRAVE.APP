import { ContentComment, CreateCommentDTO, UpdateCommentDTO } from '../types';

/**
 * Interface para o serviço de comentários
 */
export interface ICommentService {
  /**
   * Cria um novo comentário
   * @param data Dados para criação do comentário
   * @returns Comentário criado
   */
  createComment(data: CreateCommentDTO): Promise<ContentComment>;

  /**
   * Obtém um comentário pelo ID
   * @param id ID do comentário
   * @returns Comentário encontrado ou null se não existir
   */
  getCommentById(id: string): Promise<ContentComment | null>;

  /**
   * Atualiza um comentário existente
   * @param id ID do comentário
   * @param data Dados para atualização
   * @returns Comentário atualizado ou null se não existir
   */
  updateComment(id: string, data: UpdateCommentDTO): Promise<ContentComment | null>;

  /**
   * Exclui um comentário (marcando como deletado)
   * @param id ID do comentário
   * @returns Comentário atualizado
   */
  deleteComment(id: string): Promise<ContentComment | null>;

  /**
   * Lista comentários de um conteúdo específico
   * @param contentId ID do conteúdo
   * @param limit Limite de resultados
   * @param page Página
   * @returns Lista de comentários
   */
  listCommentsByContent(
    contentId: string,
    limit?: number,
    page?: number,
  ): Promise<{
    comments: ContentComment[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>;

  /**
   * Lista respostas para um comentário específico
   * @param parentId ID do comentário pai
   * @returns Lista de comentários
   */
  listReplies(parentId: string): Promise<ContentComment[]>;

  /**
   * Adiciona um like a um comentário
   * @param id ID do comentário
   * @returns Comentário atualizado
   */
  likeComment(id: string): Promise<ContentComment | null>;

  /**
   * Remove um like de um comentário
   * @param id ID do comentário
   * @returns Comentário atualizado
   */
  unlikeComment(id: string): Promise<ContentComment | null>;
}
