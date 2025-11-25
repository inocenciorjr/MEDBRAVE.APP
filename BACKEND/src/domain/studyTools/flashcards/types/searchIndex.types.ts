// Removed Firebase dependency - using ISO string dates

/**
 * Interface para o índice de busca otimizado
 * Contém apenas os dados essenciais para busca rápida
 */
export interface SearchIndexEntry {
  id: string; // ID único do índice (gerado automaticamente)
  user_id: string; // ID do usuário proprietário

  // Dados do deck
  deck_id: string;
  deck_name: string;
  deck_description: string;

  // Dados da coleção
  collection_name: string;

  // Dados de hierarquia
  hierarchy?: string[]; // Array com a hierarquia de pastas
  hierarchy_path?: string; // Caminho completo da hierarquia (ex: "Pasta1::Pasta2::Deck")
  path?: string; // Caminho de exibição (ex: "Pasta1 > Pasta2 > Deck")

  // Contadores
  flashcard_count: number;

  // Metadados
  created_at: string;
  updated_at: string;

  // Campo de busca otimizado (lowercase para busca case-insensitive)
  searchable_text: string; // Combinação de deck_name + deck_description + collection_name + hierarchy em lowercase
}

/**
 * Payload para criar uma entrada no índice
 */
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

/**
 * Payload para atualizar uma entrada no índice
 */
export interface UpdateSearchIndexPayload {
  deck_name?: string;
  deck_description?: string;
  collection_name?: string;
  flashcard_count?: number;
  hierarchy?: string[];
  hierarchy_path?: string;
  path?: string;
}

/**
 * Resultado da busca no índice
 */
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

/**
 * Filtros para busca no índice
 */
export interface SearchIndexFilters {
  collection_name?: string;
  min_flashcard_count?: number;
  max_flashcard_count?: number;
}

/**
 * Resultado paginado da busca no índice
 */
export interface PaginatedSearchIndexResult {
  results: SearchIndexResult[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

/**
 * Estatísticas do índice de busca
 */
export interface SearchIndexStats {
  total_entries: number;
  total_collections: number;
  total_decks: number;
  total_flashcards: number;
  last_updated: string;
}
