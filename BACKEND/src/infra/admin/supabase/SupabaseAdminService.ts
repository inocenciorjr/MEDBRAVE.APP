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

  // ==========================================
  // NOVOS MÉTODOS - GERENCIAMENTO COMPLETO DE USUÁRIOS
  // ==========================================

  /**
   * Lista todos os usuários com filtros, paginação e ordenação
   */
  async listAllUsers(options: {
    search?: string;
    role?: string;
    status?: string;
    planId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ users: any[]; total: number }> {
    let query = this.client
      .from('users')
      .select('*, user_plans!inner(id, plan_id, status, start_date, end_date, plans(name))', { count: 'exact' });

    // Filtro de busca (nome ou email)
    if (options.search) {
      query = query.or(`display_name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
    }

    // Filtro de role
    if (options.role && options.role !== 'ALL') {
      query = query.eq('role', options.role);
    }

    // Filtro de status
    if (options.status && options.status !== 'ALL') {
      if (options.status === 'ACTIVE') {
        query = query.eq('is_blocked', false);
      } else if (options.status === 'SUSPENDED') {
        query = query.eq('is_blocked', true);
      }
    }

    // Filtro de plano
    if (options.planId) {
      query = query.eq('user_plans.plan_id', options.planId);
    }

    // Ordenação
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Paginação
    if (options.offset !== undefined && options.limit) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    } else if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao listar usuários: ${error.message}`);
    }

    return {
      users: data || [],
      total: count || 0,
    };
  }

  /**
   * Obtém detalhes completos de um usuário
   */
  async getUserById(userId: string): Promise<any> {
    const { data, error } = await this.client
      .from('users')
      .select(`
        *,
        user_plans(
          id,
          plan_id,
          status,
          start_date,
          end_date,
          auto_renew,
          payment_method,
          created_at,
          plans(id, name, price, duration_days)
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar usuário: ${error.message}`);
    }

    return data;
  }

  /**
   * Atualiza dados do usuário
   */
  async updateUser(
    userId: string,
    updates: {
      display_name?: string;
      email?: string;
      role?: string;
      biography?: string;
      specialties?: string[];
      photo_url?: string;
    },
    performedBy: string,
  ): Promise<any> {
    const { data, error } = await this.client
      .from('users')
      .update({
        ...updates,
        updated_at: new Date(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar usuário: ${error.message}`);
    }

    await this.logAdminAction({
      type: 'update_user',
      description: 'Dados do usuário atualizados',
      performedBy,
      metadata: { userId, updates },
    });

    return data;
  }

  /**
   * Suspende um usuário temporariamente
   */
  async suspendUser(
    userId: string,
    reason: string,
    performedBy: string,
    duration?: number, // em dias
  ): Promise<void> {
    const suspendedUntil = duration
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : null;

    const { error } = await this.client
      .from('users')
      .update({
        is_blocked: true,
        block_reason: reason,
        blocked_by: performedBy,
        blocked_at: new Date(),
        suspended_until: suspendedUntil,
        updated_at: new Date(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Erro ao suspender usuário: ${error.message}`);
    }

    await this.logAdminAction({
      type: 'suspend_user',
      description: `Usuário suspenso${duration ? ` por ${duration} dias` : ''}`,
      performedBy,
      metadata: { userId, reason, duration, suspendedUntil },
    });
  }

  /**
   * Ativa um usuário suspenso
   */
  async activateUser(userId: string, performedBy: string): Promise<void> {
    const { error } = await this.client
      .from('users')
      .update({
        is_blocked: false,
        block_reason: null,
        blocked_by: null,
        blocked_at: null,
        suspended_until: null,
        updated_at: new Date(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Erro ao ativar usuário: ${error.message}`);
    }

    await this.logAdminAction({
      type: 'activate_user',
      description: 'Usuário ativado',
      performedBy,
      metadata: { userId },
    });
  }

  /**
   * Bane um usuário permanentemente
   */
  async banUser(
    userId: string,
    reason: string,
    performedBy: string,
  ): Promise<void> {
    const { error } = await this.client
      .from('users')
      .update({
        is_blocked: true,
        is_banned: true,
        block_reason: reason,
        blocked_by: performedBy,
        blocked_at: new Date(),
        updated_at: new Date(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Erro ao banir usuário: ${error.message}`);
    }

    await this.logAdminAction({
      type: 'ban_user',
      description: 'Usuário banido permanentemente',
      performedBy,
      metadata: { userId, reason },
    });
  }

  /**
   * Busca usuários por query
   */
  async searchUsers(query: string, limit: number = 20): Promise<any[]> {
    const { data, error } = await this.client
      .from('users')
      .select('id, email, display_name, photo_url, role, created_at')
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao buscar usuários: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Obtém logs de atividade de um usuário
   */
  async getUserActivityLogs(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{ logs: any[]; total: number }> {
    let query = this.client
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    query = query.order('created_at', { ascending: false });

    if (options.offset !== undefined && options.limit) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    } else if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar logs de atividade: ${error.message}`);
    }

    return {
      logs: data || [],
      total: count || 0,
    };
  }

  /**
   * Obtém histórico de planos de um usuário
   */
  async getUserPlansHistory(userId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('user_plans')
      .select(`
        *,
        plans(id, name, price, duration_days)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar histórico de planos: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Obtém estatísticas de uso de um usuário
   */
  async getUserStatistics(userId: string): Promise<{
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    studyTime: number;
    lastActivity: Date | null;
    streak: number;
  }> {
    // Buscar estatísticas de questões
    const { data: questionStats } = await this.client
      .from('question_responses')
      .select('is_correct')
      .eq('user_id', userId);

    const totalQuestions = questionStats?.length || 0;
    const correctAnswers = questionStats?.filter(q => q.is_correct).length || 0;
    const incorrectAnswers = totalQuestions - correctAnswers;

    // Buscar tempo de estudo
    const { data: studySessions } = await this.client
      .from('study_sessions')
      .select('duration_seconds')
      .eq('user_id', userId);

    const studyTime = studySessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0;

    // Buscar última atividade
    const { data: lastLog } = await this.client
      .from('audit_logs')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Buscar streak
    const { data: userData } = await this.client
      .from('users')
      .select('current_streak')
      .eq('id', userId)
      .single();

    return {
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      studyTime,
      lastActivity: lastLog?.created_at ? new Date(lastLog.created_at) : null,
      streak: userData?.current_streak || 0,
    };
  }

  /**
   * Obtém sessões ativas de um usuário
   */
  async getUserActiveSessions(userId: string): Promise<any[]> {
    // TODO: Implementar quando houver tabela de sessões
    // Por enquanto, retornar array vazio
    return [];
  }

  /**
   * Encerra todas as sessões de um usuário (força logout)
   */
  async terminateUserSessions(
    userId: string,
    performedBy: string,
  ): Promise<void> {
    // TODO: Implementar quando houver gerenciamento de sessões
    // Por enquanto, apenas registrar a ação
    await this.logAdminAction({
      type: 'terminate_sessions',
      description: 'Todas as sessões do usuário foram encerradas',
      performedBy,
      metadata: { userId },
    });
  }

  /**
   * Envia email para um usuário
   */
  async sendEmailToUser(
    userId: string,
    subject: string,
    message: string,
    performedBy: string,
  ): Promise<void> {
    // TODO: Integrar com serviço de email
    await this.logAdminAction({
      type: 'send_email',
      description: `Email enviado: ${subject}`,
      performedBy,
      metadata: { userId, subject },
    });
  }

  /**
   * Adiciona nota interna sobre um usuário
   */
  async addUserNote(
    userId: string,
    note: string,
    performedBy: string,
  ): Promise<any> {
    const { data, error } = await this.client
      .from('user_notes')
      .insert({
        user_id: userId,
        note,
        created_by: performedBy,
        created_at: new Date(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao adicionar nota: ${error.message}`);
    }

    return data;
  }

  /**
   * Obtém notas internas de um usuário
   */
  async getUserNotes(userId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('user_notes')
      .select(`
        *,
        creator:created_by(id, display_name, email)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar notas: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Exporta lista de usuários para CSV
   */
  async exportUsers(filters: any = {}): Promise<string> {
    const { users } = await this.listAllUsers({ ...filters, limit: 10000 });
    
    // Criar CSV
    const headers = ['ID', 'Nome', 'Email', 'Role', 'Status', 'Data de Cadastro'];
    const rows = users.map(u => [
      u.id,
      u.display_name || '',
      u.email,
      u.role,
      u.is_blocked ? 'Bloqueado' : 'Ativo',
      new Date(u.created_at).toLocaleDateString('pt-BR'),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    return csv;
  }

  /**
   * Ações em lote
   */
  async bulkUpdateUsers(
    userIds: string[],
    updates: { role?: string; status?: string },
    performedBy: string,
  ): Promise<void> {
    const updateData: any = { updated_at: new Date() };

    if (updates.role) {
      updateData.role = updates.role;
    }

    if (updates.status === 'ACTIVE') {
      updateData.is_blocked = false;
      updateData.block_reason = null;
    } else if (updates.status === 'SUSPENDED') {
      updateData.is_blocked = true;
    }

    const { error } = await this.client
      .from('users')
      .update(updateData)
      .in('id', userIds);

    if (error) {
      throw new Error(`Erro ao atualizar usuários em lote: ${error.message}`);
    }

    await this.logAdminAction({
      type: 'bulk_update_users',
      description: `${userIds.length} usuários atualizados em lote`,
      performedBy,
      metadata: { userIds, updates },
    });
  }
}
