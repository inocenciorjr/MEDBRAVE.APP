// Tipos para o módulo de Conteúdo (Artigos, Categorias, Comentários)

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/**
 * Interface principal para Conteúdo (Artigos)
 */
export interface Content {
  id: string;
  title: string;
  content: string;
  authorId: string;
  tags?: string[];
  categoryId?: string;
  status: ContentStatus;
  summary?: string;
  isPublic: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  imageUrl?: string;
  readTimeMinutes?: number;
}

/**
 * DTO para criação de conteúdo
 */
export interface CreateContentDTO {
  title: string;
  content: string;
  authorId: string;
  tags?: string[];
  categoryId?: string;
  status?: ContentStatus;
  summary?: string;
  isPublic?: boolean;
  imageUrl?: string;
}

/**
 * DTO para atualização de conteúdo
 */
export interface UpdateContentDTO {
  title?: string;
  content?: string;
  tags?: string[];
  categoryId?: string;
  status?: ContentStatus;
  summary?: string;
  isPublic?: boolean;
  imageUrl?: string;
}

/**
 * Interface para Categorias de conteúdo
 */
export interface ContentCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  order?: number;
  imageUrl?: string;
  contentCount: number;
}

/**
 * DTO para criação de categoria
 */
export interface CreateCategoryDTO {
  name: string;
  description?: string;
  parentId?: string;
  order?: number;
  imageUrl?: string;
}

/**
 * DTO para atualização de categoria
 */
export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  parentId?: string;
  order?: number;
  imageUrl?: string;
}

/**
 * Interface para Comentários
 */
export interface ContentComment {
  id: string;
  contentId: string;
  authorId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string;
  isDeleted: boolean;
  likeCount: number;
}

/**
 * DTO para criação de comentário
 */
export interface CreateCommentDTO {
  contentId: string;
  authorId: string;
  text: string;
  parentId?: string;
}

/**
 * DTO para atualização de comentário
 */
export interface UpdateCommentDTO {
  text?: string;
  isDeleted?: boolean;
}

/**
 * Interface para Likes em conteúdo
 */
export interface ContentLike {
  id: string;
  contentId: string;
  userId: string;
  createdAt: Date;
}

/**
 * DTO para criação de like
 */
export interface CreateLikeDTO {
  contentId: string;
  userId: string;
}

/**
 * Opções para consulta de conteúdo
 */
export interface ContentQueryOptions {
  limit?: number;
  page?: number;
  status?: ContentStatus;
  categoryId?: string;
  authorId?: string;
  tags?: string[];
  searchTerm?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'commentCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Resultado paginado para consulta de conteúdo
 */
export interface PaginatedContentResult {
  items: Content[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
