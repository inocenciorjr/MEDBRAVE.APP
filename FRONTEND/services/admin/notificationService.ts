/**
 * Notification service for admin management
 */

import { get, post, put, del, buildQueryString } from './baseService';
import type { Notification, NotificationType, NotificationPriority } from '@/types/admin/notification';
import type { ApiResponse, PaginationParams } from '@/types/admin/common';

export interface GetNotificationsParams extends PaginationParams {
  search?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  read?: boolean;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateNotificationPayload {
  userId?: string;
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  data?: Record<string, any>;
  expiresAt?: string | null;
  targetAudience?: 'all' | 'students' | 'teachers' | 'mentors' | 'specific';
  userIds?: string[];
}

export interface UpdateNotificationPayload {
  read?: boolean;
  title?: string;
  message?: string;
}

/**
 * Get list of notifications with filters
 */
export async function getNotifications(params: GetNotificationsParams = { page: 1, limit: 50 }): Promise<ApiResponse<Notification[]>> {
  const queryString = buildQueryString(params);
  return get<ApiResponse<Notification[]>>(`/api/admin/notifications${queryString}`);
}

/**
 * Get single notification by ID
 */
export async function getNotification(notificationId: string): Promise<Notification> {
  return get<Notification>(`/api/admin/notifications/${notificationId}`);
}

/**
 * Create new notification
 */
export async function createNotification(payload: CreateNotificationPayload): Promise<Notification> {
  return post<Notification>('/api/admin/notifications', payload);
}

/**
 * Update notification
 */
export async function updateNotification(notificationId: string, payload: UpdateNotificationPayload): Promise<Notification> {
  return put<Notification>(`/api/admin/notifications/${notificationId}`, payload);
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  return del<void>(`/api/admin/notifications/${notificationId}`);
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  return put<void>(`/api/admin/notifications/${notificationId}/read`, {});
}

/**
 * Mark notification as unread
 */
export async function markAsUnread(notificationId: string): Promise<void> {
  return put<void>(`/api/admin/notifications/${notificationId}/unread`, {});
}

/**
 * Bulk mark as read
 */
export async function bulkMarkAsRead(notificationIds: string[]): Promise<void> {
  return put<void>('/api/admin/notifications/bulk/read', { notificationIds });
}

/**
 * Bulk mark as unread
 */
export async function bulkMarkAsUnread(notificationIds: string[]): Promise<void> {
  return put<void>('/api/admin/notifications/bulk/unread', { notificationIds });
}

/**
 * Bulk delete notifications
 */
export async function bulkDeleteNotifications(notificationIds: string[]): Promise<void> {
  return del<void>(`/api/admin/notifications/bulk?ids=${notificationIds.join(',')}`);
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<{
  total: number;
  unread: number;
  urgent: number;
  today: number;
}> {
  return get('/api/admin/notifications/stats');
}
