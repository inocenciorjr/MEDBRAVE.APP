import { firestore, auth } from '../../../config/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { UserRole } from '../../user/types';
import { AdminAction, AdminStats } from '../types/AdminTypes';

// Coleções Firestore
const ADMIN_ACTIONS_COLLECTION = 'adminActions';
const ADMIN_TASKS_COLLECTION = 'adminTasks';
const ADMIN_STATS_COLLECTION = 'adminStats';
const USERS_COLLECTION = 'users';
const DELETED_USERS_COLLECTION = 'deletedUsers';

// Tipos auxiliares para tarefas e stats
export interface AdminTask {
  id: string;
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Timestamp | null;
  completedAt?: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdminStatsDaily {
  id: string;
  date: string; // YYYY-MM-DD
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalPayments: number;
  totalRevenue: number;
  activeSubscriptions: number;
  contentCount: Record<string, number>;
  updatedAt: Timestamp;
}

/**
 * Serviço administrativo robusto para gestão de usuários, papéis e auditoria.
 * Permite promover/demover papéis, bloquear/desbloquear/excluir usuários, logar ações, etc.
 */
export class AdminService {
  /**
   * Loga uma ação administrativa detalhada.
   */
  static async logAdminAction(action: Omit<AdminAction, 'timestamp'> & { timestamp?: Date }) {
    const now = action.timestamp || new Date();
    const log: AdminAction = { ...action, timestamp: now };
    await firestore.collection(ADMIN_ACTIONS_COLLECTION).add(log);
  }

  /**
   * Altera o papel de um usuário (admin, mentor, teacher, student, etc).
   */
  static async setUserRole(userId: string, role: UserRole, performedBy: string) {
    // Atualiza claims customizadas
    await auth.setCustomUserClaims(userId, { role });
    // Atualiza no Firestore
    await firestore.collection(USERS_COLLECTION).doc(userId).update({
      role,
      updatedAt: Timestamp.now(),
    });
    await this.logAdminAction({
      type: 'set_role',
      description: `Papel de usuário alterado para ${role}`,
      performedBy,
      metadata: { userId, role },
    });
  }

  /**
   * Verifica se um usuário possui determinado papel.
   */
  static async isUserRole(userId: string, role: UserRole): Promise<boolean> {
    const userDoc = await firestore.collection(USERS_COLLECTION).doc(userId).get();
    if (!userDoc.exists) return false;
    const user = userDoc.data();
    return user?.role === role;
  }

  /**
   * Bloqueia um usuário (Auth + Firestore).
   */
  static async blockUser(userId: string, performedBy: string, reason: string) {
    await auth.updateUser(userId, { disabled: true });
    await firestore.collection(USERS_COLLECTION).doc(userId).update({
      isBlocked: true,
      blockReason: reason,
      blockedBy: performedBy,
      blockedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await this.logAdminAction({
      type: 'block_user',
      description: `Usuário bloqueado`,
      performedBy,
      metadata: { userId, reason },
    });
  }

  /**
   * Desbloqueia um usuário (Auth + Firestore).
   */
  static async unblockUser(userId: string, performedBy: string) {
    await auth.updateUser(userId, { disabled: false });
    await firestore.collection(USERS_COLLECTION).doc(userId).update({
      isBlocked: false,
      blockReason: null,
      unblockedBy: performedBy,
      unblockedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await this.logAdminAction({
      type: 'unblock_user',
      description: `Usuário desbloqueado`,
      performedBy,
      metadata: { userId },
    });
  }

  /**
   * Exclui um usuário (Auth + registro em Firestore).
   */
  static async deleteUser(userId: string, performedBy: string, reason: string) {
    await auth.deleteUser(userId);
    await firestore.collection('deletedUsers').doc(userId).set({
      deletedBy: performedBy,
      deletedAt: Timestamp.now(),
      reason,
    });
    await this.logAdminAction({
      type: 'delete_user',
      description: `Usuário excluído`,
      performedBy,
      metadata: { userId, reason },
    });
  }

  /**
   * Lista usuários por papel (admin, mentor, etc).
   */
  static async listUsersByRole(role: UserRole): Promise<any[]> {
    const snapshot = await firestore.collection(USERS_COLLECTION).where('role', '==', role).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Busca estatísticas administrativas básicas.
   */
  static async getAdminStats(): Promise<AdminStats> {
    // Exemplo: total de usuários, ativos, etc. (pode ser expandido)
    const usersSnap = await firestore.collection(USERS_COLLECTION).get();
    const totalUsers = usersSnap.size;
    const activeUsers = usersSnap.docs.filter(doc => doc.data().status === 'ACTIVE').length;
    // Adapte para outros stats conforme necessário
    return {
      totalUsers,
      activeUsers,
      totalPosts: 0, // Implemente se necessário
      reportedContent: 0, // Implemente se necessário
    };
  }

  // Métodos de tarefas administrativas podem ser adicionados aqui, se necessário

  static async getAdminActions(options: {
    performedBy?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    orderBy?: 'timestamp';
    orderDirection?: 'asc' | 'desc';
  } = {}) {
    let query: FirebaseFirestore.Query = firestore.collection(ADMIN_ACTIONS_COLLECTION);
    if (options.performedBy) query = query.where('performedBy', '==', options.performedBy);
    if (options.type) query = query.where('type', '==', options.type);
    if (options.startDate) query = query.where('timestamp', '>=', options.startDate);
    if (options.endDate) query = query.where('timestamp', '<=', options.endDate);
    if (options.orderBy) query = query.orderBy(options.orderBy, options.orderDirection || 'desc');
    else query = query.orderBy('timestamp', 'desc');
    if (options.offset) query = query.offset(options.offset);
    if (options.limit) query = query.limit(options.limit);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async createAdminTask(task: Omit<AdminTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminTask> {
    const ref = firestore.collection(ADMIN_TASKS_COLLECTION).doc();
    const now = Timestamp.now();
    const newTask: AdminTask = { id: ref.id, ...task, createdAt: now, updatedAt: now };
    await ref.set(newTask);
    return newTask;
  }

  static async getAdminTaskById(taskId: string): Promise<AdminTask | null> {
    const doc = await firestore.collection(ADMIN_TASKS_COLLECTION).doc(taskId).get();
    return doc.exists ? (doc.data() as AdminTask) : null;
  }

  static async getAdminTasks(options: {
    assignedTo?: string;
    status?: AdminTask['status'];
    priority?: AdminTask['priority'];
    createdBy?: string;
    dueBeforeDate?: Date;
    dueAfterDate?: Date;
    limit?: number;
    offset?: number;
    orderBy?: 'dueDate' | 'priority' | 'createdAt' | 'updatedAt';
    orderDirection?: 'asc' | 'desc';
  } = {}) {
    let query: FirebaseFirestore.Query = firestore.collection(ADMIN_TASKS_COLLECTION);
    if (options.assignedTo) query = query.where('assignedTo', '==', options.assignedTo);
    if (options.status) query = query.where('status', '==', options.status);
    if (options.priority) query = query.where('priority', '==', options.priority);
    if (options.createdBy) query = query.where('createdBy', '==', options.createdBy);
    if (options.dueBeforeDate) query = query.where('dueDate', '<=', options.dueBeforeDate);
    if (options.dueAfterDate) query = query.where('dueDate', '>=', options.dueAfterDate);
    if (options.orderBy) query = query.orderBy(options.orderBy, options.orderDirection || 'asc');
    else query = query.orderBy('dueDate', 'asc');
    if (options.offset) query = query.offset(options.offset);
    if (options.limit) query = query.limit(options.limit);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async updateAdminTask(taskId: string, updates: Partial<Omit<AdminTask, 'id' | 'createdAt' | 'createdBy'>>): Promise<AdminTask | null> {
    const ref = firestore.collection(ADMIN_TASKS_COLLECTION).doc(taskId);
    const updateData = { ...updates, updatedAt: Timestamp.now() };
    if (updates.status === 'completed' && !updates.completedAt) {
      (updateData as any).completedAt = Timestamp.now();
    }
    await ref.update(updateData);
    const updatedDoc = await ref.get();
    return updatedDoc.exists ? (updatedDoc.data() as AdminTask) : null;
  }

  static async deleteAdminTask(taskId: string): Promise<void> {
    await firestore.collection(ADMIN_TASKS_COLLECTION).doc(taskId).delete();
  }

  static async generateAdminStats(date: Date = new Date()): Promise<AdminStatsDaily> {
    // Exemplo simplificado: adapte para buscar dados reais de pagamentos, assinaturas, etc.
    const dateString = date.toISOString().split('T')[0];
    const startOfDay = new Date(date); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date); endOfDay.setHours(23,59,59,999);
    // Usuários
    const usersSnap = await firestore.collection(USERS_COLLECTION).get();
    const totalUsers = usersSnap.size;
    const newUsers = usersSnap.docs.filter(doc => {
      const createdAt = doc.data().createdAt;
      return createdAt && createdAt.toDate() >= startOfDay && createdAt.toDate() <= endOfDay;
    }).length;
    const activeUsers = usersSnap.docs.filter(doc => doc.data().status === 'ACTIVE').length;
    // Placeholders para pagamentos/assinaturas
    const totalPayments = 0;
    const totalRevenue = 0;
    const activeSubscriptions = 0;
    const contentCount = { questions: 0, articles: 0, videos: 0, courses: 0 };
    const now = Timestamp.now();
    const stats: AdminStatsDaily = {
      id: dateString,
      date: dateString,
      totalUsers,
      newUsers,
      activeUsers,
      totalPayments,
      totalRevenue,
      activeSubscriptions,
      contentCount,
      updatedAt: now
    };
    await firestore.collection(ADMIN_STATS_COLLECTION).doc(dateString).set(stats);
    return stats;
  }

  static async isUserAdmin(userId: string): Promise<boolean> {
    const userDoc = await firestore.collection(USERS_COLLECTION).doc(userId).get();
    if (!userDoc.exists) return false;
    const user = userDoc.data();
    return user?.role === UserRole.ADMIN;
  }

  static async setUserAsAdmin(userId: string, adminId: string): Promise<void> {
    const isAdmin = await this.isUserAdmin(adminId);
    if (!isAdmin) throw new Error('Sem permissão para promover admin');
    await auth.setCustomUserClaims(userId, { role: UserRole.ADMIN, admin: true });
    await firestore.collection(USERS_COLLECTION).doc(userId).update({ role: UserRole.ADMIN, updatedAt: Timestamp.now() });
    await this.logAdminAction({ type: 'set_admin', description: 'Promovido a admin', performedBy: adminId, metadata: { userId } });
  }

  static async removeUserAdmin(userId: string, adminId: string): Promise<void> {
    const isAdmin = await this.isUserAdmin(adminId);
    if (!isAdmin) throw new Error('Sem permissão para remover admin');
    await auth.setCustomUserClaims(userId, { role: UserRole.STUDENT, admin: false });
    await firestore.collection(USERS_COLLECTION).doc(userId).update({ role: UserRole.STUDENT, updatedAt: Timestamp.now() });
    await this.logAdminAction({ type: 'remove_admin', description: 'Removido admin', performedBy: adminId, metadata: { userId } });
  }

  static async deleteUserByAdmin(userId: string, adminId: string, reason: string): Promise<void> {
    const isAdmin = await this.isUserAdmin(adminId);
    if (!isAdmin) throw new Error('Sem permissão para excluir usuário');
    await auth.deleteUser(userId);
    await firestore.collection(DELETED_USERS_COLLECTION).doc(userId).set({ deletedBy: adminId, deletedAt: Timestamp.now(), reason });
    await this.logAdminAction({ type: 'delete_user', description: 'Usuário excluído', performedBy: adminId, metadata: { userId, reason } });
  }
} 