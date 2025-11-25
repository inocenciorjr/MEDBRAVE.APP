// Removed Firebase Timestamp import - using native Date instead

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
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  data?: Record<string, any>;
  read_at?: Date | null;
  expires_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Dados para criação de uma notificação
 */
export interface CreateNotificationPayload {
  user_id: string;
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  data?: Record<string, any>;
  expires_at?: Date | null;
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
  expires_at?: Date | null;
}

/**
 * Opções para listagem de notificações
 */
export interface ListNotificationsOptions {
  limit?: number;
  offset?: number;
  page?: number;
  is_read?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  order_by_created_at?: 'asc' | 'desc';
  include_expired?: boolean;
}

/**
 * Resultado paginado de notificações
 */
export interface PaginatedNotificationsResult {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Interface para dispositivos de usuário (para push notifications)
 */
export interface Device {
  id: string;
  user_id: string;
  device_type: 'ios' | 'android' | 'web' | 'desktop';
  device_model?: string;
  device_name?: string;
  os_version?: string;
  app_version?: string;
  push_token?: string;
  fcm_token?: string;
  last_login_at: Date;
  last_active_at: Date;
  is_active: boolean;
  metadata?: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Payload para registro de dispositivo
 */
export interface RegisterDevicePayload {
  user_id: string;
  device_type: Device['device_type'];
  device_model?: string;
  device_name?: string;
  os_version?: string;
  app_version?: string;
  push_token?: string;
  fcm_token?: string;
  metadata?: Record<string, any>;
}

/**
 * Opções para listagem de dispositivos
 */
export interface ListDevicesOptions {
  user_id?: string;
  device_type?: Device['device_type'];
  is_active?: boolean;
  has_push_token?: boolean;
  has_fcm_token?: boolean;
  order_by?: keyof Device;
  order_direction?: 'asc' | 'desc';
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
  total_pages: number;
}

/**
 * Interface para token de verificação de email
 */
export interface EmailVerificationToken {
  id: string;
  user_id: string;
  email: string;
  token: string;
  type: 'verification' | 'password_reset' | 'email_change' | 'invitation';
  expires_at: Date;
  used_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any> | null;
}

/**
 * Payload para criação de token de verificação de email
 */
export interface CreateEmailVerificationTokenPayload {
  user_id: string;
  email: string;
  type: EmailVerificationToken['type'];
  expires_in_minutes?: number;
  metadata?: Record<string, any>;
}

/**
 * Opções para listagem de tokens de verificação de email
 */
export interface ListEmailVerificationTokensOptions {
  user_id?: string;
  email?: string;
  type?: EmailVerificationToken['type'];
  is_active?: boolean;
  is_expired?: boolean;
  is_used?: boolean;
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
  total_pages: number;
}

/**
 * Configurações de preferências de notificações
 */
export interface NotificationPreferences {
  id: string;
  user_id: string;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
    in_app: boolean;
  };
  types: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels?: {
        email?: boolean;
        push?: boolean;
        sms?: boolean;
        in_app?: boolean;
      };
    };
  };
  do_not_disturb: {
    enabled: boolean;
    start_time?: string; // Format: HH:MM
    end_time?: string; // Format: HH:MM
    timezone?: string; // IANA timezone format
  };
  created_at: Date;
  updated_at: Date;
}
