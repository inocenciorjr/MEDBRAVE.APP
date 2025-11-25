import {
  ContentCategory,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '../types';

/**
 * Interface para o serviço de categorias de conteúdo
 */
export interface ICategoryService {
  /**
   * Cria uma nova categoria
   * @param data Dados para criação da categoria
   * @returns Categoria criada
   */
  createCategory(data: CreateCategoryDTO): Promise<ContentCategory>;

  /**
   * Obtém uma categoria pelo ID
   * @param id ID da categoria
   * @returns Categoria encontrada ou null se não existir
   */
  getCategoryById(id: string): Promise<ContentCategory | null>;

  /**
   * Atualiza uma categoria existente
   * @param id ID da categoria
   * @param data Dados para atualização
   * @returns Categoria atualizada ou null se não existir
   */
  updateCategory(
    id: string,
    data: UpdateCategoryDTO,
  ): Promise<ContentCategory | null>;

  /**
   * Exclui uma categoria
   * @param id ID da categoria
   * @returns void
   */
  deleteCategory(id: string): Promise<void>;

  /**
   * Lista todas as categorias
   * @param parentId Filtra por categorias filhas de um pai específico (opcional)
   * @returns Lista de categorias
   */
  listCategories(parentId?: string): Promise<ContentCategory[]>;

  /**
   * Lista categorias em formato de árvore hierárquica
   * @returns Árvore de categorias
   */
  getCategoryTree(): Promise<ContentCategory[]>;

  /**
   * Atualiza a contagem de conteúdos em uma categoria
   * @param id ID da categoria
   * @returns Categoria atualizada
   */
  updateContentCount(id: string): Promise<ContentCategory | null>;
}
