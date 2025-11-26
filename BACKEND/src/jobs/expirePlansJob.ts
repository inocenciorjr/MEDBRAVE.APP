import { SupabaseUserPlanService } from '../infra/payment/supabase/SupabaseUserPlanService';
import { SupabasePlanService } from '../infra/payment/supabase/SupabasePlanService';
import { supabase } from '../config';
import logger from '../utils/logger';

/**
 * Job para expirar planos de usuários vencidos
 * Deve ser executado periodicamente (ex: a cada hora via cron)
 */
export async function expirePlansJob(): Promise<void> {
  try {
    logger.info('Iniciando job de expiração de planos...');

    const planService = new SupabasePlanService(supabase);
    const userPlanService = new SupabaseUserPlanService(supabase, planService);

    const result = await userPlanService.checkAndExpireUserPlans();

    logger.info(
      `Job de expiração concluído. ${result.expiredCount} planos expirados.`,
    );

    if (result.expiredCount > 0) {
      logger.warn(
        `ATENÇÃO: ${result.expiredCount} planos foram expirados. Considere implementar notificações para os usuários.`,
      );
    }
  } catch (error) {
    logger.error(`Erro ao executar job de expiração de planos: ${error}`);
    throw error;
  }
}

// Se executado diretamente (não importado)
if (require.main === module) {
  expirePlansJob()
    .then(() => {
      logger.info('Job executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Job falhou:', error);
      process.exit(1);
    });
}
