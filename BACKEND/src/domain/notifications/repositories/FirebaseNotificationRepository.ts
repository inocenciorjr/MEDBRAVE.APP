import { injectable } from 'tsyringe';
import { firestore } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { INotificationRepository } from '../interfaces/INotificationRepository';
import {
  CreateNotificationPayload,
  Notification,
  NotificationPriority,
  NotificationType,
} from '../types';

@injectable()
export class FirebaseNotificationRepository implements INotificationRepository {
  private db: firestore.Firestore;
  private collectionRef: firestore.CollectionReference;
  private readonly COLLECTION_NAME = 'notifications';

  constructor() {
    this.db = getFirestore();
    this.collectionRef = this.db.collection(this.COLLECTION_NAME);
  }

  async create(notification: Notification): Promise<Notification> {
    const id = this.collectionRef.doc().id;
    const newNotification: Notification = {
      ...notification,
      id,
    };

    await this.collectionRef.doc(id).set(this.toFirestore(newNotification));
    return newNotification;
  }

  async findById(id: string): Promise<Notification | null> {
    const doc = await this.collectionRef.doc(id).get();
    if (!doc.exists) {
      return null;
    }

    return this.fromFirestore(doc);
  }

  async findByUserId(
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<Notification[]> {
    let query = this.collectionRef.where('userId', '==', userId).orderBy('createdAt', 'desc');

    if (offset > 0) {
      query = query.offset(offset);
    }

    if (limit > 0) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => this.fromFirestore(doc));
  }

  async update(notification: Notification): Promise<Notification> {
    const { id } = notification;

    await this.collectionRef.doc(id).update(this.toFirestore(notification));

    return notification;
  }

  async delete(id: string): Promise<void> {
    await this.collectionRef.doc(id).delete();
  }

  async deleteAll(userId: string): Promise<number> {
    const snapshot = await this.collectionRef.where('userId', '==', userId).get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();

    const snapshot = await this.collectionRef.where('expiresAt', '<', now).get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const snapshot = await this.collectionRef
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();

    if (snapshot.empty) {
      return;
    }

    const batch = this.db.batch();
    const now = new Date();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: now,
        updatedAt: now,
      });
    });

    await batch.commit();
  }

  async getUnreadCount(userId: string): Promise<number> {
    const snapshot = await this.collectionRef
      .where('userId', '==', userId)
      .where('read', '==', false)
      .count()
      .get();

    return snapshot.data().count;
  }

  async findUnreadByTypeAndPriority(
    userId: string,
    type: NotificationType,
    priority: NotificationPriority,
    limit: number = 5,
  ): Promise<Notification[]> {
    const snapshot = await this.collectionRef
      .where('userId', '==', userId)
      .where('read', '==', false)
      .where('type', '==', type)
      .where('priority', '==', priority)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => this.fromFirestore(doc));
  }

  async createMultiple(
    userIds: string[],
    notificationData: Omit<CreateNotificationPayload, 'userId'>,
  ): Promise<number> {
    if (userIds.length === 0) {
      return 0;
    }

    const batch = this.db.batch();
    const now = new Date();

    for (const userId of userIds) {
      const id = this.collectionRef.doc().id;

      const notification: Notification = {
        id,
        userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || NotificationType.GENERAL,
        priority: notificationData.priority || NotificationPriority.NORMAL,
        read: false,
        data: notificationData.data || {},
        createdAt: now,
        updatedAt: now,
      };

      batch.set(this.collectionRef.doc(id), this.toFirestore(notification));
    }

    await batch.commit();
    return userIds.length;
  }

  // Métodos auxiliares de conversão

  private toFirestore(notification: Notification): any {
    return {
      ...notification,
      createdAt: firestore.Timestamp.fromDate(notification.createdAt),
      updatedAt: firestore.Timestamp.fromDate(notification.updatedAt),
      readAt: notification.readAt ? firestore.Timestamp.fromDate(notification.readAt) : null,
      expiresAt: notification.expiresAt
        ? firestore.Timestamp.fromDate(notification.expiresAt)
        : null,
    };
  }

  private fromFirestore(doc: firestore.DocumentSnapshot): Notification {
    const data = doc.data() as any;

    return {
      id: doc.id,
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority,
      read: data.read,
      data: data.data || {},
      readAt: data.readAt ? data.readAt.toDate() : null,
      expiresAt: data.expiresAt ? data.expiresAt.toDate() : null,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}
