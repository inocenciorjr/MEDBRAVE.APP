import { supabase } from '../../../config/supabaseAdmin';
import { SupabaseUserPlanService } from '../../../infra/payment/supabase/SupabaseUserPlanService';
import { SupabasePlanService } from '../../../infra/payment/supabase/SupabasePlanService';
import { UserPlanStatus } from '../types';
import logger from '../../../utils/logger';

/**
 * Job que expira planos vencidos automaticamente
 * Deve ser executado periodicamente (ex: a cada hora)
 */
export class ExpirePlansJob {
  private userPlanService: SupabaseUserPlanService;

  constructor() {
    const planService = new SupabasePlanService(supabase);
    this.userPlanService = new SupabaseUserPlanService(supabase, planService);
  }

  /**
   * Executa o job de expiração de planos
   */
  async execute(): Promise<void> {
    try {
      logger.info('[ExpirePlansJob] Iniciando verificação de planos expirados...');

      const now = new Date();

      // Buscar todos os planos ativos ou em trial que já expiraram
      const { data: expiredPlans, error } = await supabase
        .from('user_plans')
        .select('*')
        .in('status', [UserPlanStatus.ACTIVE, UserPlanStatus.TRIAL])
        .lt('end_date', now.toISOString());

      if (error) {
        logger.error('[ExpirePlansJob] Erro ao buscar planos expirados:', error);
        throw error;
      }

      if (!expiredPlans || expiredPlans.length === 0) {
        logger.info('[ExpirePlansJob] Nenhum plano expirado encontrado');
        return;
      }

      logger.info(`[ExpirePlansJob] Encontrados ${expiredPlans.length} planos expirados`);

      // Expirar cada plano
      let successCount = 0;
      let errorCount = 0;

      for (const plan of expiredPlans) {
        try {
          await this.userPlanService.updateUserPlanStatus(
            plan.id,
            UserPlanStatus.EXPIRED,
            'Plano expirado automaticamente pelo sistema'
          );

          logger.info(
            `[ExpirePlansJob] Plano ${plan.id} do usuário ${plan.user_id} expirado com sucesso`
          );
          successCount++;
        } catch (err) {
          logger.error(
            `[ExpirePlansJob] Erro ao expirar plano ${plan.id}:`,
            err
          );
          errorCount++;
        }
      }

      logger.info(
        `[ExpirePlansJob] Finalizado. Sucesso: ${successCount}, Erros: ${errorCount}`
      );
    } catch (error) {
      logger.error('[ExpirePlansJob] Erro ao executar job:', error);
      throw error;
    }
  }
}

// Singleton instance
export const expirePlansJob = new ExpirePlansJob();
