/**
 * Admin User Service
 * Handles all user management operations for administrators
 */

import { get, post, put, del, buildQueryString } from './baseService';
import type {
  User,
  UserStatistics,
  UserLog,
  UserNote,
  UserSession,
  GetUsersParams,
  UpdateUserPayload,
  SuspendUserPayload,
  BanUserPayload,
  SendEmailPayload,
  BulkUpdatePayload,
} from '@/types/admin/user';
import type { ApiResponse } from '@/types/admin/common';

/**
 * Get list of users with filters
 */
export async function getUsers(params: GetUsersParams = {}): Promise<ApiResponse<User[]>> {
  const queryString = buildQueryString(params);
  return get<ApiResponse<User[]>>(`/admin/users${queryString}`);
}

/**
 * Get single user by ID
 */
export async function getUserById(userId: string): Promise<User> {
  const response = await get<{ success: boolean; data: User }>(`/admin/users/${userId}`);
  return response.data;
}

/**
 * Update user
 */
export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<User> {
  const response = await put<{ success: boolean; data: User }>(`/admin/users/${userId}`, payload);
  return response.data;
}

/**
 * Delete user
 */
export async function deleteUser(userId: string, reason: string): Promise<void> {
  await del<void>(`/admin/users/${userId}`);
}

/**
 * Suspend user
 */
export async function suspendUser(userId: string, payload: SuspendUserPayload): Promise<void> {
  await post<void>(`/admin/users/${userId}/suspend`, payload);
}

/**
 * Activate user
 */
export async function activateUser(userId: string): Promise<void> {
  await post<void>(`/admin/users/${userId}/activate`, {});
}

/**
 * Ban user
 */
export async function banUser(userId: string, payload: BanUserPayload): Promise<void> {
  await post<void>(`/admin/users/${userId}/ban`, payload);
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: string): Promise<void> {
  await put<void>(`/admin/users/${userId}/role`, { role });
}

/**
 * Get user activity logs
 */
export async function getUserLogs(
  userId: string,
  params: { limit?: number; offset?: number; startDate?: string; endDate?: string } = {}
): Promise<{ logs: UserLog[]; total: number }> {
  const queryString = buildQueryString(params);
  const response = await get<{ success: boolean; data: UserLog[]; meta: any }>(
    `/admin/users/${userId}/logs${queryString}`
  );
  return {
    logs: response.data,
    total: response.meta?.total || response.data.length,
  };
}

/**
 * Get user plans history
 */
export async function getUserPlans(userId: string): Promise<any[]> {
  const response = await get<{ success: boolean; data: any[] }>(`/admin/users/${userId}/plans`);
  return response.data;
}

/**
 * Get user statistics
 */
export async function getUserStatistics(userId: string): Promise<UserStatistics> {
  const response = await get<{ success: boolean; data: UserStatistics }>(
    `/admin/users/${userId}/statistics`
  );
  return response.data;
}

/**
 * Get user active sessions
 */
export async function getUserSessions(userId: string): Promise<UserSession[]> {
  const response = await get<{ success: boolean; data: UserSession[] }>(
    `/admin/users/${userId}/sessions`
  );
  return response.data;
}

/**
 * Terminate all user sessions
 */
export async function terminateUserSessions(userId: string): Promise<void> {
  await post<void>(`/admin/users/${userId}/terminate-sessions`, {});
}

/**
 * Send email to user
 */
export async function sendEmailToUser(userId: string, payload: SendEmailPayload): Promise<void> {
  await post<void>(`/admin/users/${userId}/send-email`, payload);
}

/**
 * Get user notes
 */
export async function getUserNotes(userId: string): Promise<UserNote[]> {
  const response = await get<{ success: boolean; data: UserNote[] }>(
    `/admin/users/${userId}/notes`
  );
  return response.data;
}

/**
 * Add user note
 */
export async function addUserNote(userId: string, note: string): Promise<UserNote> {
  const response = await post<{ success: boolean; data: UserNote }>(
    `/admin/users/${userId}/notes`,
    { note }
  );
  return response.data;
}

/**
 * Search users
 */
export async function searchUsers(query: string, limit: number = 20): Promise<User[]> {
  const response = await get<{ success: boolean; data: User[] }>(
    `/admin/users/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return response.data;
}

/**
 * Export users to CSV
 */
export async function exportUsers(filters: GetUsersParams = {}): Promise<Blob> {
  const queryString = buildQueryString(filters);
  const response = await fetch(`/api/admin/users/export${queryString}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to export users');
  }
  
  return response.blob();
}

/**
 * Bulk update users
 */
export async function bulkUpdateUsers(payload: BulkUpdatePayload): Promise<void> {
  await post<void>('/admin/users/bulk-update', payload);
}

/**
 * Get user stats summary
 */
export async function getUserStats(): Promise<{
  total: number;
  active: number;
  suspended: number;
  banned: number;
  students: number;
  admins: number;
}> {
  const response = await getUsers({ limit: 10000 });
  const users = response.data;
  
  return {
    total: users.length,
    active: users.filter(u => !u.is_blocked && !u.is_banned).length,
    suspended: users.filter(u => u.is_blocked && !u.is_banned).length,
    banned: users.filter(u => u.is_banned).length,
    students: users.filter(u => u.role === 'STUDENT').length,
    admins: users.filter(u => u.role === 'ADMIN').length,
  };
}
