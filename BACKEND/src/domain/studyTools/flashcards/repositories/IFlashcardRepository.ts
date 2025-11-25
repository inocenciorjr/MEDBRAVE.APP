import {
  Flashcard,
  FlashcardStatus,
  ReviewQuality,
  CreateFlashcardDTO,
} from '../types/flashcard.types';

/**
 * Opções de paginação para consultas
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  start_after?: string;
  last_doc_id?: string;
}

/**
 * Resultado paginado
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  lastDocId?: string;
}

/**
 * Filtros para busca de flashcards
 */
export interface FlashcardFilters {
  deck_id?: string;
  status?: FlashcardStatus;
  tags?: string[];
  ready_for_review?: boolean;
  search_term?: string;
  reviewed_after?: Date;
  reviewed_before?: Date;
}

/**
 * Interface para metadados de coleção
 */
export interface CollectionMetadata {
  id: string; // ID único da coleção
  name: string;
  deck_count: number;
  card_count: number;
  updated_at: string;
  hierarchy?: string;
  downloads?: number;
  likes?: number;
  avg_rating?: number;
  total_cards?: number;
  is_public?: boolean;
  user_id?: string;
  owner_id?: string;
  thumbnail_url?: string;
}

/**
 * Interface para deck com cards
 */
export interface DeckWithCards {
  id: string;
  name: string;
  description?: string;
  hierarchy?: string;
  is_public: boolean;
  card_count: number;
  last_reviewed?: string;
  due_cards?: number;
  tags?: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  status?: string;
  cards?: Flashcard[];
  collection_name?: string;
}

/**
 * Interface para estatísticas de coleção
 */
export interface CollectionStats {
  likes: number;
  downloads: number;
  avg_rating: number;
  total_ratings: number;
}

/**
 * Interface para rating de coleção
 */
export interface CollectionRating {
  rating: number;
  comment?: string;
}

/**
 * Interface para sessão de importação
 */
export interface ImportSession {
  id: string;
  user_id: string;
  status:
    | 'PENDING'
    | 'PROCESSING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED';
  progress: number;
  total: number;
  errors: string[];
  metadata: any;
  config: any;
  started_at: string;
  completed_at?: string;
  estimated_duration?: number;
  result_deck_id?: string;
}

export interface IFlashcardRepository {
  /**
   * Retorna o cliente Supabase (para operações diretas quando necessário)
   */
  getSupabaseClient(): any;
  /**
   * Cria um novo flashcard
   */
  create(
    flashcard: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<Flashcard>;

  /**
   * Busca um flashcard pelo ID
   */
  findById(id: string): Promise<Flashcard | null>;

  /**
   * Busca múltiplos flashcards por IDs
   */
  findByIds(ids: string[]): Promise<Flashcard[]>;

  /**
   * Atualiza um flashcard
   */
  update(id: string, data: Partial<Flashcard>): Promise<Flashcard>;

  /**
   * Remove um flashcard
   */
  delete(id: string): Promise<void>;

  /**
   * Lista flashcards com paginação e filtros
   */
  findByUser(
    user_id: string,
    filters?: FlashcardFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Flashcard>>;

  /**
   * Busca por termo de pesquisa
   */
  search(
    query: string,
    user_id: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Flashcard>>;

  /**
   * Atualiza o status de um flashcard
   */
  updateStatus(id: string, status: FlashcardStatus): Promise<Flashcard>;

  /**
   * Registra uma revisão de flashcard e atualiza dados de SRS
   */
  recordReview(id: string, review_quality: ReviewQuality, reviewTimeMs?: number): Promise<Flashcard>;

  /**
   * Busca flashcards prontos para revisão
   */
  findDueForReview(
    user_id: string,
    deck_id?: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Flashcard>>;

  /**
   * Busca flashcards por tags
   */
  findByTags(
    user_id: string,
    tags: string[],
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Flashcard>>;

  /**
   * Alterna o status de arquivamento de um flashcard
   */
  toggleArchive(id: string): Promise<Flashcard>;

  /**
   * Busca metadados das coleções do usuário para carregamento lazy
   */
  getCollectionsMetadata(
    user_id: string,
    filters?: any,
    pagination?: PaginationOptions,
  ): Promise<CollectionMetadata[]>;

  /**
   * Busca decks de uma coleção específica (por ID)
   */
  getCollectionDecks(
    user_id: string,
    collectionId: string,
  ): Promise<DeckWithCards[]>;
  

  /**
   * Busca uma coleção por ID
   */
  getCollectionById(
    collection_id: string,
    user_id?: string,
  ): Promise<any>;
  
  /**
   * Atualiza uma coleção
   */
  updateCollection(
    collection_id: string,
    user_id: string,
    updates: {
      name?: string;
      description?: string;
      is_public?: boolean;
      thumbnail_url?: string;
    },
  ): Promise<any>;
  
  /**
   * Deleta uma coleção
   */
  deleteCollection(
    collection_id: string,
    user_id: string,
  ): Promise<void>;

  /**
   * Atualiza o status público de um deck
   */
  updateDeckPublicStatus(
    deck_id: string,
    user_id: string,
    is_public: boolean,
  ): Promise<DeckWithCards>;

  /**
   * Exclui um deck do usuário
   */
  deleteDeck(deck_id: string, user_id: string): Promise<void>;

  /**
   * Busca um deck específico com seus cards
   */
  getDeckById(deck_id: string, user_id: string): Promise<DeckWithCards>;

  /**
   * Verifica se o usuário pode editar o deck (deve ser o dono)
   */
  canEditDeck(deck_id: string, user_id: string): Promise<boolean>;

  /**
   * Busca todos os decks do usuário
   */
  getAllUserDecks(user_id: string, limit?: number): Promise<DeckWithCards[]>;

  /**
   * Busca biblioteca do usuário
   */
  getUserLibrary(
    user_id: string,
    filters?: any,
    pagination?: PaginationOptions,
  ): Promise<CollectionMetadata[]>;

  /**
   * Busca coleção por ID
   */
  getCollectionById(collectionId: string): Promise<CollectionMetadata | null>;

  /**
   * Verifica se coleção está na biblioteca do usuário
   */
  isInUserLibrary(user_id: string, collectionId: string): Promise<boolean>;

  /**
   * Adiciona coleção à biblioteca do usuário (por referência, não cópia)
   */
  addToLibrary(user_id: string, collectionName: string): Promise<void>;

  /**
   * Incrementa contador de downloads (deprecated - usar collection_imports)
   */
  incrementDownloads(collectionId: string): Promise<void>;

  /**
   * Remove coleção da biblioteca do usuário
   */
  removeFromLibrary(user_id: string, collectionName: string): Promise<void>;

  /**
   * Verifica se usuário curtiu a coleção
   */
  isCollectionLiked(user_id: string, collectionId: string): Promise<boolean>;

  /**
   * Remove curtida da coleção
   */
  unlikeCollection(user_id: string, collectionId: string): Promise<void>;

  /**
   * Adiciona curtida à coleção
   */
  likeCollection(user_id: string, collectionId: string): Promise<void>;

  /**
   * Busca estatísticas da coleção
   */
  getCollectionStats(collectionId: string): Promise<CollectionStats>;

  /**
   * Avalia uma coleção
   */
  rateCollection(
    user_id: string,
    collectionId: string,
    rating: CollectionRating,
  ): Promise<void>;

  /**
   * Cria sessão de importação
   */
  createImportSession(
    user_id: string,
    config: any,
    metadata: any,
  ): Promise<ImportSession>;

  /**
   * Busca sessão de importação
   */
  getImportSession(sessionId: string): Promise<ImportSession>;

  /**
   * Atualiza status da importação
   */
  updateImportStatus(
    sessionId: string,
    status: ImportSession['status'],
    progress?: number,
    errors?: string[],
    result_deck_id?: string,
  ): Promise<ImportSession>;

  /**
   * Processa lote de importação
   */
  processImportBatch(
    sessionId: string,
    flashcards: CreateFlashcardDTO[],
    deck_id: string,
  ): Promise<void>;

  /**
   * Busca coleções públicas da comunidade
   */
  getPublicCollections(params: {
    search?: string;
    sortBy?: string;
    limit: number;
    offset: number;
  }): Promise<{ data: CollectionMetadata[]; total: number }>;

  /**
   * Busca detalhes de uma coleção pública específica
   */
  getPublicCollectionDetails(collectionName: string): Promise<any | null>;

  // ==================== MÉTODOS PARA COLLECTIONS COM ID ÚNICO ====================

  /**
   * Cria uma nova coleção com ID único
   */
  createCollection(data: {
    id: string;
    name: string;
    description?: string;
    user_id: string;
    is_public?: boolean;
    is_imported?: boolean;
    thumbnail_url?: string;
  }): Promise<any>;

  /**
   * Busca uma coleção por ID único
   */
  getCollectionByUniqueId(collectionId: string): Promise<any | null>;

  /**
   * Verifica se usuário tem acesso à coleção
   */
  canAccessCollection(collectionId: string, userId: string): Promise<boolean>;

  /**
   * Busca decks de uma coleção por ID único
   */
  getDecksByCollectionId(collectionId: string, userId: string): Promise<DeckWithCards[]>;

  /**
   * Adiciona coleção à biblioteca do usuário
   */
  addCollectionToLibrary(userId: string, collectionId: string): Promise<void>;

  /**
   * Remove coleção da biblioteca do usuário
   */
  removeCollectionFromLibrary(userId: string, collectionId: string): Promise<void>;

  /**
   * Verifica se coleção está na biblioteca do usuário
   */
  isCollectionInLibrary(userId: string, collectionId: string): Promise<boolean>;

  /**
   * Atualiza contadores de uma coleção
   */
  updateCollectionCounts(collectionId: string): Promise<void>;

  /**
   * Atualiza informações de uma coleção
   */
  updateCollection(
    collectionId: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      is_public?: boolean;
      thumbnail_url?: string;
    }
  ): Promise<any>;

  /**
   * Deleta uma coleção e todos os seus decks e flashcards
   */
  deleteCollection(collectionId: string, userId: string): Promise<void>;
}
