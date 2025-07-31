import {
  Firestore,
  CollectionReference,
  DocumentReference,
  Timestamp,
  Query,
  WhereFilterOp,
  DocumentData,
} from 'firebase-admin/firestore';
import { firestore } from '../../../config/firebaseAdmin';
import { IRepository } from '../interfaces/IRepository';
import logger from '../../../utils/logger';

/**
 * Implementação base de repositório para Firebase Firestore
 * Fornece uma implementação genérica dos métodos CRUD para qualquer entidade
 */
export abstract class FirebaseBaseRepository<T extends { id: string }> implements IRepository<T> {
  protected db: Firestore;
  protected collection: CollectionReference;
  protected collectionName: string;

  /**
   * Construtor do repositório base
   * @param collectionName Nome da coleção no Firestore
   */
  constructor(collectionName: string) {
    this.db = firestore;
    this.collectionName = collectionName;
    this.collection = this.db.collection(collectionName);
  }

  /**
   * Cria uma nova entidade no Firestore
   * @param entity Dados da entidade sem o ID
   * @returns Entidade criada com ID
   */
  async create(entity: Omit<T, 'id'>): Promise<T> {
    try {
      const docRef = this.collection.doc();
      const timestamp = Timestamp.now();

      const data = {
        ...entity,
        id: docRef.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      } as unknown as T;

      await docRef.set(data);
      logger.info(`Entity created in ${this.collectionName} with ID: ${docRef.id}`);

      return data;
    } catch (error) {
      logger.error(`Error creating entity in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Busca uma entidade pelo ID
   * @param id ID da entidade
   * @returns Entidade encontrada ou null
   */
  async findById(id: string): Promise<T | null> {
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        logger.info(`Entity with ID ${id} not found in ${this.collectionName}`);
        return null;
      }

      return doc.data() as T;
    } catch (error) {
      logger.error(`Error finding entity by ID ${id} in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Busca todas as entidades com paginação, ordenação e filtros
   * @param options Opções de consulta
   * @returns Lista de entidades
   */
  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    filters?: Record<string, any>;
  }): Promise<T[]> {
    try {
      const {
        limit = 100,
        offset = 0,
        orderBy = 'createdAt',
        orderDirection = 'desc',
        filters = {},
      } = options || {};

      let query: Query = this.collection;

      // Aplicar filtros
      for (const [field, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          // Suporte para operadores de comparação
          if (typeof value === 'object' && 'operator' in value && 'value' in value) {
            query = query.where(field, value.operator as WhereFilterOp, value.value);
          } else {
            query = query.where(field, '==', value);
          }
        }
      }

      // Aplicar ordenação
      query = query.orderBy(orderBy, orderDirection);

      // Aplicar paginação
      if (offset > 0) {
        // Para offset, precisamos buscar documentos para pular
        const snapshot = await query.limit(offset).get();
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];

        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
      }

      // Aplicar limite
      query = query.limit(limit);

      const snapshot = await query.get();

      logger.info(`Found ${snapshot.size} entities in ${this.collectionName}`);

      return snapshot.docs.map(doc => doc.data() as T);
    } catch (error) {
      logger.error(`Error finding entities in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza uma entidade existente
   * @param id ID da entidade
   * @param data Dados para atualização
   * @returns Entidade atualizada
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Entity with ID ${id} not found in ${this.collectionName}`);
      }

      const timestamp = Timestamp.now();
      const updateData: Record<string, any> = {
        ...(data as Record<string, any>),
        updatedAt: timestamp,
      };

      // Remover campos undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await docRef.update(updateData);

      // Buscar a entidade atualizada
      const updatedDoc = await docRef.get();
      logger.info(`Entity updated in ${this.collectionName} with ID: ${id}`);

      return updatedDoc.data() as T;
    } catch (error) {
      logger.error(`Error updating entity with ID ${id} in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Exclui uma entidade
   * @param id ID da entidade
   * @returns Verdadeiro se a exclusão foi bem-sucedida
   */
  async delete(id: string): Promise<boolean> {
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        logger.warn(`Entity with ID ${id} not found for deletion in ${this.collectionName}`);
        return false;
      }

      await docRef.delete();
      logger.info(`Entity deleted in ${this.collectionName} with ID: ${id}`);

      return true;
    } catch (error) {
      logger.error(`Error deleting entity with ID ${id} in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Conta o número total de entidades
   * @param filters Filtros opcionais
   * @returns Número de entidades
   */
  async count(filters?: Record<string, any>): Promise<number> {
    try {
      let query: Query = this.collection;

      // Aplicar filtros, se houver
      if (filters) {
        for (const [field, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object' && 'operator' in value && 'value' in value) {
              query = query.where(field, value.operator as WhereFilterOp, value.value);
            } else {
              query = query.where(field, '==', value);
            }
          }
        }
      }

      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      logger.error(`Error counting entities in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Métodos protegidos utilitários
   */

  /**
   * Executa operações em lote no Firestore
   * @param operations Lista de operações a executar em lote
   */
  protected async executeBatch(
    operations: Array<{
      type: 'create' | 'update' | 'delete';
      ref: DocumentReference;
      data?: DocumentData;
    }>,
  ): Promise<void> {
    try {
      // Dividir em lotes de 500 (limite do Firestore)
      const batchSize = 500;
      const batches = [];

      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = this.db.batch();
        const batchOperations = operations.slice(i, i + batchSize);

        for (const op of batchOperations) {
          switch (op.type) {
            case 'create':
              batch.create(op.ref, op.data || {});
              break;
            case 'update':
              batch.update(op.ref, op.data || {});
              break;
            case 'delete':
              batch.delete(op.ref);
              break;
          }
        }

        batches.push(batch.commit());
      }

      await Promise.all(batches);
      logger.info(
        `Batch operation completed with ${operations.length} operations on ${this.collectionName}`,
      );
    } catch (error) {
      logger.error(`Error executing batch operation on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Valida se um documento existe
   * @param id ID do documento a verificar
   * @returns Verdadeiro se o documento existir
   */
  protected async documentExists(id: string): Promise<boolean> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    return doc.exists;
  }
}
