import { Response, NextFunction } from 'express';
import { supabaseAuthMiddleware, AuthenticatedRequest } from './supabaseAuth.middleware';
import { planCheckMiddleware, PlanAuthenticatedRequest } from './planCheck.middleware';
import { AppError, ErrorCodes } from '../../../utils/errors';
import logger from '../../../utils/logger';

/**
 * Middleware combinado que verifica autenticação + plano do usuário
 * Use este middleware em rotas que precisam de verificação completa
 */
export const enhancedAuthMiddleware = async (
  req: PlanAuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Primeiro, verificar autenticação
    await new Promise<void>((resolve, reject) => {
      supabaseAuthMiddleware(req as AuthenticatedRequest, res, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    // Depois, verificar plano
    await new Promise<void>((resolve, reject) => {
      planCheckMiddleware(req, res, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware que verifica se o usuário tem uma feature específica
 * @param feature Nome da feature (ex: 'canExportData')
 */
export const requireFeature = (feature: string) => {
  return async (
    req: PlanAuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.userPlan) {
        throw new AppError(
          403,
          'Plano do usuário não verificado',
          ErrorCodes.FORBIDDEN,
        );
      }

      const featureValue = (req.userPlan.limits as any)[feature];

      if (typeof featureValue === 'boolean' && !featureValue) {
        throw new AppError(
          403,
          `Seu plano (${req.userPlan.planName}) não inclui acesso a esta funcionalidade. Faça upgrade para desbloquear.`,
          ErrorCodes.SUBSCRIPTION_REQUIRED,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware que verifica limite de uso diário/mensal
 * @param limitKey Chave do limite (ex: 'maxQuestionsPerDay')
 * @param getCurrentUsage Função que retorna o uso atual
 */
export const checkLimit = (
  limitKey: string,
  getCurrentUsage: (req: PlanAuthenticatedRequest) => Promise<number>,
) => {
  return async (
    req: PlanAuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.userPlan) {
        throw new AppError(
          403,
          'Plano do usuário não verificado',
          ErrorCodes.FORBIDDEN,
        );
      }

      const limit = (req.userPlan.limits as any)[limitKey];

      // Se limite é null, significa ilimitado
      if (limit === null || limit === undefined) {
        return next();
      }

      // Se limite é número, verificar uso atual
      if (typeof limit === 'number') {
        const currentUsage = await getCurrentUsage(req);

        if (currentUsage >= limit) {
          throw new AppError(
            429,
            `Você atingiu o limite de ${limit} para esta funcionalidade. Seu plano atual: ${req.userPlan.planName}. Faça upgrade para continuar.`,
            ErrorCodes.QUOTA_EXCEEDED,
          );
        }

        // Adicionar informações de uso ao request para o controller
        (req as any).usageInfo = {
          current: currentUsage,
          limit: limit,
          remaining: limit - currentUsage,
          percentage: (currentUsage / limit) * 100,
        };
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware que adiciona informações do plano ao response header
 * Útil para o frontend saber os limites sem fazer requisição extra
 */
export const addPlanHeaders = (
  req: PlanAuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (req.userPlan) {
    res.setHeader('X-User-Plan', req.userPlan.planName);
    res.setHeader('X-Plan-Status', req.userPlan.status);
    res.setHeader('X-Plan-End-Date', req.userPlan.endDate.toISOString());
    
    // Adicionar alguns limites importantes
    const limits = req.userPlan.limits;
    if (limits.maxQuestionsPerDay !== null) {
      res.setHeader('X-Questions-Limit', limits.maxQuestionsPerDay.toString());
    }
    if (limits.maxFlashcardsCreated !== null) {
      res.setHeader('X-Flashcards-Limit', limits.maxFlashcardsCreated.toString());
    }
  }
  
  next();
};

/**
 * Middleware para rotas que podem ser acessadas sem plano (modo degradado)
 * Adiciona informações do plano se existir, mas não bloqueia se não tiver
 */
export const optionalPlanMiddleware = async (
  req: PlanAuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Primeiro, verificar autenticação
    await new Promise<void>((resolve, reject) => {
      supabaseAuthMiddleware(req as AuthenticatedRequest, res, (authError) => {
        if (authError) {
          reject(authError);
        } else {
          resolve();
        }
      });
    });

    // Tentar verificar plano, mas não falhar se não tiver
    try {
      await new Promise<void>((resolve, reject) => {
        planCheckMiddleware(req, res, (planError) => {
          if (planError) {
            // Se erro de plano, apenas logar e continuar
            logger.warn(`Usuário ${req.user?.id} sem plano ativo: ${planError}`);
            req.userPlan = undefined;
            resolve();
          } else {
            resolve();
          }
        });
      });
    } catch (planError) {
      logger.warn(`Erro ao verificar plano: ${planError}`);
      req.userPlan = undefined;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
