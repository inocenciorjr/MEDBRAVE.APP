import { firestore } from '../../../config/firebaseAdmin';
import { Timestamp, CollectionReference, DocumentData } from 'firebase-admin/firestore';
import { ICacheService } from '../interfaces/ICacheService';
import logger from '../../../utils/logger';

/**
 * Interface para entrada de cache no Firestore
 */
export interface FirebaseCacheEntry {
  id: string;
  key: string;
  value: any;
  ttl: number; // Tempo de vida em segundos
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Implementação do serviço de cache usando Firebase Firestore
 */
export class FirebaseCacheService implements ICacheService {
  private collection: CollectionReference;

  /**
   * @param collectionName Nome da coleção para armazenar o cache (padrão: 'cache')
   */
  constructor(collectionName: string = 'cache') {
    this.collection = firestore.collection(collectionName);
  }

  /**
   * Define um valor no cache
   * @param key Chave do valor
   * @param value Valor a armazenar
   * @param ttl Tempo de vida em segundos (padrão: 3600 = 1 hora)
   */
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    try {
      // Verificar se já existe uma entrada com a mesma chave
      const existingEntry = await this.getEntryByKey(key);

      const now = Timestamp.now();
      const expiresAt = Timestamp.fromDate(new Date(now.toMillis() + ttl * 1000));

      if (existingEntry) {
        // Atualizar entrada existente
        const entryRef = this.collection.doc(existingEntry.id);

        const updateData: DocumentData = {
          value,
          ttl,
          expiresAt,
          updatedAt: now,
        };

        await entryRef.update(updateData);
        logger.debug(`Cache entry (Key: ${key}) updated successfully.`);
      } else {
        // Criar nova entrada
        const entryRef = this.collection.doc();

        const newEntry: FirebaseCacheEntry = {
          id: entryRef.id,
          key,
          value,
          ttl,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        };

        await entryRef.set(newEntry);
        logger.debug(`Cache entry (Key: ${key}) created successfully.`);
      }
    } catch (error) {
      logger.error(`Error setting cache value (Key: ${key}):`, error);
      throw error;
    }
  }

  /**
   * Obtém um valor do cache
   * @param key Chave do valor
   * @returns Valor armazenado ou null se não existir ou estiver expirado
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = await this.getEntryByKey(key);

      if (!entry) {
        logger.debug(`Cache miss (Key: ${key})`);
        return null;
      }

      // Verificar se a entrada expirou
      const now = Timestamp.now();
      if (entry.expiresAt.toMillis() < now.toMillis()) {
        logger.debug(`Cache expired (Key: ${key})`);

        // Excluir a entrada expirada em background
        this.delete(key).catch(error => {
          logger.error(`Error deleting expired cache entry (Key: ${key}):`, error);
        });

        return null;
      }

      logger.debug(`Cache hit (Key: ${key})`);
      return entry.value as T;
    } catch (error) {
      logger.error(`Error getting cache value (Key: ${key}):`, error);
      return null;
    }
  }

  /**
   * Remove um valor do cache
   * @param key Chave do valor
   */
  async delete(key: string): Promise<void> {
    try {
      const entry = await this.getEntryByKey(key);

      if (entry) {
        await this.collection.doc(entry.id).delete();
        logger.debug(`Cache entry (Key: ${key}) deleted successfully.`);
      } else {
        logger.debug(`Cache entry (Key: ${key}) not found for deletion.`);
      }
    } catch (error) {
      logger.error(`Error deleting cache entry (Key: ${key}):`, error);
      throw error;
    }
  }

  /**
   * Verifica se uma chave existe no cache e não está expirada
   * @param key Chave a verificar
   * @returns Verdadeiro se a chave existir e não estiver expirada
   */
  async has(key: string): Promise<boolean> {
    try {
      const entry = await this.getEntryByKey(key);

      if (!entry) {
        return false;
      }

      // Verificar se a entrada expirou
      const now = Timestamp.now();
      return entry.expiresAt.toMillis() >= now.toMillis();
    } catch (error) {
      logger.error(`Error checking cache key (Key: ${key}):`, error);
      return false;
    }
  }

  /**
   * Limpa todas as entradas de cache expiradas
   * @returns Número de entradas limpas
   */
  async cleanupExpired(): Promise<number> {
    try {
      const now = Timestamp.now();

      const snapshot = await this.collection.where('expiresAt', '<', now).get();

      if (snapshot.empty) {
        logger.debug('No expired cache entries found.');
        return 0;
      }

      const batch = firestore.batch();

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`${snapshot.size} expired cache entries deleted.`);

      return snapshot.size;
    } catch (error) {
      logger.error('Error cleaning up expired cache entries:', error);
      throw error;
    }
  }

  /**
   * Limpa todo o cache
   * @returns Número de entradas limpas
   */
  async clear(): Promise<number> {
    try {
      const snapshot = await this.collection.get();

      if (snapshot.empty) {
        logger.debug('Cache is already empty.');
        return 0;
      }

      // Excluir em lotes de 500 (limite do Firestore)
      const batchSize = 500;
      const totalEntries = snapshot.size;
      let processedEntries = 0;

      while (processedEntries < totalEntries) {
        const batch = firestore.batch();
        const currentBatch = snapshot.docs.slice(processedEntries, processedEntries + batchSize);

        currentBatch.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        processedEntries += currentBatch.length;
      }

      logger.info(`${totalEntries} cache entries cleared.`);
      return totalEntries;
    } catch (error) {
      logger.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Função utilitária que envolve outra função com cache
   * @param key Chave para o cache
   * @param fn Função a ser executada se o valor não estiver em cache
   * @param ttl Tempo de vida em segundos
   * @returns Resultado da função ou valor em cache
   */
  async remember<T>(key: string, fn: () => Promise<T>, ttl: number = 3600): Promise<T> {
    try {
      // Tentar obter do cache
      const cachedValue = await this.get<T>(key);

      if (cachedValue !== null) {
        logger.debug(`Retrieved value from cache (Key: ${key}).`);
        return cachedValue;
      }

      // Executar a função
      logger.debug(`Value not found in cache (Key: ${key}). Executing function.`);
      const result = await fn();

      // Armazenar no cache
      await this.set(key, result, ttl);

      return result;
    } catch (error) {
      logger.error(`Error in cache remember function (Key: ${key}):`, error);
      throw error;
    }
  }

  /**
   * Método privado para buscar uma entrada de cache pela chave
   * @param key Chave a buscar
   * @returns Entrada de cache ou null
   */
  private async getEntryByKey(key: string): Promise<FirebaseCacheEntry | null> {
    try {
      const snapshot = await this.collection.where('key', '==', key).limit(1).get();

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as FirebaseCacheEntry;
    } catch (error) {
      logger.error(`Error retrieving cache entry by key '${key}':`, error);
      throw error;
    }
  }
}
