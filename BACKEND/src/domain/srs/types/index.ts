import { Timestamp } from 'firebase-admin/firestore';
import { firestore } from 'firebase-admin';

/**
 * Tipos de conteúdo suportados pelo sistema de revisão programada
 */
export enum ProgrammedReviewContentType {
  QUESTION = 'QUESTION',
  FLASHCARD = 'FLASHCARD',
  ERROR_NOTEBOOK_ENTRY = 'ERROR_NOTEBOOK_ENTRY',
}

/**
 * Status possíveis para uma revisão programada
 */
export enum ProgrammedReviewStatus {
  LEARNING = 'LEARNING',
  REVIEWING = 'REVIEWING',
  MASTERED = 'MASTERED',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Níveis de qualidade da revisão baseados no algoritmo SM-2
 */
export enum ReviewQuality {
  BAD = 0, // Falha total
  DIFFICULT = 1, // Muita dificuldade
  GOOD = 2, // Alguma dificuldade
  EASY = 3, // Fácil
}

/**
 * Interface principal para uma revisão programada
 */
export interface ProgrammedReview {
  id: string;
  userId: string;
  contentId: string;
  contentType: ProgrammedReviewContentType;
  deckId: string | null;
  originalAnswerCorrect: boolean | null;
  lastReviewedAt: Timestamp | null;
  nextReviewAt: Timestamp;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  status: ProgrammedReviewStatus;
  notes: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Payload para criação de uma revisão programada
 */
export type CreateProgrammedReviewPayload = Omit<
  ProgrammedReview,
  'id' | 'createdAt' | 'updatedAt' | 'lastReviewedAt'
> & {
  intervalDays?: number;
  easeFactor?: number;
  repetitions?: number;
  lapses?: number;
  status?: ProgrammedReviewStatus;
};

/**
 * Opções para listar revisões programadas por usuário
 */
export interface ListProgrammedReviewsOptions {
  limit?: number;
  startAfter?: firestore.DocumentSnapshot;
  sortBy?: 'nextReviewAt' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
  status?: ProgrammedReviewStatus | ProgrammedReviewStatus[];
  contentType?: ProgrammedReviewContentType | ProgrammedReviewContentType[];
  deckId?: string;
}

/**
 * Opções para listar revisões programadas que estão vencidas (due)
 */
export interface ListDueReviewsOptions {
  limit?: number;
  contentType?: ProgrammedReviewContentType | ProgrammedReviewContentType[];
  deckId?: string;
  startAfter?: firestore.DocumentSnapshot;
  prioritizeByWeakestFilters?: boolean;
}

/**
 * Resultado da listagem de revisões programadas
 */
export interface ProgrammedReviewsListResult {
  reviews: ProgrammedReview[];
  nextPageStartAfter?: firestore.DocumentSnapshot;
}
