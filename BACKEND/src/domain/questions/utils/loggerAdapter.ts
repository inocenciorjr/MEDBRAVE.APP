import logger from '../../../utils/logger';

/**
 * Adaptador de logger específico para o domínio de questions
 * Prefixando todas as mensagens de log com "[Questions]" para facilitar a identificação
 */
export const questionsLogger = {
  debug: (message: string, meta?: any) => {
    logger.debug('[Questions] ' + message, meta);
  },
  info: (message: string, meta?: any) => {
    logger.info('[Questions] ' + message, meta);
  },
  warn: (message: string, meta?: any) => {
    logger.warn('[Questions] ' + message, meta);
  },
  error: (message: string, meta?: any) => {
    logger.error('[Questions] ' + message, meta);
  },
};
