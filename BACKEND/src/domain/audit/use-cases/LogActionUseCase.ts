import { IAuditLogRepository } from '../repositories/AuditLogRepository';
import { AdminAction } from '../types';

/**
 * Caso de uso para registrar uma ação no log de auditoria
 */
export class LogActionUseCase {
  private auditLogRepository: IAuditLogRepository;

  constructor(auditLogRepository: IAuditLogRepository) {
    this.auditLogRepository = auditLogRepository;
  }

  /**
   * Executa o caso de uso
   * @param action Ação a ser registrada
   */
  async execute(action: AdminAction): Promise<void> {
    // Validar a ação antes de registrar
    this.validateAction(action);

    // Registrar a ação
    await this.auditLogRepository.logAction(action);
  }

  /**
   * Valida os dados da ação
   * @param action Ação a ser validada
   */
  private validateAction(action: AdminAction): void {
    if (!action.type) {
      throw new Error('O tipo da ação é obrigatório');
    }

    if (!action.performedBy) {
      throw new Error('O autor da ação é obrigatório');
    }

    if (!action.timestamp) {
      throw new Error('A data da ação é obrigatória');
    }

    if (!action.description) {
      throw new Error('A descrição da ação é obrigatória');
    }
  }
}
