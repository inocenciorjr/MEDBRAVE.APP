/**
 * Notification types for admin management
 */

export enum NotificationType {
  GENERAL = 'GENERAL',
  SYSTEM = 'SYSTEM',
  PAYMENT = 'PAYMENT',
  CONTENT = 'CONTENT',
  EXAM = 'EXAM',
  SOCIAL = 'SOCIAL',
  ACHIEVEMENT = 'ACHIEVEMENT',
  REMINDER = 'REMINDER',
  ALERT = 'ALERT',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  data?: Record<string, any>;
  readAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
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

export type NotificationSortField = 'createdAt' | 'priority' | 'type' | 'read';
