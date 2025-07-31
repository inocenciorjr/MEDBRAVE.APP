import { IAuditLogRepository } from '../repositories/AuditLogRepository';
import {
  AuditLogFilterOptions,
  AuditLogPaginationOptions,
  PaginatedAuditLogResult,
} from '../types';

/**
 * Caso de uso para obter logs de auditoria
 */
export class GetAuditLogsUseCase {
  private auditLogRepository: IAuditLogRepository;

  constructor(auditLogRepository: IAuditLogRepository) {
    this.auditLogRepository = auditLogRepository;
  }

  /**
   * Executa o caso de uso para obter logs de auditoria com filtros e paginação
   * @param filter Opções de filtragem
   * @param pagination Opções de paginação
   * @returns Resultado paginado dos logs de auditoria
   */
  async execute(
    filter?: AuditLogFilterOptions,
    pagination?: AuditLogPaginationOptions,
  ): Promise<PaginatedAuditLogResult> {
    return await this.auditLogRepository.getAll(filter, pagination);
  }

  /**
   * Obtém logs de auditoria por ID de usuário
   * @param userId ID do usuário
   * @returns Lista de logs de auditoria
   */
  async getByUserId(userId: string): Promise<PaginatedAuditLogResult> {
    const filter: AuditLogFilterOptions = {
      userId,
    };

    return await this.auditLogRepository.getAll(filter);
  }

  /**
   * Obtém logs de auditoria por tipo de ação
   * @param actionType Tipo de ação
   * @returns Lista de logs de auditoria
   */
  async getByActionType(actionType: string): Promise<PaginatedAuditLogResult> {
    const filter: AuditLogFilterOptions = {
      actionType,
    };

    return await this.auditLogRepository.getAll(filter);
  }
}
