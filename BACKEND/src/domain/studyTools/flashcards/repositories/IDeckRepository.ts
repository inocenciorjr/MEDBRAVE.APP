import {
  PaginationOptions as _PaginationOptions,
  PaginatedResult as _PaginatedResult,
} from './IFlashcardRepository';
export type PaginationOptions = _PaginationOptions;
export type PaginatedResult<T> = _PaginatedResult<T>;

/**
 * Visibilidade do deck
 */
export enum DeckVisibility {
  PUBLIC = 'public', // Visível para todos
  PRIVATE = 'private', // Visível apenas para o proprietário
  RESTRICTED = 'restricted', // Visível apenas para pessoas específicas
}

/**
 * Status do deck
 */
export enum DeckStatus {
  ACTIVE = 'active', // Disponível para estudo
  ARCHIVED = 'archived', // Arquivado (não disponível para estudo, mas visível)
  DRAFT = 'draft', // Rascunho (não finalizado)
}

/**
 * Deck de flashcards
 */
export interface Deck {
  id: string;
  userId: string;
  title: string;
  description: string;
  tags: string[];
  visibility: DeckVisibility;
  status: DeckStatus;
  flashcardCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastStudied?: Date;
  imageUrl?: string;
  collaborators?: string[];
  isPublic: boolean;
}

/**
 * Dados para criação de um deck
 */
export interface DeckCreateData {
  userId: string;
  title: string;
  description: string;
  tags?: string[];
  imageUrl?: string;
  visibility?: DeckVisibility;
  isPublic?: boolean;
}

/**
 * Dados para atualização de um deck
 */
export interface DeckUpdateData {
  title?: string;
  description?: string;
  tags?: string[];
  imageUrl?: string;
  visibility?: DeckVisibility;
  status?: DeckStatus;
  isPublic?: boolean;
}

/**
 * Filtros para busca de decks
 */
export interface DeckFilters {
  userId?: string;
  tags?: string[];
  visibility?: DeckVisibility;
  status?: DeckStatus;
  searchTerm?: string;
  isPublic?: boolean;
  collaboratorId?: string;
}

/**
 * Repositório para gerenciamento de decks
 */
export interface IDeckRepository {
  /**
   * Cria um novo deck
   */
  create(data: DeckCreateData): Promise<Deck>;

  /**
   * Busca um deck pelo ID
   */
  findById(id: string): Promise<Deck | null>;

  /**
   * Atualiza um deck
   */
  update(id: string, data: DeckUpdateData): Promise<Deck>;

  /**
   * Remove um deck
   */
  delete(id: string): Promise<void>;

  /**
   * Lista decks com filtros e paginação
   */
  findAll(
    filters?: DeckFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Deck>>;

  /**
   * Lista decks de um usuário
   */
  findByUser(
    userId: string,
    filters?: DeckFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Deck>>;

  /**
   * Lista decks públicos
   */
  findPublic(
    filters?: DeckFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Deck>>;

  /**
   * Adiciona um colaborador ao deck
   */
  addCollaborator(deckId: string, userId: string): Promise<Deck>;

  /**
   * Remove um colaborador do deck
   */
  removeCollaborator(deckId: string, userId: string): Promise<Deck>;

  /**
   * Incrementa o contador de flashcards do deck
   */
  incrementFlashcardCount(deckId: string): Promise<void>;

  /**
   * Decrementa o contador de flashcards do deck
   */
  decrementFlashcardCount(deckId: string): Promise<void>;

  /**
   * Atualiza a data do último estudo
   */
  updateLastStudied(deckId: string, date?: Date): Promise<void>;

  /**
   * Busca decks por termo de pesquisa
   */
  search(
    query: string,
    filters?: DeckFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Deck>>;
}
