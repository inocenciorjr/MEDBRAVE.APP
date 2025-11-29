import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../../config/supabaseAdmin';
import { AdminUser } from '../../../domain/admin/types/AdminTypes';
import { IAdminRepository } from '../../../domain/admin/repositories/AdminRepository';
import { logger } from '../../../utils/logger';
import AppError from '../../../utils/AppError';

/**
 * Implementação do repositório de administradores usando Supabase
 */
export class SupabaseAdminRepository implements IAdminRepository {
  private readonly table = 'admins';

  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Retorna todos os administradores
   */
  async getAll(): Promise<AdminUser[]> {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching all admins:', error);
        throw new AppError('Failed to fetch admins', 500);
      }

      return data.map(this.mapToAdminUser);
    } catch (error) {
      logger.error('Error in getAll:', error);
      throw error;
    }
  }

  /**
   * Busca um administrador pelo ID
   */
  async getById(id: string): Promise<AdminUser | null> {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        logger.error('Error fetching admin by ID:', error);
        throw new AppError('Failed to fetch admin', 500);
      }

      return this.mapToAdminUser(data);
    } catch (error) {
      logger.error('Error in getById:', error);
      throw error;
    }
  }

  /**
   * Cria um novo administrador
   */
  async create(
    userId: string,
    adminRole: 'admin' | 'superadmin',
    permissions: string[],
  ): Promise<string> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.client
        .from(this.table)
        .insert({
          id: userId,
          admin_role: adminRole,
          permissions,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Error creating admin:', error);
        throw new AppError('Failed to create admin', 500);
      }

      return data.id;
    } catch (error) {
      logger.error('Error in create:', error);
      throw error;
    }
  }

  /**
   * Atualiza um administrador
   */
  async update(id: string, data: Partial<AdminUser>): Promise<void> {
    try {
      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      // Remove campos que não devem ser atualizados diretamente
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      const { error } = await this.client
        .from(this.table)
        .update(updateData)
        .eq('id', id);

      if (error) {
        logger.error('Error updating admin:', error);
        throw new AppError('Failed to update admin', 500);
      }
    } catch (error) {
      logger.error('Error in update:', error);
      throw error;
    }
  }

  /**
   * Remove um administrador
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.table)
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting admin:', error);
        throw new AppError('Failed to delete admin', 500);
      }
    } catch (error) {
      logger.error('Error in delete:', error);
      throw error;
    }
  }

  /**
   * Mapeia dados do Supabase para AdminUser
   */
  private mapToAdminUser(data: any): AdminUser {
    return {
      id: data.id,
      adminRole: data.admin_role,
      permissions: data.permissions || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
