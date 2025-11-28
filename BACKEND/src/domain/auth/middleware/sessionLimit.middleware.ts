import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './supabaseAuth.middleware';
import { SessionService } from '../services/SessionService';
import logger from '../../../utils/logger';

const sessionService = new SessionService();
const MAX_SESSIONS = 2;

/**
 * Middleware que limita o número de sessões simultâneas por usuário
 * Deve ser usado APÓS o supabaseAuthMiddleware
 */
export const sessionLimitMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      // Se não tem usuário autenticado, deixa passar (o auth middleware já tratou)
      return next();
    }

    // Limpar sessões antigas mantendo apenas as MAX_SESSIONS mais recentes
    try {
      const revokedCount = await sessionService.cleanupOldSessions(userId, MAX_SESSIONS);
      
      if (revokedCount > 0) {
        logger.info(`[SessionLimit] ${revokedCount} sessões antigas revogadas para usuário ${userId}`);
      }
    } catch (error) {
      // Log do erro mas não bloqueia o fluxo
      logger.error('[SessionLimit] Erro ao limpar sessões antigas:', error);
    }

    next();
  } catch (error) {
    // Log do erro mas não bloqueia o fluxo
    logger.error('[SessionLimit] Erro no middleware de limite de sessões:', error);
    next();
  }
};
