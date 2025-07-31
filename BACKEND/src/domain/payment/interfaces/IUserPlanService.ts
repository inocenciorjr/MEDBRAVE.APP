import {
  CreateUserPlanPayload,
  UserPlan,
  UserPlanListOptions,
  UserPlanListResult,
  UserPlanStatus,
  ExpiredPlansCheckResult,
  PaymentMethod,
} from '../types';

/**
 * Interface para o serviço de planos de usuário
 */
export interface IUserPlanService {
  /**
   * Cria um novo plano de usuário
   * @param data Dados do plano de usuário
   * @returns Plano de usuário criado
   */
  createUserPlan(data: CreateUserPlanPayload): Promise<UserPlan>;

  /**
   * Obtém um plano de usuário pelo ID
   * @param userPlanId ID do plano de usuário
   * @returns Plano de usuário encontrado ou null
   */
  getUserPlanById(userPlanId: string): Promise<UserPlan | null>;

  /**
   * Lista planos de um usuário
   * @param userId ID do usuário
   * @returns Lista de planos do usuário
   */
  getUserPlansByUserId(userId: string): Promise<UserPlan[]>;

  /**
   * Lista planos ativos de um usuário
   * @param userId ID do usuário
   * @returns Lista de planos ativos do usuário
   */
  getUserActivePlans(userId: string): Promise<UserPlan[]>;

  /**
   * Lista planos com base nos filtros
   * @param options Opções de filtro
   * @returns Resultado da listagem
   */
  listUserPlans(options: UserPlanListOptions): Promise<UserPlanListResult>;

  /**
   * Cancela um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param reason Motivo do cancelamento
   * @returns Plano de usuário atualizado
   */
  cancelUserPlan(userPlanId: string, reason?: string): Promise<UserPlan>;

  /**
   * Renova um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param durationDays Duração em dias da renovação
   * @param paymentId ID do pagamento associado à renovação (opcional)
   * @param paymentMethod Método de pagamento da renovação (opcional)
   * @returns Plano de usuário atualizado
   */
  renewUserPlan(
    userPlanId: string,
    durationDays: number,
    paymentId?: string,
    paymentMethod?: PaymentMethod,
  ): Promise<UserPlan>;

  /**
   * Atualiza o status de um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param status Novo status
   * @param reason Motivo da alteração
   * @returns Plano de usuário atualizado
   */
  updateUserPlanStatus(
    userPlanId: string,
    status: UserPlanStatus,
    reason?: string,
  ): Promise<UserPlan>;

  /**
   * Atualiza os metadados de um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param metadata Novos metadados
   * @returns Plano de usuário atualizado
   */
  updateUserPlanMetadata(userPlanId: string, metadata: Record<string, any>): Promise<UserPlan>;

  /**
   * Verifica e atualiza o status de planos expirados
   * @returns Resultado da verificação
   */
  checkAndExpireUserPlans(): Promise<ExpiredPlansCheckResult>;

  /**
   * Verifica se um usuário possui um plano ativo
   * @param userId ID do usuário
   * @returns true se o usuário possui um plano ativo, false caso contrário
   */
  userHasActivePlan(userId: string): Promise<boolean>;
}
