import {
  CreatePlanPayload,
  Plan,
  PlanListOptions,
  PlanListResult,
} from '../types';

/**
 * Interface para o serviço de planos
 */
export interface IPlanService {
  /**
   * Cria um novo plano
   * @param data Dados do plano
   * @param planId ID opcional do plano (para substituição)
   * @returns Plano criado
   */
  createPlan(data: CreatePlanPayload, planId?: string): Promise<Plan>;

  /**
   * Obtém um plano pelo ID
   * @param planId ID do plano
   * @returns Plano encontrado ou null
   */
  getPlanById(planId: string): Promise<Plan | null>;

  /**
   * Lista planos ativos e públicos
   * @returns Lista de planos ativos e públicos
   */
  getActivePublicPlans(): Promise<Plan[]>;

  /**
   * Lista planos com base nos filtros
   * @param options Opções de filtro
   * @returns Resultado da listagem
   */
  listPlans(options: PlanListOptions): Promise<PlanListResult>;

  /**
   * Atualiza um plano
   * @param planId ID do plano
   * @param updates Atualizações a serem aplicadas
   * @returns Plano atualizado ou null se não encontrado
   */
  updatePlan(planId: string, updates: Partial<Plan>): Promise<Plan | null>;

  /**
   * Remove um plano
   * @param planId ID do plano
   * @returns true se removido com sucesso, false caso contrário
   */
  deletePlan(planId: string): Promise<boolean>;
}
