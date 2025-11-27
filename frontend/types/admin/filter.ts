/**
 * Filter types for hierarchical filter management
 */

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
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}

export interface SubFilter {
  id: string;
  filterId: string;
  parentId?: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
  status: FilterStatus;
  children?: SubFilter[];
  createdAt: string;
  updatedAt: string;
}

export interface Filter {
  id: string;
  name: string;
  description?: string;
  category: FilterCategory;
  status: FilterStatus;
  isGlobal: boolean;
  filterType: FilterType;
  children?: SubFilter[];
  createdAt: string;
  updatedAt: string;
}
