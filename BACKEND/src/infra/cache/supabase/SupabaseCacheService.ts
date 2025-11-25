import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../../config/supabase';
import { ICacheService } from '../interfaces/ICacheService';
import logger from '../../../utils/logger';

/**
 * Interface para entrada de cache no Supabase
 */
export interface SupabaseCacheEntry {
  id: string;
  key: string;
  value: any;
  ttl: number; // Tempo de vida em segundos
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Implementação do serviço de cache usando Supabase
 */
export class SupabaseCacheService implements ICacheService {
  private client: SupabaseClient;
  private tableName: string;

  /**
   * @param tableName Nome da tabela para armazenar o cache (padrão: 'cache')
   */
  constructor(tableName: string = 'cache', client: SupabaseClient = supabase) {
    this.client = client;
    this.tableName = tableName;
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

      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl * 1000);

      if (existingEntry) {
        // Atualizar entrada existente
        const { error } = await this.client
          .from(this.tableName)
          .update({
            value,
            ttl,
            expires_at: expiresAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', existingEntry.id);

        if (error) {
          logger.error(
            'SupabaseCacheService',
            'set',
            `Erro ao atualizar cache para chave ${key}:`,
            error,
          );
          throw error;
        }
      } else {
        // Criar nova entrada
        const newEntry: Omit<SupabaseCacheEntry, 'id'> = {
          key,
          value,
          ttl,
          expires_at: expiresAt.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };

        const { error } = await this.client
          .from(this.tableName)
          .insert(newEntry);

        if (error) {
          logger.error(
            'SupabaseCacheService',
            'set',
            `Erro ao criar cache para chave ${key}:`,
            error,
          );
          throw error;
        }
      }


    } catch (error) {
      logger.error(
        'SupabaseCacheService',
        'set',
        'Erro inesperado ao definir cache:',
        error,
      );
      throw error;
    }
  }

  /**
   * Obtém um valor do cache
   * @param key Chave do valor
   * @returns Valor ou null se não encontrado/expirado
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = await this.getEntryByKey(key);

      if (!entry) {
        return null;
      }

      // Verificar se expirou
      const now = new Date();
      const expiresAt = new Date(entry.expires_at);

      if (now > expiresAt) {
        logger.debug(
          'SupabaseCacheService',
          'get',
          `Cache expirado para chave: ${key}`,
        );
        // Remover entrada expirada
        await this.delete(key);
        return null;
      }

      return entry.value as T;
    } catch (error) {
      logger.error(
        'SupabaseCacheService',
        'get',
        'Erro ao obter cache:',
        error,
      );
      return null;
    }
  }

  /**
   * Remove um valor do cache
   * @param key Chave do valor
   */
  async delete(key: string): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('key', key);

      if (error) {
        logger.error(
          'SupabaseCacheService',
          'delete',
          `Erro ao deletar cache para chave ${key}:`,
          error,
        );
        throw error;
      }


    } catch (error) {
      logger.error(
        'SupabaseCacheService',
        'delete',
        'Erro inesperado ao deletar cache:',
        error,
      );
      throw error;
    }
  }

  /**
   * Verifica se uma chave existe no cache
   * @param key Chave a verificar
   * @returns true se existe e não expirou
   */
  async has(key: string): Promise<boolean> {
    try {
      const entry = await this.getEntryByKey(key);

      if (!entry) {
        return false;
      }

      // Verificar se expirou
      const now = new Date();
      const expiresAt = new Date(entry.expires_at);

      if (now > expiresAt) {
        // Remover entrada expirada
        await this.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(
        'SupabaseCacheService',
        'has',
        'Erro ao verificar cache:',
        error,
      );
      return false;
    }
  }

  /**
   * Remove entradas expiradas do cache
   * @returns Número de entradas removidas
   */
  async cleanupExpired(): Promise<number> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.client
        .from(this.tableName)
        .delete()
        .lt('expires_at', now)
        .select('id');

      if (error) {
        logger.error(
          'SupabaseCacheService',
          'cleanupExpired',
          'Erro ao limpar cache expirado:',
          error,
        );
        throw error;
      }

      const deletedCount = data?.length || 0;
      logger.info(
        'SupabaseCacheService',
        'cleanupExpired',
        `${deletedCount} entradas expiradas removidas`,
      );

      return deletedCount;
    } catch (error) {
      logger.error(
        'SupabaseCacheService',
        'cleanupExpired',
        'Erro inesperado ao limpar cache:',
        error,
      );
      throw error;
    }
  }

  /**
   * Remove todas as entradas do cache
   * @returns Número de entradas removidas
   */
  async clear(): Promise<number> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
        .select('id');

      if (error) {
        logger.error(
          'SupabaseCacheService',
          'clear',
          'Erro ao limpar todo o cache:',
          error,
        );
        throw error;
      }

      const deletedCount = data?.length || 0;
      logger.info(
        'SupabaseCacheService',
        'clear',
        `${deletedCount} entradas removidas do cache`,
      );

      return deletedCount;
    } catch (error) {
      logger.error(
        'SupabaseCacheService',
        'clear',
        'Erro inesperado ao limpar cache:',
        error,
      );
      throw error;
    }
  }

  /**
   * Obtém ou define um valor no cache usando uma função
   * @param key Chave do valor
   * @param fn Função para obter o valor se não estiver no cache
   * @param ttl Tempo de vida em segundos
   * @returns Valor do cache ou resultado da função
   */
  async remember<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 3600,
  ): Promise<T> {
    try {
      // Tentar obter do cache primeiro
      const cachedValue = await this.get<T>(key);

      if (cachedValue !== null) {
        logger.debug(
          'SupabaseCacheService',
          'remember',
          `Valor encontrado no cache para chave: ${key}`,
        );
        return cachedValue;
      }

      // Se não estiver no cache, executar a função
      logger.debug(
        'SupabaseCacheService',
        'remember',
        `Executando função para chave: ${key}`,
      );
      const value = await fn();

      // Armazenar no cache
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      logger.error(
        'SupabaseCacheService',
        'remember',
        'Erro inesperado:',
        error,
      );
      throw error;
    }
  }

  /**
   * Obtém uma entrada do cache pela chave
   * @param key Chave a buscar
   * @returns Entrada do cache ou null
   */
  private async getEntryByKey(key: string): Promise<SupabaseCacheEntry | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('key', key)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        logger.error(
          'SupabaseCacheService',
          'getEntryByKey',
          'Erro ao buscar entrada:',
          error,
        );
        throw error;
      }

      return (data as SupabaseCacheEntry) || null;
    } catch (error) {
      logger.error(
        'SupabaseCacheService',
        'getEntryByKey',
        'Erro inesperado:',
        error,
      );
      return null;
    }
  }
}

// Exportar instância padrão
export const cacheService = new SupabaseCacheService();
