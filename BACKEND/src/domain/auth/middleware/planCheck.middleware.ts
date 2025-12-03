import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './supabaseAuth.middleware';
import { SupabaseUserPlanService } from '../../../infra/payment/supabase/SupabaseUserPlanService';
import { SupabasePlanService } from '../../../infra/payment/supabase/SupabasePlanService';
import { supabase } from '../../../config/supabaseAdmin';
import { AppError, ErrorCodes } from '../../../utils/errors';
import logger from '../../../utils/logger';
import { UserPlanStatus, PlanLimits } from '../../payment/types';

// Cache de planos de usuário (30 segundos)
const userPlanCache = new Map<
  string,
  { plan: any; limits: PlanLimits; expiresAt: number }
>();
const CACHE_TTL_MS = 30 * 1000;

// ✅ OTIMIZAÇÃO: Instâncias singleton dos serviços (evita criar a cada requisição)
const planService = new SupabasePlanService(supabase);
const userPlanService = new SupabaseUserPlanService(supabase, planService);

/**
 * Estende o Request com informações do plano do usuário
 */
export interface PlanAuthenticatedRequest extends AuthenticatedRequest {
  userPlan?: {
    id: string;
    planId: string;
    planName: string;
    status: UserPlanStatus;
    limits: PlanLimits;
    endDate: Date;
    isActive: boolean;
  };
}

/**
 * Middleware que verifica se o usuário possui um plano ativo
 * DEVE ser usado APÓS o supabaseAuthMiddleware
 */
export const planCheckMiddleware = async (
  req: PlanAuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new AppError(
        401,
        'Usuário não autenticado',
        ErrorCodes.UNAUTHORIZED,
      );
    }

    const userId = req.user.id;
    const now = Date.now();

    // Permitir bypass do cache via header (útil para testes/admin)
    const bypassCache = req.headers['x-bypass-plan-cache'] === 'true';

    // Verificar cache (se não for bypass)
    if (!bypassCache) {
      const cached = userPlanCache.get(userId);
      if (cached && cached.expiresAt > now) {
        req.userPlan = cached.plan;
        return next();
      }
    }

    // Buscar plano ativo do usuário (usando instâncias singleton)
    let activePlans = await userPlanService.getUserActivePlans(userId);

    // Se não encontrou planos, fazer uma única tentativa extra (race condition no primeiro carregamento)
    // ✅ OTIMIZAÇÃO: Reduzido de 3 tentativas para 1, já que a query agora é mais rápida
    if (!activePlans || activePlans.length === 0) {
      logger.warn(`Usuário ${userId} sem plano ativo, aguardando 200ms para retry...`);
      await new Promise(resolve => setTimeout(resolve, 200));
      activePlans = await userPlanService.getUserActivePlans(userId);
    }

    if (!activePlans || activePlans.length === 0) {
      logger.warn(`Usuário ${userId} sem plano ativo após retry`);
      throw new AppError(
        403,
        'Você precisa de um plano ativo para acessar este recurso',
        ErrorCodes.SUBSCRIPTION_REQUIRED,
      );
    }

    // Pegar o primeiro plano ativo (usuário pode ter múltiplos)
    // ✅ OTIMIZAÇÃO: getUserActivePlans agora já traz os dados do plano via JOIN
    const userPlan = activePlans[0];

    const userPlanData = {
      id: userPlan.id,
      planId: userPlan.planId,
      planName: userPlan.planName,
      status: userPlan.status,
      limits: userPlan.limits,
      endDate: new Date(userPlan.endDate),
      isActive: userPlan.status === UserPlanStatus.ACTIVE || userPlan.status === UserPlanStatus.TRIAL,
    };

    // Adicionar ao request
    req.userPlan = userPlanData;

    // Adicionar ao cache
    userPlanCache.set(userId, {
      plan: userPlanData,
      limits: userPlanData.limits,
      expiresAt: now + CACHE_TTL_MS,
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware que verifica se o usuário tem permissão para uma funcionalidade específica
 * @param feature Nome da feature a verificar (ex: 'canExportData', 'canAccessMentorship')
 */
export const requirePlanFeature = (feature: keyof PlanLimits) => {
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

      const featureValue = req.userPlan.limits[feature];

      // Para features booleanas
      if (typeof featureValue === 'boolean') {
        if (!featureValue) {
          throw new AppError(
            403,
            `Seu plano não inclui acesso a esta funcionalidade. Faça upgrade para desbloquear.`,
            ErrorCodes.SUBSCRIPTION_REQUIRED,
          );
        }
      }

      // Para features numéricas (limites)
      // A verificação de limite específico deve ser feita no controller
      // Este middleware apenas verifica se a feature existe

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware que verifica se o usuário atingiu um limite de uso
 * @param limitKey Chave do limite (ex: 'maxQuestionsPerDay')
 * @param getCurrentUsage Função que retorna o uso atual
 */
export const checkUsageLimit = (
  limitKey: keyof PlanLimits,
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

      const limit = req.userPlan.limits[limitKey];

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
            `Você atingiu o limite de ${limit} para esta funcionalidade. Faça upgrade para continuar.`,
            ErrorCodes.QUOTA_EXCEEDED,
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Limpa o cache de plano de um usuário específico
 */
export const clearUserPlanCache = (userId: string): void => {
  userPlanCache.delete(userId);
  logger.debug(`Cache de plano limpo para usuário ${userId}`);
};

/**
 * Limpa todo o cache de planos
 */
export const clearAllPlanCache = (): void => {
  userPlanCache.clear();
  logger.info('Cache de planos limpo completamente');
};
