/**
 * Common types shared across admin features
 */

export type SortDirection = 'asc' | 'desc';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  error?: string;
}

export interface FilterParams {
  search?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
  [key: string]: any;
}
