export interface SubFilter {
  id: string;
  name: string;
  filter_id: string;
  parent_id?: string;
  order: number;
  is_active: boolean;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface SubFilterCreatePayload {
  name: string;
  filter_id: string;
  parent_id?: string;
  order?: number;
  is_active?: boolean;
  status?: 'active' | 'inactive';
}

export interface SubFilterUpdatePayload {
  name?: string;
  filter_id?: string;
  parent_id?: string;
  order?: number;
  is_active?: boolean;
  status?: 'active' | 'inactive';
}

export interface SubFilterListOptions {
  filter_id?: string;
  parent_id?: string;
  status?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SubFilterListResult {
  data: SubFilter[];
  total: number;
  page: number;
  page_size: number;
}