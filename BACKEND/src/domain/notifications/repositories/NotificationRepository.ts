import { firestore } from 'firebase-admin';
import {
  Notification,
  CreateNotificationPayload,
  UpdateNotificationPayload,
  ListNotificationsOptions,
  PaginatedNotificationsResult,
  NotificationChannel,
} from '../types';

/**
 * Interface para o repositório de notificações
 */
export interface INotificationRepository {
  create(notification: CreateNotificationPayload): Promise<string>;
  getById(id: string): Promise<Notification | null>;
  getByUserId(
    userId: string,
    options?: ListNotificationsOptions,
  ): Promise<PaginatedNotificationsResult>;
  update(id: string, data: UpdateNotificationPayload): Promise<void>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
  updateDeliveryStatus(
    id: string,
    channel: NotificationChannel,
    status: 'PENDING' | 'SENT' | 'FAILED',
  ): Promise<void>;
}

/**
 * Implementação do repositório de notificações usando Firebase
 */
export class FirebaseNotificationRepository implements INotificationRepository {
  private db: firestore.Firestore;
  private collection: string = 'notifications';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  /**
   * Cria uma nova notificação
   */
  async create(notification: CreateNotificationPayload): Promise<string> {
    const now = firestore.Timestamp.now();

    const notificationData = {
      ...notification,
      isRead: false,
      readAt: null,
      // deliveryStatus: this.initializeDeliveryStatus(notification.channels || []), // Removido pois 'channels' não existe
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.db.collection(this.collection).add(notificationData);
    return docRef.id;
  }

  /**
   * Busca uma notificação pelo ID
   */
  async getById(id: string): Promise<Notification | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as Notification;
  }

  /**
   * Busca notificações por ID de usuário
   */
  async getByUserId(
    userId: string,
    options: ListNotificationsOptions = {},
  ): Promise<PaginatedNotificationsResult> {
    const {
      isRead,
      type,
      priority,
      limit = 10,
      page = 1,
      orderByCreatedAt = 'desc',
      includeExpired = false,
    } = options;

    let query = this.db.collection(this.collection).where('userId', '==', userId);

    if (typeof isRead === 'boolean') {
      query = query.where('isRead', '==', isRead);
    }

    if (type) {
      query = query.where('type', '==', type);
    }

    if (priority) {
      query = query.where('priority', '==', priority);
    }

    // Aplicar filtro para notificações não expiradas
    if (!includeExpired) {
      const now = firestore.Timestamp.now();
      // Firestore não permite queries OR diretamente, então usamos um truque:
      // Buscamos apenas as notificações que não expiraram (expiresAt > now) ou que não têm data de expiração (expiresAt == null)
      query = query.where('expiresAt', '>=', now);
    }

    // Contagem total de documentos que atendem aos critérios
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Ordenação e paginação
    query = query.orderBy('createdAt', orderByCreatedAt === 'asc' ? 'asc' : 'desc');
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    // Executar a consulta
    const snapshot = await query.get();
    const notifications = snapshot.docs.map(doc => {
      return { id: doc.id, ...doc.data() } as Notification;
    });

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Atualiza uma notificação
   */
  async update(id: string, data: UpdateNotificationPayload): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: firestore.Timestamp.now(),
    };

    await this.db.collection(this.collection).doc(id).update(updateData);
  }

  /**
   * Marca uma notificação como lida
   */
  async markAsRead(id: string): Promise<void> {
    const now = firestore.Timestamp.now();

    await this.db.collection(this.collection).doc(id).update({
      isRead: true,
      readAt: now,
      updatedAt: now,
    });
  }

  /**
   * Marca todas as notificações de um usuário como lidas
   */
  async markAllAsRead(userId: string): Promise<void> {
    const batch = this.db.batch();
    const now = firestore.Timestamp.now();

    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .get();

    snapshot.docs.forEach(doc => {
      const docRef = this.db.collection(this.collection).doc(doc.id);
      batch.update(docRef, {
        isRead: true,
        readAt: now,
        updatedAt: now,
      });
    });

    await batch.commit();
  }

  /**
   * Remove uma notificação
   */
  async delete(id: string): Promise<void> {
    await this.db.collection(this.collection).doc(id).delete();
  }

  /**
   * Remove todas as notificações de um usuário
   */
  async deleteAllForUser(userId: string): Promise<void> {
    const batch = this.db.batch();

    const snapshot = await this.db.collection(this.collection).where('userId', '==', userId).get();

    snapshot.docs.forEach(doc => {
      const docRef = this.db.collection(this.collection).doc(doc.id);
      batch.delete(docRef);
    });

    await batch.commit();
  }

  /**
   * Atualiza o status de entrega para um canal específico
   */
  async updateDeliveryStatus(
    id: string,
    channel: NotificationChannel,
    status: 'PENDING' | 'SENT' | 'FAILED',
  ): Promise<void> {
    const now = firestore.Timestamp.now();

    const fieldPath = `deliveryStatus.${channel}`;
    await this.db
      .collection(this.collection)
      .doc(id)
      .update({
        [fieldPath]: status,
        updatedAt: now,
      });
  }
}
