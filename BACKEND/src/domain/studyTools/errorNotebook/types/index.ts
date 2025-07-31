import { Timestamp } from 'firebase-admin/firestore';

/**
 * FASE 3: Sistema de Caderno de Erros - Types
 * Especificação exata conforme TODO.md
 */

// Adicionar ReviewQuality enum para compatibilidade
export enum ReviewQuality {
  AGAIN = 'AGAIN',
  HARD = 'HARD', 
  GOOD = 'GOOD',
  EASY = 'EASY'
}

export interface ErrorNotebookEntry {
  id: string;
  userId: string;
  questionId: string;
  
  // Conteúdo da anotação
  userNote: string;
  userExplanation: string;
  keyPoints: string[];
  tags: string[];
  
  // Contexto da questão original
  questionStatement: string;
  correctAnswer: string;
  userOriginalAnswer: string;
  questionSubject: string;
  
  // Status de revisão
  isInReviewSystem: boolean;
  fsrsCardId?: string;
  lastReviewedAt?: Timestamp;
  
  // Metadados
  difficulty: ErrorNoteDifficulty;
  confidence: number; // 1-5, quão confiante está na explicação
  
  // Adicionar notebookId para compatibilidade
  notebookId?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum ErrorNoteDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM', 
  HARD = 'HARD',
  VERY_HARD = 'VERY_HARD'
}

export interface CreateErrorNoteDTO {
  userId: string;
  questionId: string;
  userNote: string;
  userExplanation: string;
  keyPoints?: string[];
  tags?: string[];
  difficulty?: ErrorNoteDifficulty;
  confidence?: number;
}

// Adicionar aliases para compatibilidade com use-cases
export interface CreateErrorEntryPayload extends CreateErrorNoteDTO {}

export interface UpdateErrorNoteDTO {
  userNote?: string;
  userExplanation?: string;
  keyPoints?: string[];
  tags?: string[];
  difficulty?: ErrorNoteDifficulty;
  confidence?: number;
}

// Adicionar alias para compatibilidade com use-cases
export interface UpdateErrorEntryPayload extends UpdateErrorNoteDTO {}

export interface ErrorNoteReviewData {
  entryId: string;
  questionContext: {
    statement: string;
    correctAnswer: string;
    subject: string;
  };
  userContent: {
    note: string;
    explanation: string;
    keyPoints: string[];
  };
  reviewPrompt: string;
}

/**
 * Opções para listar anotações de erro
 */
export interface GetUserErrorNotesOptions {
  limit?: number;
  page?: number;
  tags?: string[];
  difficulty?: ErrorNoteDifficulty;
  isInReviewSystem?: boolean;
}

/**
 * Resultado paginado de anotações de erro
 */
export interface GetUserErrorNotesResult {
  entries: ErrorNotebookEntry[];
  total: number;
  hasMore: boolean;
}

/**
 * Estatísticas de anotações de erro do usuário
 */
export interface ErrorNotesStats {
  totalEntries: number;
  entriesInReviewSystem: number;
  entriesByDifficulty: Record<ErrorNoteDifficulty, number>;
  entriesBySubject: Record<string, number>;
  averageConfidence: number;
  lastEntryAt?: Timestamp;
}

// Re-exportar tipos necessários para compatibilidade
export enum ErrorSourceType {
  QUESTION = 'QUESTION',
  FLASHCARD = 'FLASHCARD',
  CUSTOM = 'CUSTOM',
}

// Manter tipos antigos para compatibilidade (deprecated)
export interface ErrorNotebook {
  id: string;
  userId: string;
  title: string;
  description: string;
  isPublic: boolean;
  entryCount: number;
  lastEntryAt: Timestamp | null;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ErrorNotebookStats {
  totalEntries: number;
  resolvedEntries: number;
  unresolvedEntries: number;
  entriesByCategory: Record<string, number>;
  lastUpdatedAt: Timestamp;
  averageResolutionTime: number;
}

export interface CreateErrorNotebookPayload {
  userId: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface UpdateErrorNotebookPayload {
  title?: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface ListErrorNotebooksOptions {
  limit?: number;
  page?: number;
  lastDocId?: string;
  search?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedErrorNotebooksResult {
  items: ErrorNotebook[];
  total: number;
  hasMore: boolean;
  lastDocId?: string;
}

export interface ListErrorEntriesOptions {
  limit?: number;
  page?: number
  isResolved?: boolean;
  category?: string;
  tags?: string[];
  importance?: number;
  sourceType?: ErrorSourceType;
}

export interface PaginatedErrorEntriesResult {
  entries: ErrorNotebookEntry[];
  total: number;
  hasMore: boolean;
}

export interface SearchEntriesOptions {
  limit?: number;
  page?: number;
  tags?: string[];
  category?: string;
  subcategory?: string;
  importance?: number;
  sourceType?: ErrorSourceType;
}
