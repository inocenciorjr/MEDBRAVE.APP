/**
 * ⏱️ RATE LIMITER MIDDLEWARE
 * 
 * Middleware para limitar taxa de requisições por usuário.
 * Usa Redis para armazenar contadores de requisições.
 */

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import logger from '../utils/logger';

// Usar o tipo Request globalmente aumentado (src/@types/express)

// Configuração do Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  logger.error('[RateLimiter] Redis connection error:', err);
});

redis.on('connect', () => {
  logger.info('[RateLimiter] Redis connected');
});

/**
 * Cria middleware de rate limiting
 * 
 * @param maxRequests - Número máximo de requisições permitidas
 * @param windowMs - Janela de tempo em milissegundos
 * @param keyPrefix - Prefixo para a chave no Redis
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
  keyPrefix: string = 'rate_limit'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // Verificar se o usuário está autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Autenticação necessária',
          },
        });
      }

      const userId = req.user.id;
      const key = `${keyPrefix}:${userId}`;

      // Obter contador atual
      const current = await redis.get(key);
      const count = current ? parseInt(current) : 0;

      // Verificar se excedeu o limite
      if (count >= maxRequests) {
        const ttl = await redis.ttl(key);
        const resetTime = new Date(Date.now() + (ttl * 1000));

        logger.warn(`[RateLimiter] Usuário ${req.user.email} excedeu limite de ${maxRequests} requisições`);

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Limite de ${maxRequests} requisições por hora excedido. Tente novamente mais tarde.`,
            details: {
              limit: maxRequests,
              remaining: 0,
              resetAt: resetTime.toISOString(),
            },
          },
        });
      }

      // Incrementar contador
      const newCount = await redis.incr(key);

      // Se é a primeira requisição, definir expiração
      if (newCount === 1) {
        await redis.pexpire(key, windowMs);
      }

      // Adicionar headers de rate limit
      const ttl = await redis.ttl(key);
      const remaining = Math.max(0, maxRequests - newCount);

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + (ttl * 1000)).toISOString());

      logger.info(`[RateLimiter] Usuário ${req.user.email}: ${newCount}/${maxRequests} requisições`);

      next();
      return;
    } catch (error: any) {
      logger.error('[RateLimiter] Erro ao verificar rate limit:', error);
      // Em caso de erro, permitir a requisição (fail-open)
      next();
      return;
    }
  };
}

/**
 * Rate limiter específico para scraper
 * Limite: 10 extrações por hora por usuário
 */
export const scraperRateLimiter = createRateLimiter(
  10, // 10 requisições
  60 * 60 * 1000, // 1 hora
  'scraper_rate_limit'
);

/**
 * Obter informações de rate limit para um usuário
 */
export async function getRateLimitInfo(userId: string, keyPrefix: string = 'scraper_rate_limit') {
  try {
    const key = `${keyPrefix}:${userId}`;
    const current = await redis.get(key);
    const count = current ? parseInt(current) : 0;
    const ttl = await redis.ttl(key);

    return {
      used: count,
      remaining: Math.max(0, 10 - count),
      resetAt: ttl > 0 ? new Date(Date.now() + (ttl * 1000)) : null,
    };
  } catch (error: any) {
    logger.error('[RateLimiter] Erro ao obter info de rate limit:', error);
    return null;
  }
}

/**
 * Resetar rate limit de um usuário (útil para testes ou admin)
 */
export async function resetRateLimit(userId: string, keyPrefix: string = 'scraper_rate_limit') {
  try {
    const key = `${keyPrefix}:${userId}`;
    await redis.del(key);
    logger.info(`[RateLimiter] Rate limit resetado para usuário ${userId}`);
    return true;
  } catch (error: any) {
    logger.error('[RateLimiter] Erro ao resetar rate limit:', error);
    return false;
  }
}
