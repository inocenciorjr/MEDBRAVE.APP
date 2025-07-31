import { firestore } from 'firebase-admin';
import { AdminUser } from '../types/AdminTypes';

/**
 * Interface para o repositório de administradores
 */
export interface IAdminRepository {
  getAll(): Promise<AdminUser[]>;
  getById(id: string): Promise<AdminUser | null>;
  create(userId: string, role: 'admin' | 'superadmin', permissions: string[]): Promise<string>;
  update(id: string, data: Partial<AdminUser>): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Implementação do repositório de administradores usando Firebase
 */
export class FirebaseAdminRepository implements IAdminRepository {
  private db: firestore.Firestore;
  private collection: string = 'admins';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  /**
   * Retorna todos os administradores
   */
  async getAll(): Promise<AdminUser[]> {
    const snapshot = await this.db.collection(this.collection).get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        role: data.role,
        permissions: data.permissions || [],
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as AdminUser;
    });
  }

  /**
   * Busca um administrador pelo ID
   */
  async getById(id: string): Promise<AdminUser | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      id: doc.id,
      role: data?.role,
      permissions: data?.permissions || [],
      createdAt: data?.createdAt.toDate(),
      updatedAt: data?.updatedAt.toDate(),
    } as AdminUser;
  }

  /**
   * Cria um novo administrador
   */
  async create(
    userId: string,
    role: 'admin' | 'superadmin',
    permissions: string[],
  ): Promise<string> {
    const now = firestore.Timestamp.now();

    const adminData = {
      userId,
      role,
      permissions,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.db.collection(this.collection).add(adminData);
    return docRef.id;
  }

  /**
   * Atualiza um administrador existente
   */
  async update(id: string, data: Partial<AdminUser>): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: firestore.Timestamp.now(),
    };

    await this.db.collection(this.collection).doc(id).update(updateData);
  }

  /**
   * Remove um administrador
   */
  async delete(id: string): Promise<void> {
    await this.db.collection(this.collection).doc(id).delete();
  }
}
