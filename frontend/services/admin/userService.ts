/**
 * User service for admin management
 */

import { get, put, del, buildQueryString } from './baseService';
import type { User, UserRole, UserStatus, UserSortField } from '@/types/admin/user';
import type { ApiResponse, PaginationParams, SortDirection } from '@/types/admin/common';

export interface GetUsersParams extends PaginationParams {
  search?: string;
  role?: UserRole | 'ALL';
  status?: UserStatus | 'ALL';
  sortBy?: UserSortField;
  sortDirection?: SortDirection;
}

export interface UpdateUserPayload {
  role?: UserRole;
  status?: UserStatus;
  displayName?: string;
  biography?: string;
  specialties?: string[];
}

/**
 * Get list of users with filters
 */
export async function getUsers(params: GetUsersParams = { page: 1, limit: 50 }): Promise<ApiResponse<User[]>> {
  const queryString = buildQueryString(params);
  return get<ApiResponse<User[]>>(`/api/admin/users${queryString}`);
}

/**
 * Get single user by ID
 */
export async function getUser(userId: string): Promise<User> {
  return get<User>(`/api/admin/users/${userId}`);
}

/**
 * Update user
 */
export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<User> {
  return put<User>(`/api/admin/users/${userId}`, payload);
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<void> {
  return del<void>(`/api/admin/users/${userId}`);
}

/**
 * Bulk update users
 */
export async function bulkUpdateUsers(userIds: string[], payload: UpdateUserPayload): Promise<void> {
  return put<void>('/api/admin/users/bulk', { userIds, ...payload });
}

/**
 * Bulk delete users
 */
export async function bulkDeleteUsers(userIds: string[]): Promise<void> {
  return del<void>(`/api/admin/users/bulk?ids=${userIds.join(',')}`);
}
