/**
 * Common types for admin interfaces
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  message?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: SortDirection;
}

export interface FilterParams extends PaginationParams, SortParams {
  search?: string;
}
