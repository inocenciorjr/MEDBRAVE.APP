// Using string for timestamps in Supabase (ISO 8601 format)
type Timestamp = string;
import { createNotificationsModule } from './src/domain/notifications/factories/createNotificationsModule';
import { createNotificationRoutes } from './src/domain/notifications/routes/notificationRoutes';

/**
 * Tipos de notificações
 */
export enum NotificationType {
  SYSTEM = 'SYSTEM',
  PAYMENT = 'PAYMENT',
  USER = 'USER',
  CONTENT = 'CONTENT',
  MENTORSHIP = 'MENTORSHIP',
  ACHIEVEMENT = 'ACHIEVEMENT',
  PLAN = 'PLAN',
  EXAM = 'EXAM',
  REVIEW = 'REVIEW',
  COMMENT = 'COMMENT',
}

/**
 * Níveis de prioridade das notificações
 */
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Tipos específicos de notificações de pagamento
 */
export enum PaymentNotificationType {
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PAYMENT_CHARGEBACK = 'PAYMENT_CHARGEBACK',
  PAYMENT_STATUS_UPDATED = 'PAYMENT_STATUS_UPDATED',
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
}

/**
 * Interface para uma notificação
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: Timestamp | null;
  actionUrl?: string | null;
  imageUrl?: string | null;
  relatedId?: string | null;
  relatedType?: string | null;
  metadata?: Record<string, any> | null;
  expiresAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Interface para notificação de pagamento
 */
export interface PaymentNotification {
  id: string;
  paymentId?: string | null;
  userId: string;
  type: PaymentNotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Timestamp | null;
  relatedId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Payload para criação de notificação
 */
export type CreateNotificationPayload = Omit<
  Notification,
  'id' | 'isRead' | 'readAt' | 'createdAt' | 'updatedAt'
>;

/**
 * Payload para atualização de notificação
 */
export type UpdateNotificationPayload = Partial<Omit<Notification, 'id' | 'userId' | 'createdAt'>>;

/**
 * Payload para criação de notificação de pagamento
 */
export type CreatePaymentNotificationPayload = Omit<
  PaymentNotification,
  'id' | 'isRead' | 'readAt' | 'createdAt' | 'updatedAt'
>;

/**
 * Payload para atualização de notificação de pagamento
 */
export type UpdatePaymentNotificationPayload = Partial<
  Omit<PaymentNotification, 'id' | 'userId' | 'createdAt'>
>;

/**
 * Opções para listagem de notificações
 */
export interface ListNotificationsOptions {
  isRead?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  limit?: number;
  offset?: number;
  orderByCreatedAt?: 'asc' | 'desc';
  includeExpired?: boolean;
  page?: number;
}

/**
 * Opções para listagem de notificações de pagamento
 */
export interface ListPaymentNotificationsOptions {
  isRead?: boolean;
  type?: PaymentNotificationType;
  limit?: number;
  orderByCreatedAt?: 'asc' | 'desc';
  page?: number;
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
 * Resultado paginado de notificações de pagamento
 */
export interface PaginatedPaymentNotificationsResult {
  notifications: PaymentNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Exporta o módulo de notificações para ser utilizado pela aplicação principal
 * Esta função deve ser chamada pela aplicação principal para registrar as rotas
 *
 * @param app Express application
 */
export const registerNotificationModule = (app: any) => {
  const { notificationController, useCases } = createNotificationsModule();
  const notificationRoutes = createNotificationRoutes(notificationController as any);
  app.use('/api/notifications', notificationRoutes);
  // Se houver rotas de pagamento, adicionar aqui
  return { notificationController, useCases };
};
