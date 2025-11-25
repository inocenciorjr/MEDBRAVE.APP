import { SupabaseClient } from '@supabase/supabase-js';
import { AdminAuditLog, AdminAction } from '../../../domain/admin/types/AdminTypes';
import { validateAdminAuditLog } from '../../../domain/admin/validators/adminValidators';
import { IAuditLogService } from '../../../domain/audit/interfaces/IAuditLogService';
import supabase from '../../../config/supabaseAdmin';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseAuditLogService implements IAuditLogService {
  private static instance: SupabaseAuditLogService;
  private client: SupabaseClient;

  private constructor() {
    this.client = supabase;
  }

  public static getInstance(): SupabaseAuditLogService {
    if (!SupabaseAuditLogService.instance) {
      SupabaseAuditLogService.instance = new SupabaseAuditLogService();
    }
    return SupabaseAuditLogService.instance;
  }

  async logAction(action: AdminAction): Promise<void> {
    const auditLog: AdminAuditLog = {
      id: uuidv4(),
      action,
      createdAt: new Date(),
    };

    validateAdminAuditLog(auditLog);

    const { error } = await this.client.from('audit_logs').insert([auditLog]);

    if (error) {
      throw new Error(`Erro ao registrar log de auditoria: ${error.message}`);
    }
  }

  async getAuditLogs(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AdminAuditLog[]> {
    let query = this.client
      .from('audit_logs')
      .select('*')
      .order('createdAt', { ascending: false });

    if (startDate) {
      query = query.gte('createdAt', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('createdAt', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar logs de auditoria: ${error.message}`);
    }

    return data || [];
  }

  async getActionsByUser(userId: string): Promise<AdminAuditLog[]> {
    const { data, error } = await this.client
      .from('audit_logs')
      .select('*')
      .eq('action.performedBy', userId)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar ações por usuário: ${error.message}`);
    }

    return data || [];
  }

  async getActionsByType(actionType: string): Promise<AdminAuditLog[]> {
    const { data, error } = await this.client
      .from('audit_logs')
      .select('*')
      .eq('action.type', actionType)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar ações por tipo: ${error.message}`);
    }

    return data || [];
  }

  async getPaginatedAuditLogs(
    page: number,
    limit: number,
  ): Promise<{
    logs: AdminAuditLog[];
    total: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * limit;

    // Buscar logs com paginação
    const { data: logs, error: logsError } = await this.client
      .from('audit_logs')
      .select('*')
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (logsError) {
      throw new Error(`Erro ao buscar logs paginados: ${logsError.message}`);
    }

    // Contar total de registros
    const { count, error: countError } = await this.client
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Erro ao contar logs: ${countError.message}`);
    }

    const total = count || 0;
    const hasMore = offset + limit < total;

    return {
      logs: logs || [],
      total,
      hasMore,
    };
  }
}
