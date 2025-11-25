import { SearchIndexEntry, CreateSearchIndexPayload, UpdateSearchIndexPayload, SearchIndexFilters, PaginatedSearchIndexResult, SearchIndexStats } from '../types';
import { PaginationOptions } from '../../flashcards/repositories/IFlashcardRepository';

export interface ISearchIndexRepository {
  /**
   * Cria uma nova entrada no índice de busca
   */
  create(data: CreateSearchIndexPayload): Promise<SearchIndexEntry>;

  /**
   * Atualiza uma entrada existente no índice
   */
  update(deck_id: string, user_id: string, data: UpdateSearchIndexPayload): Promise<SearchIndexEntry>;

  /**
   * Remove uma entrada do índice
   */
  delete(deck_id: string, user_id: string): Promise<void>;

  /**
   * Realiza busca no índice com filtros opcionais
   */
  search(
    query: string,
    user_id: string,
    filters?: SearchIndexFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedSearchIndexResult>;

  /**
   * Reconstrói todo o índice de busca para um usuário específico
   */
  rebuildUserIndex(user_id: string): Promise<void>;

  /**
   * Obtém estatísticas do índice para um usuário
   */
  getStats(user_id: string): Promise<SearchIndexStats>;
}