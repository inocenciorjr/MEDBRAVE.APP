import {
  Flashcard,
  FlashcardStatus,
  ReviewQuality,
} from '../types/flashcard.types';

/**
 * Opções de paginação para consultas
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startAfter?: string;
  lastDocId?: string;
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
  deckId?: string;
  status?: FlashcardStatus;
  tags?: string[];
  readyForReview?: boolean;
  searchTerm?: string;
  reviewedAfter?: Date;
  reviewedBefore?: Date;
}

/**
 * Interface para metadados de coleção
 */
export interface CollectionMetadata {
  name: string;
  deckCount: number;
  cardCount: number;
  lastUpdated: string;
  downloads?: number;
  likes?: number;
  avgRating?: number;
  totalCards?: number;
  isPublic?: boolean;
  userId?: string;
}

/**
 * Interface para deck com cards
 */
export interface DeckWithCards {
  id: string;
  name: string;
  description?: string;
  hierarchy?: string;
  isPublic: boolean;
  cardCount: number;
  lastReviewed?: string;
  dueCards?: number;
  tags?: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
  cards?: Flashcard[];
}

/**
 * Interface para estatísticas de coleção
 */
export interface CollectionStats {
  likes: number;
  downloads: number;
  avgRating: number;
  totalRatings: number;
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
  userId: string;
  status: 'PENDING' | 'PARSING' | 'PROCESSING' | 'INSERTING' | 'OPTIMIZING' | 'COMPLETED' | 'ERROR';
  progress: any; // Pode ser number ou object complexo
  total: number;
  errors?: string[];
  metadata?: any;
  config?: any;
  startedAt?: string;
  completedAt?: string;
  estimatedDuration?: number;
  resultDeckId?: string;
}

export interface IFlashcardRepository {
  /**
   * Cria um novo flashcard
   */
  create(flashcard: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Flashcard>;
  
  /**
   * Busca um flashcard pelo ID
   */
  findById(id: string): Promise<Flashcard | null>;
  
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
    userId: string, 
    filters?: FlashcardFilters, 
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Flashcard>>;
  
  /**
   * Busca por termo de pesquisa
   */
  search(
    query: string, 
    userId: string, 
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Flashcard>>;
  
  /**
   * Atualiza o status de um flashcard
   */
  updateStatus(id: string, status: FlashcardStatus): Promise<Flashcard>;
  
  /**
   * Registra uma revisão de flashcard e atualiza dados de SRS
   */
  recordReview(id: string, reviewQuality: ReviewQuality): Promise<Flashcard>;
  
  /**
   * Busca flashcards prontos para revisão
   */
  findDueForReview(
    userId: string,
    deckId?: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Flashcard>>;
  
  /**
   * Busca flashcards por tags
   */
  findByTags(
    userId: string,
    tags: string[],
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Flashcard>>;
  
  /**
   * Alterna o status de arquivamento de um flashcard
   */
  toggleArchive(id: string): Promise<Flashcard>;

  /**
   * Busca metadados das coleções do usuário para carregamento lazy
   */
  getCollectionsMetadata(userId: string, filters?: any, pagination?: PaginationOptions): Promise<CollectionMetadata[]>;

  /**
   * Busca decks de uma coleção específica
   */
  getCollectionDecks(userId: string, collectionName: string): Promise<DeckWithCards[]>;

  /**
   * Atualiza o status público de um deck
   */
  updateDeckPublicStatus(deckId: string, userId: string, isPublic: boolean): Promise<DeckWithCards>;

  /**
   * Exclui um deck do usuário
   */
  deleteDeck(deckId: string, userId: string): Promise<void>;

  /**
   * Busca um deck específico com seus cards
   */
  getDeckById(deckId: string, userId: string): Promise<DeckWithCards>;

  /**
   * Busca todos os decks do usuário
   */
  getAllUserDecks(userId: string, limit?: number): Promise<DeckWithCards[]>;

  /**
   * Busca biblioteca do usuário
   */
  getUserLibrary(userId: string, filters?: any, pagination?: PaginationOptions): Promise<CollectionMetadata[]>;

  /**
   * Busca coleção por ID
   */
  getCollectionById(collectionId: string): Promise<CollectionMetadata | null>;

  /**
   * Verifica se coleção está na biblioteca do usuário
   */
  isInUserLibrary(userId: string, collectionId: string): Promise<boolean>;

  /**
   * Adiciona coleção à biblioteca do usuário
   */
  addToLibrary(userId: string, collectionId: string): Promise<void>;

  /**
   * Incrementa contador de downloads
   */
  incrementDownloads(collectionId: string): Promise<void>;

  /**
   * Remove coleção da biblioteca do usuário
   */
  removeFromLibrary(userId: string, collectionId: string): Promise<void>;

  /**
   * Verifica se usuário curtiu a coleção
   */
  isCollectionLiked(userId: string, collectionId: string): Promise<boolean>;

  /**
   * Remove curtida da coleção
   */
  unlikeCollection(userId: string, collectionId: string): Promise<void>;

  /**
   * Adiciona curtida à coleção
   */
  likeCollection(userId: string, collectionId: string): Promise<void>;

  /**
   * Busca estatísticas da coleção
   */
  getCollectionStats(collectionId: string): Promise<CollectionStats>;

  /**
   * Avalia uma coleção
   */
  rateCollection(userId: string, collectionId: string, rating: CollectionRating): Promise<void>;

  /**
   * Cria sessão de importação
   */
  createImportSession(importData: any): Promise<ImportSession>;

  /**
   * Busca sessão de importação
   */
  getImportSession(importId: string): Promise<ImportSession | null>;

  /**
   * Atualiza status da importação
   */
  updateImportStatus(importId: string, update: Partial<ImportSession>): Promise<void>;
}
