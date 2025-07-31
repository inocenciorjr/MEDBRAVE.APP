import { Timestamp } from 'firebase-admin/firestore';

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

export interface FlashcardSRSData {
  interval: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
}

export interface Flashcard {
  id: string;
  userId: string;
  deckId: string;
  frontContent: string;
  backContent: string;
  personalNotes?: string;
  tags: string[];
  status: FlashcardStatus;
  difficulty?: number;
  srsData: FlashcardSRSData;
  nextReviewAt: Timestamp;
  lastReviewedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  searchableText: string;
  mediaUrls?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateFlashcardDTO {
  userId: string;
  deckId: string;
  frontContent: string;
  backContent: string;
  personalNotes?: string;
  tags?: string[];
  mediaUrls?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateFlashcardDTO {
  frontContent?: string;
  backContent?: string;
  personalNotes?: string;
  tags?: string[];
  status?: FlashcardStatus;
  mediaUrls?: string[];
  metadata?: Record<string, unknown>;
}
