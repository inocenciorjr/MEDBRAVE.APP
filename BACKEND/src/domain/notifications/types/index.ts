import { Timestamp } from 'firebase-admin/firestore';

/**
 * Tipos de notificações suportados
 */
export enum NotificationType {
  GENERAL = 'general',
  SYSTEM = 'system',
  PAYMENT = 'payment',
  CONTENT = 'content',
  EXAM = 'exam',
  SOCIAL = 'social',
  ACHIEVEMENT = 'achievement',
  REMINDER = 'reminder',
  ALERT = 'alert',
}

/**
 * Níveis de prioridade de notificações
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Canais de entrega de notificação
 */
export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
}

/**
 * Estrutura base de uma notificação
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  data?: Record<string, any>;
  readAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dados para criação de uma notificação
 */
export interface CreateNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  data?: Record<string, any>;
  expiresAt?: Date | null;
}

/**
 * Dados para atualização de uma notificação
 */
export interface UpdateNotificationPayload {
  title?: string;
  message?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  read?: boolean;
  data?: Record<string, any>;
  expiresAt?: Date | null;
}

/**
 * Opções para listagem de notificações
 */
export interface ListNotificationsOptions {
  limit?: number;
  offset?: number;
  page?: number;
  isRead?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  orderByCreatedAt?: 'asc' | 'desc';
  includeExpired?: boolean;
}

/**
 * Resultado paginado de notificações
 */
export interface PaginatedNotificationsResult {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface para dispositivos de usuário (para push notifications)
 */
export interface Device {
  id: string;
  userId: string;
  deviceType: 'ios' | 'android' | 'web' | 'desktop';
  deviceModel?: string;
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string;
  fcmToken?: string;
  lastLoginAt: Timestamp;
  lastActiveAt: Timestamp;
  isActive: boolean;
  metadata?: Record<string, any> | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Payload para registro de dispositivo
 */
export interface RegisterDevicePayload {
  userId: string;
  deviceType: Device['deviceType'];
  deviceModel?: string;
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string;
  fcmToken?: string;
  metadata?: Record<string, any>;
}

/**
 * Opções para listagem de dispositivos
 */
export interface ListDevicesOptions {
  userId?: string;
  deviceType?: Device['deviceType'];
  isActive?: boolean;
  hasPushToken?: boolean;
  hasFcmToken?: boolean;
  orderBy?: keyof Device;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  page?: number;
  offset?: number;
}

/**
 * Resultado paginado de dispositivos
 */
export interface PaginatedDevicesResult {
  devices: Device[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface para token de verificação de email
 */
export interface EmailVerificationToken {
  id: string;
  userId: string;
  email: string;
  token: string;
  type: 'verification' | 'password_reset' | 'email_change' | 'invitation';
  expiresAt: Timestamp;
  usedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata?: Record<string, any> | null;
}

/**
 * Payload para criação de token de verificação de email
 */
export interface CreateEmailVerificationTokenPayload {
  userId: string;
  email: string;
  type: EmailVerificationToken['type'];
  expiresInMinutes?: number;
  metadata?: Record<string, any>;
}

/**
 * Opções para listagem de tokens de verificação de email
 */
export interface ListEmailVerificationTokensOptions {
  userId?: string;
  email?: string;
  type?: EmailVerificationToken['type'];
  isActive?: boolean;
  isExpired?: boolean;
  isUsed?: boolean;
  limit?: number;
  page?: number;
  offset?: number;
}

/**
 * Resultado paginado de tokens de verificação de email
 */
export interface PaginatedEmailVerificationTokensResult {
  tokens: EmailVerificationToken[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Configurações de preferências de notificações
 */
export interface NotificationPreferences {
  id: string;
  userId: string;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
  };
  types: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels?: {
        email?: boolean;
        push?: boolean;
        sms?: boolean;
        inApp?: boolean;
      };
    };
  };
  doNotDisturb: {
    enabled: boolean;
    startTime?: string; // Format: HH:MM
    endTime?: string; // Format: HH:MM
    timezone?: string; // IANA timezone format
  };
  createdAt: Date;
  updatedAt: Date;
}
