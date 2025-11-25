// Removed Firebase dependency - using ISO string dates

export enum FlashcardStatus {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  REVIEW = 'REVIEW',
  RELEARNING = 'RELEARNING',
  MASTERED = 'MASTERED',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export enum DeckStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ReviewQuality {
  BAD = 0, // Falha total
  DIFFICULT = 1, // Muita dificuldade
  GOOD = 2, // Alguma dificuldade
  EASY = 3, // Fácil
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front_content: string;
  back_content: string;
  tags: string[];
  status: FlashcardStatus;
  created_at: string;
  updated_at: string;
  searchable_text: string;
}

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  tags: string[];
  cover_image_url?: string | null;
  status: DeckStatus;
  flashcard_count: number;
  hierarchy?: any;
  hierarchy_path?: string;
  created_at: string;
  updated_at: string;
}

export interface FlashcardUserInteraction {
  id: string;
  user_id: string;
  flashcard_id: string;
  deck_id: string;
  review_quality: ReviewQuality;
  reviewed_at: string;
  review_time_ms?: number;
  new_interval?: number;
  new_ease_factor?: number;
  previous_interval: number;
  previous_ease_factor: number;
  previous_status: FlashcardStatus;
  new_status: FlashcardStatus;
  study_time?: number;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewFlashcardPayload {
  user_id: string;
  flashcard_id: string;
  deck_id: string;
  review_quality: ReviewQuality;
  review_time_ms?: number;
  study_time?: number;
  review_notes?: string;
}

export interface FlashcardUserStatistics {
  user_id: string;
  deck_id: string;
  total_flashcards: number;
  active_flashcards: number;
  mastered_flashcards: number;
  learning_flashcards: number;
  reviewing_flashcards: number;
  suspended_flashcards: number;
  archived_flashcards: number;
  average_ease_factor: number;
  average_interval_days: number;
  due_for_review_count: number;

  updated_at: string;
}

// Payloads para criação e atualização
export interface CreateFlashcardPayload {
  deck_id: string;
  front_content: string;
  back_content: string;
  tags?: string[];
}

export interface UpdateFlashcardPayload {
  front_content?: string;
  back_content?: string;
  tags?: string[];
  status?: FlashcardStatus;
}

export interface CreateDeckPayload {
  user_id: string;
  name: string;
  description?: string;
  is_public?: boolean;
  is_official?: boolean; // Marcar como coleção oficial MedBrave
  tags?: string[];
  cover_image_url?: string | null;
  status?: DeckStatus;
}

export interface UpdateDeckPayload {
  name?: string;
  description?: string;
  is_public?: boolean;
  tags?: string[];
  cover_image_url?: string | null;
  status?: DeckStatus;
  flashcard_count?: number;

  due_for_review_count?: number;
  hierarchy_path?: string[];
}

export interface FlashcardOptions {
  user_id?: string;
  deck_id?: string;
  status?: FlashcardStatus;
  is_public?: boolean;
  tags?: string[];
  limit?: number;
  offset?: number;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'front_content';
  sort_order?: 'asc' | 'desc';
  include_archived?: boolean;
  ready_for_review?: boolean;
  last_doc_id?: string;
  last_doc?: any;
}

export interface ListFlashcardsOptions {
  ready_for_review?: boolean;
  status?: FlashcardStatus;
  limit?: number;
  last_doc_id?: string;
}

// export interface FSRSStats {
//   total_cards: number;
//   due_cards: number;
//   new_cards: number;
//   learning_cards: number;
//   review_cards: number;
//   average_stability: number;
//   average_difficulty: number;
//   retention_rate: number;
// } // FSRS logic deprecated

export interface PaginatedFlashcardsResult {
  flashcards: Flashcard[];
  has_more: boolean;
  total: number;
  last_doc_id?: string;
}

export interface ListDecksOptions {
  user_id?: string;
  status?: DeckStatus;
  tags?: string[];
  search?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  last_doc_id?: string;
  is_public?: boolean;
}

export interface PaginatedDecksResult {
  decks: Deck[];
  total: number;
  has_more: boolean;
}
