/**
 * Filter service for admin management
 */

import { get, post, put, del } from './baseService';
import type { Filter, SubFilter, FilterCategory, FilterStatus } from '@/types/admin/filter';

export interface CreateFilterPayload {
  name: string;
  description?: string;
  category: FilterCategory;
  status: FilterStatus;
  isGlobal: boolean;
  filterType: 'CONTENT' | 'USER' | 'SYSTEM';
}

export interface UpdateFilterPayload extends Partial<CreateFilterPayload> {
  id: string;
}

export interface CreateSubFilterPayload {
  filterId: string;
  parentId?: string;
  name: string;
  order: number;
  isActive: boolean;
  status: FilterStatus;
}

export interface UpdateSubFilterPayload extends Partial<CreateSubFilterPayload> {
  id: string;
}

/**
 * Get all filters with hierarchical structure
 */
export async function getAllFilters(): Promise<Filter[]> {
  return get<Filter[]>('/admin/filters');
}

/**
 * Get single filter by ID
 */
export async function getFilter(filterId: string): Promise<Filter> {
  return get<Filter>(`/api/admin/filters/${filterId}`);
}

/**
 * Create new filter
 */
export async function createFilter(payload: CreateFilterPayload): Promise<Filter> {
  return post<Filter>('/api/admin/filters', payload);
}

/**
 * Update filter
 */
export async function updateFilter(filterId: string, payload: UpdateFilterPayload): Promise<Filter> {
  return put<Filter>(`/api/admin/filters/${filterId}`, payload);
}

/**
 * Delete filter
 */
export async function deleteFilter(filterId: string): Promise<void> {
  return del<void>(`/api/admin/filters/${filterId}`);
}

/**
 * Create new subfilter
 */
export async function createSubFilter(payload: CreateSubFilterPayload): Promise<SubFilter> {
  const { filterId, ...body } = payload;
  return post<SubFilter>(`/api/admin/filters/${filterId}/subfilters`, body);
}

/**
 * Update subfilter
 */
export async function updateSubFilter(subFilterId: string, payload: UpdateSubFilterPayload): Promise<SubFilter> {
  return put<SubFilter>(`/api/admin/filters/subfilters/${subFilterId}`, payload);
}

/**
 * Delete subfilter
 */
export async function deleteSubFilter(subFilterId: string): Promise<void> {
  return del<void>(`/api/admin/filters/subfilters/${subFilterId}`);
}

/**
 * Build hierarchical tree from flat filter list
 */
export function buildFilterTree(filters: Filter[]): Filter[] {
  const filterMap = new Map<string, Filter>();
  const tree: Filter[] = [];

  // First pass: create map
  filters.forEach(filter => {
    filterMap.set(filter.id, { ...filter, children: [] });
  });

  // Second pass: build tree
  filters.forEach(filter => {
    const node = filterMap.get(filter.id);
    if (node) {
      tree.push(node);
    }
  });

  return tree;
}

/**
 * Sort filters and subfilters (numbers descending, text alphabetical)
 */
export function sortFilters<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();

    const numA = parseFloat(nameA);
    const numB = parseFloat(nameB);

    // Both are numbers
    if (!isNaN(numA) && !isNaN(numB)) {
      return numB - numA; // Descending
    }

    // Only A is number
    if (!isNaN(numA) && isNaN(numB)) {
      return -1;
    }

    // Only B is number
    if (isNaN(numA) && !isNaN(numB)) {
      return 1;
    }

    // Both are text
    return nameA.localeCompare(nameB, 'pt-BR', { numeric: true });
  });
}

/**
 * Count all subfilters recursively
 */
export function countSubFilters(filter: Filter): number {
  if (!filter.children || filter.children.length === 0) return 0;

  let count = filter.children.length;
  filter.children.forEach(subFilter => {
    count += countSubFiltersRecursive(subFilter);
  });

  return count;
}

function countSubFiltersRecursive(subFilter: SubFilter): number {
  if (!subFilter.children || subFilter.children.length === 0) return 0;

  let count = subFilter.children.length;
  subFilter.children.forEach(child => {
    count += countSubFiltersRecursive(child);
  });

  return count;
}

/**
 * Get filter statistics
 */
export async function getFilterStats(): Promise<{
  totalFilters: number;
  totalSubFilters: number;
  activeFilters: number;
}> {
  return get('/api/admin/filters/stats');
}
