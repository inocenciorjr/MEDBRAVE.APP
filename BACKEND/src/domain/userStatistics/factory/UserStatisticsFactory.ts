import { UserStatisticsService } from '../../../infra/userStatistics/UserStatisticsService';
import { IUserStatisticsService } from '../interfaces/IUserStatisticsService';
import { supabase } from '../../../config/supabaseAdmin';

/**
 * Factory para criar instância do serviço de estatísticas de usuário
 */
export function createUserStatisticsFactory(): IUserStatisticsService {
  return new UserStatisticsService(supabase);
}
