import { Timestamp } from 'firebase-admin/firestore';

export enum FlashcardStatus {
  LEARNING = 'LEARNING',
  REVIEWING = 'REVIEWING',
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
  userId: string;
  deckId: string;
  frontContent: string;
  backContent: string;
  frontText?: string;
  backText?: string;
  personalNotes?: string | null;
  tags: string[];
  status: FlashcardStatus;
  srsInterval: number;
  srsEaseFactor: number;
  srsRepetitions: number;
  srsLapses: number;
  nextReviewAt: Timestamp | null;
  lastReviewedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  searchableText: string;
}

export interface Deck {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  tags: string[];
  coverImageUrl?: string | null;
  status: DeckStatus;
  flashcardCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FlashcardUserInteraction {
  id: string;
  userId: string;
  flashcardId: string;
  deckId: string;
  reviewQuality: ReviewQuality;
  reviewedAt: Timestamp;
  srsInterval: number;
  srsEaseFactor: number;
  srsRepetitions: number;
  srsLapses: number;
  nextReviewAt: Timestamp;
  previousInterval: number;
  previousEaseFactor: number;
  previousStatus: FlashcardStatus;
  newStatus: FlashcardStatus;
  studyTime?: number;
  reviewNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FlashcardUserStatistics {
  userId: string;
  deckId: string;
  totalFlashcards: number;
  activeFlashcards: number;
  masteredFlashcards: number;
  learningFlashcards: number;
  reviewingFlashcards: number;
  suspendedFlashcards: number;
  archivedFlashcards: number;
  averageEaseFactor: number;
  averageIntervalDays: number;
  dueForReviewCount: number;
  lastReviewedAt: Timestamp | null;
  nextReviewAt: Timestamp | null;
  updatedAt: Timestamp;
}

// Payloads para criação e atualização
export interface CreateFlashcardPayload {
  userId: string;
  deckId: string;
  frontContent: string;
  backContent: string;
  frontText?: string;
  backText?: string;
  personalNotes?: string | null;
  tags?: string[];
}

export interface UpdateFlashcardPayload {
  frontContent?: string;
  backContent?: string;
  frontText?: string;
  backText?: string;
  personalNotes?: string | null;
  tags?: string[];
  status?: FlashcardStatus;
  srsInterval?: number;
  srsEaseFactor?: number;
  srsRepetitions?: number;
  srsLapses?: number;
}

export interface CreateDeckPayload {
  userId: string;
  name: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
  coverImageUrl?: string | null;
  status?: DeckStatus;
}

export interface UpdateDeckPayload {
  name?: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
  coverImageUrl?: string | null;
  status?: DeckStatus;
}

export interface ListFlashcardsOptions {
  readyForReview?: boolean;
  status?: FlashcardStatus;
  limit?: number;
  lastDocId?: string;
}

export interface PaginatedFlashcardsResult {
  flashcards: Flashcard[];
  hasMore: boolean;
  total: number;
}

export interface ListDecksOptions {
  userId?: string;
  status?: DeckStatus;
  tags?: string[];
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  lastDocId?: string;
  isPublic?: boolean;
}

export interface PaginatedDecksResult {
  decks: Deck[];
  total: number;
  hasMore: boolean;
}
