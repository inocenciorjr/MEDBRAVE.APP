import { ErrorNotebookEntry } from '../types';
import { PaginationOptions } from '../../studySessions/types';
import { ReviewQuality } from '../../flashcards/types';

export interface ErrorNotebookEntryFilters {
  isResolved?: boolean;
  category?: string;
  tags?: string[];
  sourceType?: string;
  search?: string;
}

export interface PaginatedErrorNotebookEntries {
  entries: ErrorNotebookEntry[];
  total: number;
  hasMore: boolean;
}

export interface CreateErrorEntryPayload {
  userId: string;
  questionId: string;
  userNote: string;
  userExplanation: string;
  keyPoints?: string[];
  tags?: string[];
  difficulty?: string;
  confidence?: number;
}

export interface UpdateErrorEntryPayload {
  userNote?: string;
  errorDescription?: string;
  errorCategory?: string | null;
  userAnswer?: string | null;
  correctAnswer?: string | null;
  personalNotes?: string;
  isResolved?: boolean;
  tags?: string[];
}

export interface IErrorNotebookEntryRepository {
  create(data: CreateErrorEntryPayload): Promise<ErrorNotebookEntry>;
  findById(id: string): Promise<ErrorNotebookEntry | null>;
  findByNotebook(
    notebookId: string,
    filters: ErrorNotebookEntryFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedErrorNotebookEntries>;
  update(
    id: string,
    userId: string,
    data: UpdateErrorEntryPayload,
  ): Promise<ErrorNotebookEntry | null>;
  delete(id: string, userId: string): Promise<boolean>;
  recordReview(
    id: string,
    userId: string,
    quality: ReviewQuality,
    notes?: string | null,
  ): Promise<ErrorNotebookEntry | null>;
  toggleResolved(id: string, userId: string): Promise<ErrorNotebookEntry | null>;
  getBySource(
    notebookId: string,
    userId: string,
    sourceType: string,
    sourceId: string,
  ): Promise<ErrorNotebookEntry | null>;
}
