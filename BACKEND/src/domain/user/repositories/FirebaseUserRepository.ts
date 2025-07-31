import { auth, firestore } from '../../../config/firebaseAdmin';
import { IUserRepository, FindUsersOptions } from './IUserRepository';
import { User, UserRole } from '../entities/User';
import { Result, Success, Failure } from '../../../shared/types/Result';
import { Timestamp, CollectionReference, Query } from 'firebase-admin/firestore';

const USERS_COLLECTION = 'users';

export class FirebaseUserRepository implements IUserRepository {
  private collection: CollectionReference;

  constructor() {
    this.collection = firestore.collection(USERS_COLLECTION);
  }

  async create(user: User, password: string): Promise<Result<User>> {
    try {
      // Criar usuário no Firebase Auth
      const userRecord = await auth.createUser({
        email: user.email,
        password,
        displayName: user.name,
        emailVerified: false,
        disabled: false,
      });

      const now = Timestamp.now();

      // Preparar dados para o Firestore
      const userData = {
        id: userRecord.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };

      // Salvar no Firestore
      await this.collection.doc(userRecord.uid).set(userData);

      // Retornar usuário criado
      return Success(
        User.create({
          ...userData,
          id: userRecord.uid,
        }).getValue(),
      );
    } catch (error) {
      return Failure(error instanceof Error ? error : new Error('Erro ao criar usuário'));
    }
  }

  async findById(id: string): Promise<Result<User | null>> {
    try {
      const doc = await this.collection.doc(id).get();

      if (!doc.exists) {
        return Success(null);
      }

      const userData = doc.data();
      const userProps = {
        id: doc.id,
        email: userData?.email ?? '',
        name: userData?.name ?? '',
        role: userData?.role ?? UserRole.STUDENT,
      };
      return Success(
        User.create(userProps).getValue(),
      );
    } catch (error) {
      return Failure(error instanceof Error ? error : new Error('Erro ao buscar usuário'));
    }
  }

  async findByEmail(email: string): Promise<Result<User | null>> {
    try {
      const snapshot = await this.collection.where('email', '==', email).limit(1).get();

      if (snapshot.empty) {
        return Success(null);
      }

      const doc = snapshot.docs[0];
      const userData = doc.data();
      const userProps = {
        id: doc.id,
        email: userData?.email ?? '',
        name: userData?.name ?? '',
        role: userData?.role ?? UserRole.STUDENT,
      };
      return Success(
        User.create(userProps).getValue(),
      );
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao buscar usuário por email'),
      );
    }
  }

  async findUsers(options: FindUsersOptions): Promise<Result<{ users: User[]; total: number }>> {
    try {
      let query: Query = this.collection;

      if (options.role) {
        query = query.where('role', '==', options.role);
      }

      if (options.searchTerm) {
        const searchTermLower = options.searchTerm.toLowerCase();
        query = query
          .where('searchableText', '>=', searchTermLower)
          .where('searchableText', '<=', searchTermLower + '\\uf8ff');
      }

      if (options.startAfter) {
        const startAfterDoc = await this.collection.doc(options.startAfter).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }

      const sortBy = options.sortBy || 'createdAt';
      const sortDirection = options.sortDirection || 'desc';
      query = query.orderBy(sortBy, sortDirection);

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      const users = snapshot.docs.map(doc => {
        const userData = doc.data();
        const userProps = {
          id: doc.id,
          email: userData?.email ?? '',
          name: userData?.name ?? '',
          role: userData?.role ?? UserRole.STUDENT,
        };
        return User.create(userProps).getValue();
      });

      const total = snapshot.size;

      return Success({ users, total });
    } catch (error) {
      return Failure(error instanceof Error ? error : new Error('Erro ao buscar usuários'));
    }
  }

  async update(id: string, userData: Partial<User>): Promise<Result<User>> {
    try {
      const userRef = this.collection.doc(id);
      const doc = await userRef.get();

      if (!doc.exists) {
        return Failure(new Error('Usuário não encontrado'));
      }

      const updateData = {
        ...userData,
        updatedAt: Timestamp.now(),
      };

      await userRef.update(updateData);

      const updatedDoc = await userRef.get();
      const updatedData = updatedDoc.data();

      // Garantir que todos os campos obrigatórios estejam presentes
      const userProps = {
        id: doc.id,
        email: updatedData?.email ?? '',
        name: updatedData?.name ?? '',
        role: updatedData?.role ?? UserRole.STUDENT,
      };

      return Success(
        User.create(userProps).getValue(),
      );
    } catch (error) {
      return Failure(error instanceof Error ? error : new Error('Erro ao atualizar usuário'));
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const doc = await this.collection.doc(id).get();

      if (!doc.exists) {
        return Failure(new Error('Usuário não encontrado'));
      }

      await Promise.all([auth.deleteUser(id), this.collection.doc(id).delete()]);

      return Success(void 0);
    } catch (error) {
      return Failure(error instanceof Error ? error : new Error('Erro ao deletar usuário'));
    }
  }

  async disable(id: string): Promise<Result<void>> {
    try {
      const doc = await this.collection.doc(id).get();

      if (!doc.exists) {
        return Failure(new Error('Usuário não encontrado'));
      }

      await Promise.all([
        auth.updateUser(id, { disabled: true }),
        this.collection.doc(id).update({
          isActive: false,
          updatedAt: Timestamp.now(),
        }),
      ]);

      return Success(void 0);
    } catch (error) {
      return Failure(error instanceof Error ? error : new Error('Erro ao desabilitar usuário'));
    }
  }

  async enable(id: string): Promise<Result<void>> {
    try {
      const doc = await this.collection.doc(id).get();

      if (!doc.exists) {
        return Failure(new Error('Usuário não encontrado'));
      }

      await Promise.all([
        auth.updateUser(id, { disabled: false }),
        this.collection.doc(id).update({
          isActive: true,
          updatedAt: Timestamp.now(),
        }),
      ]);

      return Success(void 0);
    } catch (error) {
      return Failure(error instanceof Error ? error : new Error('Erro ao habilitar usuário'));
    }
  }
}
