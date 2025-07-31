import * as admin from 'firebase-admin';
import { AdminUser, AdminAction } from '../../../domain/admin/types/AdminTypes';
import {
  validateAdminUser,
  validateAdminAction,
} from '../../../domain/admin/validators/adminValidators';

export class FirebaseAdminService {
  private static instance: FirebaseAdminService;
  private db: admin.firestore.Firestore;

  private constructor() {
    this.db = admin.firestore();
  }

  public static getInstance(): FirebaseAdminService {
    if (!FirebaseAdminService.instance) {
      FirebaseAdminService.instance = new FirebaseAdminService();
    }
    return FirebaseAdminService.instance;
  }

  async createAdmin(
    adminData: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<AdminUser> {
    const now = new Date();
    const newAdmin: AdminUser = {
      ...adminData,
      id: this.db.collection('admins').doc().id,
      createdAt: now,
      updatedAt: now,
    };

    validateAdminUser(newAdmin);
    await this.db.collection('admins').doc(newAdmin.id).set(newAdmin);
    return newAdmin;
  }

  async logAdminAction(action: Omit<AdminAction, 'timestamp'>): Promise<void> {
    const actionWithTimestamp: AdminAction = {
      ...action,
      timestamp: new Date(),
    };

    validateAdminAction(actionWithTimestamp);
    await this.db.collection('admin_actions').add(actionWithTimestamp);
  }

  async getAdminById(id: string): Promise<AdminUser | null> {
    const doc = await this.db.collection('admins').doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data() as AdminUser;
  }

  async updateAdminPermissions(id: string, permissions: string[]): Promise<void> {
    await this.db.collection('admins').doc(id).update({
      permissions,
      updatedAt: new Date(),
    });
  }

  async deleteAdmin(id: string): Promise<void> {
    await this.db.collection('admins').doc(id).delete();
  }

  // Novos métodos para o dashboard
  async getTotalUsers(): Promise<number> {
    const snapshot = await this.db.collection('users').count().get();
    return snapshot.data().count;
  }

  async getActiveUsers(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await this.db
      .collection('users')
      .where('lastLoginAt', '>=', thirtyDaysAgo)
      .count()
      .get();

    return snapshot.data().count;
  }

  async getReportedContentCount(): Promise<number> {
    const snapshot = await this.db
      .collection('reports')
      .where('status', '==', 'PENDING')
      .count()
      .get();

    return snapshot.data().count;
  }

  async getAdminByUserId(userId: string): Promise<AdminUser | null> {
    const snapshot = await this.db.collection('admins').where('userId', '==', userId).limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as AdminUser;
  }
}
