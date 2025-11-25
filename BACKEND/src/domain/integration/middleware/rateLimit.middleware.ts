import expressRateLimit from 'express-rate-limit';
import { RequestHandler, Request, Response } from 'express';

/**
 * Cria um middleware de rate limit customizado para diferentes chaves e limites.
 * @param keyPrefix Prefixo para diferenciar o rate limit por rota/ação
 * @param max Máximo de requisições
 * @param windowMs Janela de tempo em ms
 */
export function rateLimit(
  keyPrefix: string,
  max: number,
  windowMs: number,
): RequestHandler {
  return expressRateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => `${keyPrefix}:${req.ip}`,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: 'Limite de requisições excedido. Tente novamente mais tarde.',
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
