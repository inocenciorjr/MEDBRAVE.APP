//
import { SupabaseClient } from '@supabase/supabase-js';
import { AdminAuditLog, AdminAction } from '../types';
import {
  AuditLogFilterOptions,
  AuditLogPaginationOptions,
  PaginatedAuditLogResult,
} from '../types';

/**
 * Interface para o repositório de logs de auditoria
 */
export interface IAuditLogRepository {
  logAction(action: AdminAction): Promise<void>;
  getById(id: string): Promise<AdminAuditLog | null>;
  getAll(
    filter?: AuditLogFilterOptions,
    pagination?: AuditLogPaginationOptions,
  ): Promise<PaginatedAuditLogResult>;
  getByUserId(userId: string): Promise<AdminAuditLog[]>;
  getByActionType(actionType: string): Promise<AdminAuditLog[]>;
}

/**
 * Implementação do repositório de logs de auditoria usando Firebase
 */
export class FirebaseAuditLogRepository implements IAuditLogRepository {
  
  constructor() {}

  /**
   * Registra uma ação no log de auditoria
   */
  async logAction(_action: AdminAction): Promise<void> {
    throw new Error('FirebaseAuditLogRepository não suportado neste ambiente');
  }

  /**
   * Busca um log de auditoria pelo ID
   */
  async getById(_id: string): Promise<AdminAuditLog | null> {
    return null;
  }

  /**
   * Retorna logs de auditoria com filtros e paginação
   */
  async getAll(
    _filter?: AuditLogFilterOptions,
    pagination: AuditLogPaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedAuditLogResult> {
    return { logs: [], total: 0, page: pagination.page, limit: pagination.limit, hasMore: false };
  }

  /**
   * Busca logs de auditoria por ID de usuário
   */
  async getByUserId(_userId: string): Promise<AdminAuditLog[]> {
    return [];
  }

  /**
   * Busca logs de auditoria por tipo de ação
   */
  async getByActionType(_actionType: string): Promise<AdminAuditLog[]> {
    return [];
  }
}

/**
 * Implementação do repositório de logs de auditoria usando Supabase
 */
export class SupabaseAuditLogRepository implements IAuditLogRepository {
  private client: SupabaseClient;
  private tableName: string = 'audit_logs';

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async logAction(action: AdminAction): Promise<void> {
    const auditLog: AdminAuditLog = {
      id: crypto.randomUUID(),
      action,
      createdAt: new Date(),
    };

    const { error } = await this.client
      .from(this.tableName)
      .insert(auditLog);

    if (error) {
      throw new Error(`Erro ao registrar ação: ${error.message}`);
    }
  }

  async getById(id: string): Promise<AdminAuditLog | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar log: ${error.message}`);
    }

    return data as AdminAuditLog;
  }

  async getAll(
    filter?: AuditLogFilterOptions,
    pagination: AuditLogPaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedAuditLogResult> {
    let query = this.client
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .order('createdAt', { ascending: false });

    // Aplicar filtros
    if (filter) {
      if (filter.actionType) {
        query = query.eq('action.type', filter.actionType);
      }

      if (filter.userId) {
        query = query.eq('action.performedBy', filter.userId);
      }

      if (filter.startDate) {
        query = query.gte('createdAt', filter.startDate.toISOString());
      }

      if (filter.endDate) {
        query = query.lte('createdAt', filter.endDate.toISOString());
      }
    }

    // Aplicar paginação
    const offset = (pagination.page - 1) * pagination.limit;
    query = query.range(offset, offset + pagination.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar logs: ${error.message}`);
    }

    const total = count || 0;
    const logs = data as AdminAuditLog[];

    return {
      logs,
      total,
      page: pagination.page,
      limit: pagination.limit,
      hasMore: offset + logs.length < total,
    };
  }

  async getByUserId(userId: string): Promise<AdminAuditLog[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('action.performedBy', userId)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar logs por usuário: ${error.message}`);
    }

    return data as AdminAuditLog[];
  }

  async getByActionType(actionType: string): Promise<AdminAuditLog[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('action.type', actionType)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar logs por tipo: ${error.message}`);
    }

    return data as AdminAuditLog[];
  }
}
