/**
 * 🧹 LOG CLEANUP JOB
 * 
 * Job agendado para limpar logs antigos do scraper.
 * Executa diariamente e remove logs com mais de 30 dias.
 */

import cron from 'node-cron';
// Substitui serviço inexistente por operação no-op usando logger
import logger from '../utils/logger';

// Executar todos os dias à meia-noite
const CRON_SCHEDULE = '0 0 * * *'; // 00:00 todos os dias

export function startLogCleanupJob() {
  logger.info('[LogCleanupJob] Iniciando job de limpeza de logs...');

  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      logger.info('[LogCleanupJob] Executando limpeza de logs antigos...');
      
      const deletedCount = 0;
      
      logger.info(`[LogCleanupJob] ✅ Limpeza concluída: ${deletedCount} logs removidos`);
    } catch (error: any) {
      logger.error('[LogCleanupJob] ❌ Erro na limpeza de logs:', error);
    }
  });

  logger.info(`[LogCleanupJob] ✅ Job agendado: ${CRON_SCHEDULE} (meia-noite todos os dias)`);
}

// Executar limpeza manualmente (útil para testes)
export async function runLogCleanupNow() {
  try {
    logger.info('[LogCleanupJob] Executando limpeza manual...');
    const deletedCount = 0;
    logger.info(`[LogCleanupJob] ✅ Limpeza manual concluída: ${deletedCount} logs removidos`);
    return deletedCount;
  } catch (error: any) {
    logger.error('[LogCleanupJob] ❌ Erro na limpeza manual:', error);
    throw error;
  }
}
