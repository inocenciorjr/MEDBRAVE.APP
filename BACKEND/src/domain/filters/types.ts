export enum FilterCategory {
  INSTITUTIONAL = 'INSTITUTIONAL',
  EDUCATIONAL = 'EDUCATIONAL',
  MEDICAL_SPECIALTY = 'MEDICAL_SPECIALTY',
}

export enum FilterStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum FilterType {
  CONTENT = 'CONTENT',
  COURSE = 'COURSE',
  QUESTION = 'QUESTION',
}

export interface Filter {
  id: string;
  name: string;
  description?: string;
  category: FilterCategory;
  isGlobal: boolean;
  filterType: FilterType;
  status: FilterStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubFilter {
  id: string;
  filterId: string;
  name: string;
  description?: string;
  order?: number;
  isActive?: boolean;
  parentId?: string;
  status: FilterStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type FilterCreatePayload = Omit<Filter, "id" | "createdAt" | "updatedAt">;
export type FilterUpdatePayload = Partial<Omit<Filter, "id" | "createdAt" | "updatedAt" | "category">>;

export type SubFilterCreatePayload = Omit<SubFilter, "id" | "createdAt" | "updatedAt">;
export type SubFilterUpdatePayload = Partial<Omit<SubFilter, "id" | "createdAt" | "updatedAt" | "filterId">>;

export interface FilterListOptions {
  category?: FilterCategory;
  isGlobal?: boolean;
  status?: FilterStatus;
  limit?: number;
  orderBy?: keyof Filter;
  orderDirection?: "asc" | "desc";
}

export interface SubFilterListOptions {
  isActive?: boolean;
  sortBy?: keyof SubFilter;
  sortDirection?: "asc" | "desc";
  limit?: number;
  startAfter?: SubFilter;
}

export interface SubFilterListResult {
  subFilters: SubFilter[];
  nextPageStartAfter?: SubFilter;
} 