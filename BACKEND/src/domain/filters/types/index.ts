export interface Filter {
  id: string;
  name: string;
  category: string;
  is_global: boolean;
  filter_type: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface FilterCreatePayload {
  name: string;
  category: string;
  is_global: boolean;
  filter_type: string;
  status?: 'active' | 'inactive';
}

export interface FilterUpdatePayload {
  name?: string;
  category?: string;
  is_global?: boolean;
  filter_type?: string;
  status?: 'active' | 'inactive';
}

export interface FilterListOptions {
  category?: string;
  is_global?: boolean;
  filter_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}