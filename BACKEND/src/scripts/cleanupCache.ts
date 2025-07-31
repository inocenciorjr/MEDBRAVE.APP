import { getCacheService } from '../infra/factory';
import logger from '../utils/logger';

/**
 * Script para executar a limpeza manual do cache expirado
 */
async function cleanupCache() {
  try {
    logger.info('Starting cache cleanup...');

    const cacheService = getCacheService();
    const count = await cacheService.cleanupExpired();

    logger.info(`Cache cleanup completed. ${count} expired entries removed.`);
    process.exit(0);
  } catch (error) {
    logger.error('Error cleaning up cache:', error);
    process.exit(1);
  }
}

// Executar o script
cleanupCache();
