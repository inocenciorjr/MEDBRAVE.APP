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
  is_global: boolean;
  filter_type: FilterType;
  status: FilterStatus;
  created_at: Date;
  updated_at: Date;
}

export interface SubFilter {
  id: string;
  filter_id: string;
  name: string;
  description?: string;
  order?: number;
  is_active?: boolean;
  parent_id?: string;
  status: FilterStatus;
  created_at: Date;
  updated_at: Date;
}

export type FilterCreatePayload = Omit<
  Filter,
  'id' | 'created_at' | 'updated_at'
>;
export type FilterUpdatePayload = Partial<
  Omit<Filter, 'id' | 'created_at' | 'updated_at' | 'category'>
>;

export type SubFilterCreatePayload = Omit<
  SubFilter,
  'id' | 'created_at' | 'updated_at'
>;
export type SubFilterUpdatePayload = Partial<
  Omit<SubFilter, 'id' | 'created_at' | 'updated_at' | 'filter_id'>
>;

export interface FilterListOptions {
  category?: FilterCategory;
  is_global?: boolean;
  status?: FilterStatus;
  filter_type?: FilterType;
  limit?: number;
  offset?: number;
  order_by?: keyof Filter;
  order_direction?: "asc" | "desc";
}

export interface SubFilterListOptions {
  is_active?: boolean;
  sort_by?: keyof SubFilter;
  sort_direction?: "asc" | "desc";
  limit?: number;
  offset?: number;
  start_after?: SubFilter;
}

export interface SubFilterListResult {
  sub_filters: SubFilter[];
  next_page_start_after?: SubFilter;
}
