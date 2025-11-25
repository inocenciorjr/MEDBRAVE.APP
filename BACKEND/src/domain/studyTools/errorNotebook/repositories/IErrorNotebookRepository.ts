import {
  ErrorNotebook,
  CreateErrorNotebookPayload,
  UpdateErrorNotebookPayload,
  ErrorNotebookStats,
} from '../types';
// PaginationOptions moved to shared types
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ErrorNotebookFilters {
  search?: string;
  tags?: string[];
}

export interface PaginatedErrorNotebooks {
  items: ErrorNotebook[];
  total: number;
  hasMore: boolean;
  lastDocId?: string;
}

export interface IErrorNotebookRepository {
  create(data: CreateErrorNotebookPayload): Promise<ErrorNotebook>;
  findById(id: string): Promise<ErrorNotebook | null>;
  findByUser(
    userId: string,
    filters: ErrorNotebookFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedErrorNotebooks>;
  update(
    id: string,
    userId: string,
    data: UpdateErrorNotebookPayload,
  ): Promise<ErrorNotebook | null>;
  delete(id: string, userId: string): Promise<boolean>;
  getStats(id: string, userId: string): Promise<ErrorNotebookStats | null>;
  incrementEntryCount(id: string): Promise<void>;
  decrementEntryCount(id: string): Promise<void>;
}
