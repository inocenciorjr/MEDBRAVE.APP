import { ICacheService } from './cache/interfaces/ICacheService';
import { FirebaseCacheService } from './cache/firebase/FirebaseCacheService';
import logger from '../utils/logger';

// Add the missing NodeJS namespace
declare global {
  namespace NodeJS {
    interface Timeout {}
  }
}

// Singleton para gerenciar serviços de infraestrutura
class InfrastructureFactory {
  private static instance: InfrastructureFactory;
  private cacheServices: Map<string, ICacheService>;

  private constructor() {
    this.cacheServices = new Map<string, ICacheService>();
    logger.info('Infrastructure factory initialized');
  }

  public static getInstance(): InfrastructureFactory {
    if (!InfrastructureFactory.instance) {
      InfrastructureFactory.instance = new InfrastructureFactory();
    }
    return InfrastructureFactory.instance;
  }

  /**
   * Obtém ou cria uma instância do serviço de cache para uma coleção específica
   * @param collectionName Nome da coleção para o cache (opcional)
   * @returns Instância do serviço de cache
   */
  public getCacheService(collectionName: string = 'cache'): ICacheService {
    if (!this.cacheServices.has(collectionName)) {
      logger.info(`Creating new cache service for collection: ${collectionName}`);
      this.cacheServices.set(collectionName, new FirebaseCacheService(collectionName));
    }
    return this.cacheServices.get(collectionName)!;
  }

  /**
   * Configura um serviço de limpeza periódica de cache expirado
   * @param intervalMinutes Intervalo em minutos para limpeza (padrão: 60 = 1 hora)
   * @returns Identificador do intervalo para possível cancelamento
   */
  public setupCacheCleanupJob(intervalMinutes: number = 60): NodeJS.Timeout {
    const intervalMs = intervalMinutes * 60 * 1000;

    logger.info(`Setting up cache cleanup job to run every ${intervalMinutes} minutes`);

    // Executar imediatamente uma vez
    this.cleanupExpiredCache();

    // Configurar o intervalo para execuções periódicas
    return setInterval(() => {
      this.cleanupExpiredCache();
    }, intervalMs);
  }

  /**
   * Limpa o cache expirado em todas as coleções de cache
   */
  private async cleanupExpiredCache(): Promise<void> {
    try {
      logger.info('Running cache cleanup job...');

      const cleanupPromises = Array.from(this.cacheServices.entries()).map(
        async ([collection, service]) => {
          try {
            const count = await service.cleanupExpired();
            logger.info(`Cleaned up ${count} expired cache entries from collection ${collection}`);
            return count;
          } catch (error) {
            logger.error(`Error cleaning up cache in collection ${collection}:`, error);
            return 0;
          }
        },
      );

      const results = await Promise.all(cleanupPromises);
      const totalCleaned = results.reduce((total, count) => total + count, 0);

      logger.info(`Cache cleanup completed. Total entries cleaned: ${totalCleaned}`);
    } catch (error) {
      logger.error('Error in cache cleanup job:', error);
    }
  }
}

// Instância singleton
const infraFactory = InfrastructureFactory.getInstance();

// Exporta funções de fábrica
export function getCacheService(collectionName?: string): ICacheService {
  return infraFactory.getCacheService(collectionName);
}

export function setupCacheCleanupJob(intervalMinutes?: number): NodeJS.Timeout {
  return infraFactory.setupCacheCleanupJob(intervalMinutes);
}

export default infraFactory;
