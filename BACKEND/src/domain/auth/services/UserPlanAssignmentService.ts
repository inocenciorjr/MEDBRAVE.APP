import { SupabaseUserPlanService } from '../../../infra/payment/supabase/SupabaseUserPlanService';
import { SupabasePlanService } from '../../../infra/payment/supabase/SupabasePlanService';
import { supabase } from '../../../config/supabaseAdmin';
import { UserPlanStatus, PaymentMethod } from '../../payment/types';
import logger from '../../../utils/logger';
import { AppError, ErrorCodes } from '../../../utils/errors';

/**
 * Serviço responsável por atribuir planos padrão a novos usuários
 */
export class UserPlanAssignmentService {
  private planService: SupabasePlanService;
  private userPlanService: SupabaseUserPlanService;

  constructor() {
    this.planService = new SupabasePlanService(supabase);
    this.userPlanService = new SupabaseUserPlanService(
      supabase,
      this.planService,
    );
  }

  /**
   * Atribui plano padrão FREE a um novo usuário
   */
  async assignDefaultFreePlan(userId: string): Promise<void> {
    try {
      // Verificar se usuário já tem algum plano
      const existingPlans = await this.userPlanService.getUserPlansByUserId(
        userId,
      );

      if (existingPlans.length > 0) {
        logger.info(
          `Usuário ${userId} já possui planos, não atribuindo plano padrão`,
        );
        return;
      }

      // Buscar plano FREE padrão
      const freePlan = await this.planService.getPlanById('free-plan-default');

      if (!freePlan) {
        logger.error('Plano FREE padrão não encontrado no banco de dados');
        throw new AppError(
          500,
          'Erro ao configurar plano padrão',
          ErrorCodes.INTERNAL_SERVER_ERROR,
        );
      }

      // Calcular datas
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 ano de acesso gratuito

      // Criar plano de usuário
      await this.userPlanService.createUserPlan({
        userId,
        planId: freePlan.id,
        status: UserPlanStatus.ACTIVE,
        startDate,
        endDate,
        paymentMethod: PaymentMethod.FREE,
        autoRenew: false,
        metadata: {
          assignedAutomatically: true,
          assignedAt: new Date().toISOString(),
          source: 'registration',
        },
      });

      logger.info(
        `Plano FREE padrão atribuído com sucesso ao usuário ${userId}`,
      );
    } catch (error) {
      logger.error(
        `Erro ao atribuir plano padrão ao usuário ${userId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Atribui plano TRIAL de 7 dias a um usuário
   */
  async assignTrialPlan(userId: string): Promise<void> {
    try {
      // Verificar se usuário já teve trial
      const existingPlans = await this.userPlanService.getUserPlansByUserId(
        userId,
      );

      const hadTrial = existingPlans.some(
        (plan) => plan.metadata?.planType === 'trial',
      );

      if (hadTrial) {
        logger.info(
          `Usuário ${userId} já teve trial, não atribuindo novamente`,
        );
        return;
      }

      // Buscar plano TRIAL
      const trialPlan = await this.planService.getPlanById('trial-plan-7days');

      if (!trialPlan) {
        logger.error('Plano TRIAL não encontrado no banco de dados');
        throw new AppError(
          500,
          'Erro ao configurar plano trial',
          ErrorCodes.INTERNAL_SERVER_ERROR,
        );
      }

      // Calcular datas
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7); // 7 dias

      // Criar plano de usuário
      await this.userPlanService.createUserPlan({
        userId,
        planId: trialPlan.id,
        status: UserPlanStatus.TRIAL,
        startDate,
        endDate,
        paymentMethod: PaymentMethod.FREE,
        autoRenew: false,
        trialEndsAt: endDate,
        metadata: {
          planType: 'trial',
          assignedAutomatically: true,
          assignedAt: new Date().toISOString(),
          source: 'trial_activation',
        },
      });

      logger.info(
        `Plano TRIAL de 7 dias atribuído com sucesso ao usuário ${userId}`,
      );
    } catch (error) {
      logger.error(
        `Erro ao atribuir plano trial ao usuário ${userId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Migra usuário do plano FREE para TRIAL (se elegível)
   */
  async upgradeToTrial(userId: string): Promise<boolean> {
    try {
      const activePlans = await this.userPlanService.getUserActivePlans(userId);

      if (activePlans.length === 0) {
        return false;
      }

      const freePlan = activePlans.find(
        (plan) => plan.planId === 'free-plan-default',
      );

      if (!freePlan) {
        return false;
      }

      // Cancelar plano FREE
      await this.userPlanService.updateUserPlanStatus(
        freePlan.id,
        UserPlanStatus.CANCELLED,
        'Upgrade para trial',
      );

      // Atribuir plano TRIAL
      await this.assignTrialPlan(userId);

      return true;
    } catch (error) {
      logger.error(
        `Erro ao fazer upgrade para trial do usuário ${userId}: ${error}`,
      );
      return false;
    }
  }
}

// Singleton instance
export const userPlanAssignmentService = new UserPlanAssignmentService();
