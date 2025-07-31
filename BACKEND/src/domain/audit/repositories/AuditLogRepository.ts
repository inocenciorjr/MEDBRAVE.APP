import { firestore } from 'firebase-admin';
import { AdminAuditLog, AdminAction } from '../types';
import {
  AuditLogFilterOptions,
  AuditLogPaginationOptions,
  PaginatedAuditLogResult,
} from '../types';

/**
 * Interface para o repositório de logs de auditoria
 */
export interface IAuditLogRepository {
  logAction(action: AdminAction): Promise<void>;
  getById(id: string): Promise<AdminAuditLog | null>;
  getAll(
    filter?: AuditLogFilterOptions,
    pagination?: AuditLogPaginationOptions,
  ): Promise<PaginatedAuditLogResult>;
  getByUserId(userId: string): Promise<AdminAuditLog[]>;
  getByActionType(actionType: string): Promise<AdminAuditLog[]>;
}

/**
 * Implementação do repositório de logs de auditoria usando Firebase
 */
export class FirebaseAuditLogRepository implements IAuditLogRepository {
  private db: firestore.Firestore;
  private collection: string = 'audit_logs';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  /**
   * Registra uma ação no log de auditoria
   */
  async logAction(action: AdminAction): Promise<void> {
    const auditLog: AdminAuditLog = {
      id: this.db.collection(this.collection).doc().id,
      action,
      createdAt: new Date(),
    };

    await this.db.collection(this.collection).doc(auditLog.id).set(auditLog);
  }

  /**
   * Busca um log de auditoria pelo ID
   */
  async getById(id: string): Promise<AdminAuditLog | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as AdminAuditLog;
  }

  /**
   * Retorna logs de auditoria com filtros e paginação
   */
  async getAll(
    filter?: AuditLogFilterOptions,
    pagination: AuditLogPaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedAuditLogResult> {
    let query = this.db.collection(this.collection).orderBy('createdAt', 'desc');

    // Aplicar filtros
    if (filter) {
      if (filter.actionType) {
        query = query.where('action.type', '==', filter.actionType);
      }

      if (filter.userId) {
        query = query.where('action.performedBy', '==', filter.userId);
      }

      if (filter.startDate) {
        query = query.where('createdAt', '>=', filter.startDate);
      }

      if (filter.endDate) {
        query = query.where('createdAt', '<=', filter.endDate);
      }

      // Filtros de texto precisam ser feitos no cliente
      // ou usando uma ferramenta de pesquisa mais avançada
    }

    // Obter contagem total
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Aplicar paginação
    const offset = (pagination.page - 1) * pagination.limit;
    query = query.limit(pagination.limit).offset(offset);

    // Executar consulta
    const snapshot = await query.get();
    const logs = snapshot.docs.map(doc => doc.data() as AdminAuditLog);

    return {
      logs,
      total,
      page: pagination.page,
      limit: pagination.limit,
      hasMore: offset + logs.length < total,
    };
  }

  /**
   * Busca logs de auditoria por ID de usuário
   */
  async getByUserId(userId: string): Promise<AdminAuditLog[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('action.performedBy', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as AdminAuditLog);
  }

  /**
   * Busca logs de auditoria por tipo de ação
   */
  async getByActionType(actionType: string): Promise<AdminAuditLog[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('action.type', '==', actionType)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as AdminAuditLog);
  }
}
