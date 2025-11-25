import { UserStatisticsService } from '../../../infra/userStatistics/UserStatisticsService';
import { UserStatisticsController } from '../controllers/UserStatisticsController';
import { supabase } from '../../../config/supabase';

/**
 * Factory para criar o módulo de estatísticas
 * @returns Objeto com service e controller do módulo
 */
export function createStatisticsModule() {
  // Criar service com cliente Supabase
  const statisticsService = new UserStatisticsService(supabase);

  // Criar controller
  const statisticsController = new UserStatisticsController(statisticsService);

  return {
    statisticsService,
    statisticsController,
  };
}
