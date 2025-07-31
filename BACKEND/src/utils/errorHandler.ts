import { Request, Response } from 'express';
import AppError from './AppError';
import { logger } from './logger';
import { env } from '../config/env';

/**
 * Função para tratar erros provenientes dos serviços de forma padronizada
 */
export const handleServiceError = (error: unknown, res: Response): void => {
  // Se for um erro controlado da aplicação
  if (error instanceof AppError) {
    logger.warn('Erro controlado: ', {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
    });

    res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      context: error.context,
    });
    return;
  }

  // Erro não tratado
  const message = error instanceof Error ? error.message : 'Erro interno do servidor';
  logger.error('Erro não tratado: ', { error, message });

  res.status(500).json({
    message: 'Erro interno do servidor',
    error: env.NODE_ENV === 'development' ? message : undefined,
  });
};

/**
 * Middleware para tratamento de erros no Express
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
): void => {
  if (err instanceof AppError) {
    logger.warn(`${req.method} ${req.url} - Erro controlado:`, {
      statusCode: err.statusCode,
      message: err.message,
      code: err.code,
      context: err.context,
    });

    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        context: err.context,
      },
    });
    return;
  }

  // Erro não tratado
  logger.error(`${req.method} ${req.url} - Erro não tratado:`, {
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: {
      message: 'Erro interno do servidor',
      details: env.NODE_ENV === 'development' ? err.message : undefined,
    },
  });
};
