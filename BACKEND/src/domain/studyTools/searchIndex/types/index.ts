// Tipos para o índice de busca otimizado
export interface SearchIndexEntry {
  id: string;
  user_id: string;
  deck_id: string;
  deck_name: string;
  deck_description: string;
  collection_name: string;
  flashcard_count: number;
  hierarchy?: string[];
  hierarchy_path?: string;
  path?: string;
  created_at: string;
  updated_at: string;
  searchable_text: string;
}

export interface CreateSearchIndexPayload {
  user_id: string;
  deck_id: string;
  deck_name: string;
  deck_description: string;
  collection_name: string;
  flashcard_count: number;
  hierarchy?: string[];
  hierarchy_path?: string;
  path?: string;
}

export interface UpdateSearchIndexPayload {
  deck_name?: string;
  deck_description?: string;
  collection_name?: string;
  flashcard_count?: number;
  hierarchy?: string[];
  hierarchy_path?: string;
  path?: string;
}

export interface SearchIndexResult {
  id: string;
  deck_id: string;
  deck_name: string;
  deck_description: string;
  collection_name: string;
  flashcard_count: number;
  hierarchy?: string[];
  hierarchy_path?: string;
  path?: string;
  updated_at: string;
}

export interface SearchIndexFilters {
  collection_name?: string;
  min_flashcard_count?: number;
  max_flashcard_count?: number;
}

export interface PaginatedSearchIndexResult {
  results: SearchIndexResult[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

export interface SearchIndexStats {
  total_entries: number;
  total_collections: number;
  total_decks: number;
  total_flashcards: number;
  last_updated: string;
}