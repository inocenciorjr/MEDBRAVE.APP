import { FirebaseUserStatisticsService } from '../services/FirebaseUserStatisticsService';
import { IUserStatisticsService } from '../interfaces/IUserStatisticsService';
import { firestore } from '../../../config/firebaseAdmin';

/**
 * Factory para criar instância do serviço de estatísticas de usuário
 */
export function createUserStatisticsFactory(): IUserStatisticsService {
  return new FirebaseUserStatisticsService(firestore);
} 