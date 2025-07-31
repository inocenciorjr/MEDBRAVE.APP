import * as admin from 'firebase-admin';
import { AdminAuditLog, AdminAction } from '../../domain/admin/types/AdminTypes';
import { validateAdminAuditLog } from '../../domain/admin/validators/adminValidators';
import { IAuditLogService } from './interfaces/IAuditLogService';

export class FirebaseAuditLogService implements IAuditLogService {
  private static instance: FirebaseAuditLogService;
  private db: admin.firestore.Firestore;

  private constructor() {
    this.db = admin.firestore();
  }

  public static getInstance(): FirebaseAuditLogService {
    if (!FirebaseAuditLogService.instance) {
      FirebaseAuditLogService.instance = new FirebaseAuditLogService();
    }
    return FirebaseAuditLogService.instance;
  }

  async logAction(action: AdminAction): Promise<void> {
    const auditLog: AdminAuditLog = {
      id: this.db.collection('audit_logs').doc().id,
      action,
      createdAt: new Date(),
    };

    validateAdminAuditLog(auditLog);
    await this.db.collection('audit_logs').doc(auditLog.id).set(auditLog);
  }

  async getAuditLogs(startDate?: Date, endDate?: Date): Promise<AdminAuditLog[]> {
    let query = this.db.collection('audit_logs').orderBy('createdAt', 'desc');

    if (startDate) {
      query = query.where('createdAt', '>=', startDate);
    }
    if (endDate) {
      query = query.where('createdAt', '<=', endDate);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as AdminAuditLog);
  }

  async getActionsByUser(userId: string): Promise<AdminAuditLog[]> {
    const snapshot = await this.db
      .collection('audit_logs')
      .where('action.performedBy', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as AdminAuditLog);
  }

  async getActionsByType(actionType: string): Promise<AdminAuditLog[]> {
    const snapshot = await this.db
      .collection('audit_logs')
      .where('action.type', '==', actionType)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as AdminAuditLog);
  }

  async getPaginatedAuditLogs(
    page: number,
    limit: number,
  ): Promise<{
    logs: AdminAuditLog[];
    total: number;
    hasMore: boolean;
  }> {
    // Calcular offset
    const offset = (page - 1) * limit;

    // Obter total de documentos
    const countSnapshot = await this.db.collection('audit_logs').count().get();
    const total = countSnapshot.data().count;

    // Obter documentos paginados
    const snapshot = await this.db
      .collection('audit_logs')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const logs = snapshot.docs.map(doc => doc.data() as AdminAuditLog);

    return {
      logs,
      total,
      hasMore: offset + logs.length < total,
    };
  }
}
