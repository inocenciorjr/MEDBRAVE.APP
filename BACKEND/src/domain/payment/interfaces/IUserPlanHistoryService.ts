/**
 * Interface para serviço de histórico de mudanças de status de planos
 */
export interface UserPlanStatusHistory {
  id: string;
  userPlanId: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
  changedBy?: string;
  changedAt: Date;
  metadata?: Record<string, any>;
}

export interface IUserPlanHistoryService {
  /**
   * Registra uma mudança de status
   */
  recordStatusChange(
    userPlanId: string,
    previousStatus: string,
    newStatus: string,
    reason?: string,
    changedBy?: string,
    metadata?: Record<string, any>,
  ): Promise<UserPlanStatusHistory>;

  /**
   * Obtém histórico de um plano de usuário
   */
  getHistory(userPlanId: string): Promise<UserPlanStatusHistory[]>;

  /**
   * Obtém histórico de todos os planos de um usuário
   */
  getUserHistory(userId: string): Promise<UserPlanStatusHistory[]>;
}
