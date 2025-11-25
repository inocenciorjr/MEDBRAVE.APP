import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabaseAdmin';
import AppError from '../../utils/AppError';

export interface BaseEntity {
  id?: string;
  created_at?: string;
  updated_at?: string;
}

export abstract class SupabaseBaseRepository<T extends BaseEntity> {
  protected client: SupabaseClient;
  protected tableName: string;

  constructor(tableName: string, client: SupabaseClient = supabase) {
    this.client = client;
    this.tableName = tableName;
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new AppError(
        `Failed to create ${this.tableName}: ${error.message}`,
        400,
      );
    }

    return result as T;
  }

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new AppError(
        `Failed to find ${this.tableName}: ${error.message}`,
        400,
      );
    }

    return data as T;
  }

  async findAll(
    filters?: Record<string, any>,
    limit?: number,
    offset?: number,
  ): Promise<T[]> {
    let query = this.client.from(this.tableName).select('*');

    // Aplicar filtros
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Aplicar paginação
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError(
        `Failed to find ${this.tableName}: ${error.message}`,
        400,
      );
    }

    return data as T[];
  }

  async update(
    id: string,
    data: Partial<Omit<T, 'id' | 'created_at'>>,
  ): Promise<T> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(
        `Failed to update ${this.tableName}: ${error.message}`,
        400,
      );
    }

    return result as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new AppError(
        `Failed to delete ${this.tableName}: ${error.message}`,
        400,
      );
    }
  }

  async count(filters?: Record<string, any>): Promise<number> {
    let query = this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    // Aplicar filtros
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { count, error } = await query;

    if (error) {
      throw new AppError(
        `Failed to count ${this.tableName}: ${error.message}`,
        400,
      );
    }

    return count || 0;
  }

  async exists(id: string): Promise<boolean> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('id')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new AppError(
        `Failed to check existence in ${this.tableName}: ${error.message}`,
        400,
      );
    }

    return !!data;
  }

  // Método para executar queries customizadas
  async executeQuery(query: string, params?: any[]): Promise<any> {
    const { data, error } = await this.client.rpc('execute_sql', {
      query,
      params: params || [],
    });

    if (error) {
      throw new AppError(`Failed to execute query: ${error.message}`, 400);
    }

    return data;
  }

  // Método para transações (usando Supabase RPC)
  async transaction<R>(
    callback: (client: SupabaseClient) => Promise<R>,
  ): Promise<R> {
    try {
      return await callback(this.client);
    } catch (error) {
      throw new AppError(`Transaction failed: ${error}`, 400);
    }
  }
}
