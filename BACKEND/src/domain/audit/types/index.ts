import { AdminAuditLog, AdminAction } from '../../admin/types/AdminTypes';

/**
 * Opções de filtragem para consulta de logs de auditoria
 */
export interface AuditLogFilterOptions {
  /**
   * Filtrar por tipo de ação
   */
  actionType?: string;

  /**
   * Filtrar por ID do usuário que realizou a ação
   */
  userId?: string;

  /**
   * Filtrar por data inicial (a partir de)
   */
  startDate?: Date;

  /**
   * Filtrar por data final (até)
   */
  endDate?: Date;

  /**
   * Filtrar por descrição (texto parcial)
   */
  descriptionContains?: string;
}

/**
 * Opções de paginação para consulta de logs de auditoria
 */
export interface AuditLogPaginationOptions {
  /**
   * Número da página (começando em 1)
   */
  page: number;

  /**
   * Quantidade de registros por página
   */
  limit: number;

  /**
   * Campo para ordenação
   */
  sortBy?: 'createdAt' | 'action.type' | 'action.performedBy';

  /**
   * Direção da ordenação
   */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Resultado paginado de logs de auditoria
 */
export interface PaginatedAuditLogResult {
  /**
   * Logs de auditoria
   */
  logs: AdminAuditLog[];

  /**
   * Total de registros disponíveis
   */
  total: number;

  /**
   * Número da página atual
   */
  page: number;

  /**
   * Quantidade de registros por página
   */
  limit: number;

  /**
   * Indica se existem mais páginas
   */
  hasMore: boolean;
}

export { AdminAuditLog, AdminAction };
