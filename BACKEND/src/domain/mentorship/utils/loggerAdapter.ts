import { logger } from '../../../utils/logger';

const SERVICE_NAME = 'Mentorship';

/**
 * Logger específico para o domínio de mentoria
 */
export const mentorshipLogger = {
  info: (message: string, meta?: any) => {
    logger.info(SERVICE_NAME, 'INFO', message, undefined, meta);
  },

  error: (message: string, error?: any) => {
    logger.error(SERVICE_NAME, 'ERROR', message, undefined, error);
  },

  warn: (message: string, meta?: any) => {
    logger.warn(SERVICE_NAME, 'WARN', message, undefined, meta);
  },

  debug: (message: string, meta?: any) => {
    logger.debug(SERVICE_NAME, 'DEBUG', message, undefined, meta);
  },
};
