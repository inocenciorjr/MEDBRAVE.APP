// Removed Firebase dependency - using ISO string dates

export enum FlashcardStatus {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  REVIEWING = 'REVIEWING',
  REVIEW = 'REVIEW',
  RELEARNING = 'RELEARNING',
  MASTERED = 'MASTERED',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export enum ReviewQuality {
  AGAIN = 0,
  HARD = 1,
  GOOD = 2,
  EASY = 3,
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

export interface CreateFlashcardDTO {
  deck_id: string;
  front_content: string;
  back_content: string;
  tags?: string[];
}

export interface UpdateFlashcardDTO {
  front_content?: string;
  back_content?: string;
  tags?: string[];
  status?: FlashcardStatus;
}
