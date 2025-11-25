import { SupabaseClient } from '@supabase/supabase-js';
import { AdminUser, AdminAction } from '../../../domain/admin/types/AdminTypes';
import {
  validateAdminUser,
  validateAdminAction,
} from '../../../domain/admin/validators/adminValidators';
import supabase from '../../../config/supabaseAdmin';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseAdminService {
  private static instance: SupabaseAdminService;
  private client: SupabaseClient;

  private constructor() {
    this.client = supabase;
  }

  public static getInstance(): SupabaseAdminService {
    if (!SupabaseAdminService.instance) {
      SupabaseAdminService.instance = new SupabaseAdminService();
    }
    return SupabaseAdminService.instance;
  }

  async createAdmin(
    adminData: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<AdminUser> {
    const now = new Date();
    const newAdmin: AdminUser = {
      ...adminData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    validateAdminUser(newAdmin);

    const { data, error } = await this.client
      .from('admins')
      .insert([newAdmin])
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar admin: ${error.message}`);
    }

    return data;
  }

  async logAdminAction(action: Omit<AdminAction, 'timestamp'>): Promise<void> {
    const actionWithTimestamp: AdminAction = {
      ...action,
      timestamp: new Date(),
    };

    validateAdminAction(actionWithTimestamp);

    const { error } = await this.client
      .from('admin_actions')
      .insert([actionWithTimestamp]);

    if (error) {
      throw new Error(`Erro ao registrar ação do admin: ${error.message}`);
    }
  }

  async getAdminById(id: string): Promise<AdminUser | null> {
    const { data, error } = await this.client
      .from('admins')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar admin: ${error.message}`);
    }

    return data;
  }

  async updateAdminPermissions(
    id: string,
    permissions: string[],
  ): Promise<void> {
    const { error } = await this.client
      .from('admins')
      .update({ permissions, updated_at: new Date() })
      .eq('id', id);

    if (error) {
      throw new Error(
        `Erro ao atualizar permissões do admin: ${error.message}`,
      );
    }
  }

  async deleteAdmin(id: string): Promise<void> {
    const { error } = await this.client.from('admins').delete().eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar admin: ${error.message}`);
    }
  }

  async getTotalUsers(): Promise<number> {
    const { count, error } = await this.client
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Erro ao contar usuários: ${error.message}`);
    }

    return count || 0;
  }

  async getActiveUsers(): Promise<number> {
    try {
      // Como last_login é do tipo jsonb, vamos contar todos os usuários por enquanto
      // TODO: Ajustar quando a estrutura da coluna last_login for padronizada
      const { count, error } = await this.client
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('[AdminService] Erro ao contar usuários ativos:', error);
        throw new Error(`Erro ao contar usuários ativos: ${error.message} (code: ${error.code})`);
      }

      return count || 0;
    } catch (error: any) {
      console.error('[AdminService] Exception ao contar usuários ativos:', error);
      throw error;
    }
  }

  async getReportedContentCount(): Promise<number> {
    const { count, error } = await this.client
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Erro ao contar conteúdo reportado: ${error.message}`);
    }

    return count || 0;
  }

  async getAdminByUserId(userId: string): Promise<AdminUser | null> {
    const { data, error } = await this.client
      .from('admins')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar admin por userId: ${error.message}`);
    }

    return data;
  }

  // === MÉTODOS FALTANTES DA MIGRAÇÃO ===

  async setUserRole(
    userId: string,
    role: string,
    performedBy: string,
  ): Promise<void> {
    // Atualizar a role apenas no raw_user_meta_data usando a API Admin do Supabase
    const { error: authError } = await this.client.auth.admin.updateUserById(
      userId,
      {
        user_metadata: { role },
      },
    );

    if (authError) {
      throw new Error(`Erro ao definir papel do usuário: ${authError.message}`);
    }

    await this.logAdminAction({
      type: 'set_user_role',
      description: `Papel do usuário alterado para ${role}`,
      performedBy,
      metadata: { userId, role },
    });
  }

  async isUserRole(userId: string, role: string): Promise<boolean> {
    const { data, error } = await this.client.auth.admin.getUserById(userId);

    if (error || !data.user) {
      return false;
    }

    const userRole = data.user.user_metadata?.role || 'STUDENT';
    return userRole === role;
  }

  async blockUser(
    userId: string,
    performedBy: string,
    reason: string,
  ): Promise<void> {
    const { error } = await this.client
      .from('users')
      .update({
        isBlocked: true,
        blockReason: reason,
        blockedBy: performedBy,
        blockedAt: new Date(),
        updatedAt: new Date(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Erro ao bloquear usuário: ${error.message}`);
    }

    await this.logAdminAction({
      type: 'block_user',
      description: 'Usuário bloqueado',
      performedBy,
      metadata: { userId, reason },
    });
  }

  async unblockUser(userId: string, performedBy: string): Promise<void> {
    const { error } = await this.client
      .from('users')
      .update({
        is_blocked: false,
        block_reason: null,
        unblocked_by: performedBy,
        unblocked_at: new Date(),
        updated_at: new Date(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Erro ao desbloquear usuário: ${error.message}`);
    }

    await this.logAdminAction({
      type: 'unblock_user',
      description: 'Usuário desbloqueado',
      performedBy,
      metadata: { userId },
    });
  }

  async deleteUser(
    userId: string,
    performedBy: string,
    reason: string,
  ): Promise<void> {
    // Primeiro, salvar registro de exclusão
    const { error: deleteRecordError } = await this.client
      .from('deleted_users')
      .insert({
        id: userId,
        deleted_by: performedBy,
        deleted_at: new Date(),
        reason,
      });

    if (deleteRecordError) {
      throw new Error(
        `Erro ao registrar exclusão: ${deleteRecordError.message}`,
      );
    }

    // Depois, excluir o usuário
    const { error } = await this.client.from('users').delete().eq('id', userId);

    if (error) {
      throw new Error(`Erro ao excluir usuário: ${error.message}`);
    }

    await this.logAdminAction({
      type: 'delete_user',
      description: 'Usuário excluído',
      performedBy,
      metadata: { userId, reason },
    });
  }

  async listUsersByRole(role: string): Promise<any[]> {
    const { data, error } = await this.client.auth.admin.listUsers();

    if (error) {
      throw new Error(`Erro ao listar usuários por papel: ${error.message}`);
    }

    const users = data.users.filter((user: any) => user.user_metadata?.role === role);
    const userIds = users.map((user: any) => user.id);
    
    if (userIds.length === 0) {
      return [];
    }

    const { data: userDetails, error: userError } = await this.client
      .from('users')
      .select('*')
      .in('id', userIds);

    if (userError) {
      throw new Error(`Erro ao buscar detalhes dos usuários: ${userError.message}`);
    }

    return userDetails || [];
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalPosts: number;
    reportedContent: number;
  }> {
    const [totalUsers, activeUsers, reportedContent] = await Promise.all([
      this.getTotalUsers(),
      this.getActiveUsers(),
      this.getReportedContentCount(),
    ]);

    // TODO: Implementar contagem de posts quando necessário
    const totalPosts = 0;

    return {
      totalUsers,
      activeUsers,
      totalPosts,
      reportedContent,
    };
  }

  async getAdminActions(
    options: {
      performedBy?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
      orderBy?: 'timestamp';
      orderDirection?: 'asc' | 'desc';
    } = {},
  ): Promise<any[]> {
    let query = this.client.from('admin_actions').select('*');

    if (options.performedBy) {
      query = query.eq('performed_by', options.performedBy);
    }

    if (options.type) {
      query = query.eq('type', options.type);
    }

    if (options.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString());
    }

    query = query.order(options.orderBy || 'timestamp', {
      ascending: options.orderDirection === 'asc',
    });

    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1,
      );
    } else if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar ações administrativas: ${error.message}`);
    }

    return data || [];
  }

  async isUserAdmin(userId: string): Promise<boolean> {
    const admin = await this.getAdminByUserId(userId);
    return admin !== null;
  }

  async setUserAsAdmin(userId: string, adminId: string): Promise<void> {
    const adminData = {
      user_id: userId,
      role: 'admin' as const,
      permissions: ['read', 'write'],
      is_active: true,
      created_by: adminId,
    };

    await this.createAdmin(adminData);
  }

  async removeUserAdmin(userId: string, adminId: string): Promise<void> {
    const { error } = await this.client
      .from('admins')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao remover admin: ${error.message}`);
    }

    await this.logAdminAction({
      type: 'remove_admin',
      description: 'Admin removido',
      performedBy: adminId,
      metadata: { userId },
    });
  }

  async deleteUserByAdmin(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<void> {
    await this.deleteUser(userId, adminId, reason);
  }
}
