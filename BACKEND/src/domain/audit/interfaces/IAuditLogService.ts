import { AdminAuditLog, AdminAction } from '../../admin/types/AdminTypes';

/**
 * Interface para o serviço de log de auditoria
 */
export interface IAuditLogService {
  /**
   * Registra uma ação de administrador no log de auditoria
   * @param action Ação realizada pelo administrador
   * @returns Promise<void>
   */
  logAction(action: AdminAction): Promise<void>;

  /**
   * Obtém logs de auditoria dentro de um período
   * @param startDate Data inicial (opcional)
   * @param endDate Data final (opcional)
   * @returns Promise<AdminAuditLog[]>
   */
  getAuditLogs(startDate?: Date, endDate?: Date): Promise<AdminAuditLog[]>;

  /**
   * Obtém ações realizadas por um usuário específico
   * @param userId ID do usuário
   * @returns Promise<AdminAuditLog[]>
   */
  getActionsByUser(userId: string): Promise<AdminAuditLog[]>;

  /**
   * Obtém ações específicas de um tipo
   * @param actionType Tipo de ação
   * @returns Promise<AdminAuditLog[]>
   */
  getActionsByType(actionType: string): Promise<AdminAuditLog[]>;

  /**
   * Obtém logs de auditoria com paginação
   * @param page Número da página
   * @param limit Limite de resultados por página
   * @returns Promise<{logs: AdminAuditLog[], total: number}>
   */
  getPaginatedAuditLogs(
    page: number,
    limit: number,
  ): Promise<{
    logs: AdminAuditLog[];
    total: number;
    hasMore: boolean;
  }>;
}
