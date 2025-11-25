/**
 * 🔐 ADMIN AUTHORIZATION MIDDLEWARE
 * 
 * Middleware para verificar se o usuário tem permissão de ADMIN.
 * Deve ser usado após o middleware de autenticação.
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Middleware para verificar se o usuário é ADMIN
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): Response | void {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      logger.warn('[AdminAuth] Tentativa de acesso sem autenticação');
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Autenticação necessária',
        },
      });
    }

    // Verificar se o usuário tem role ADMIN
    if (req.user.user_role !== 'ADMIN') {
      logger.warn(`[AdminAuth] Usuário ${req.user.email} tentou acessar recurso admin sem permissão (role: ${req.user.user_role})`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Acesso negado. Apenas administradores podem acessar este recurso.',
        },
      });
    }

    // Usuário é ADMIN, permitir acesso
    logger.info(`[AdminAuth] Acesso admin autorizado para ${req.user.email}`);
    next();
    return;
  } catch (error: any) {
    logger.error('[AdminAuth] Erro ao verificar permissões:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro ao verificar permissões',
      },
    });
  }
}

/**
 * Middleware para verificar se o usuário tem uma das roles permitidas
 */
export function requireRoles(allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => Response | void {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Autenticação necessária',
          },
        });
      }

      if (!allowedRoles.includes(req.user.user_role)) {
        logger.warn(`[AdminAuth] Usuário ${req.user.email} tentou acessar recurso sem permissão (role: ${req.user.user_role}, permitidas: ${allowedRoles.join(', ')})`);
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Acesso negado. Roles permitidas: ${allowedRoles.join(', ')}`,
          },
        });
      }

      next();
      return;
    } catch (error: any) {
      logger.error('[AdminAuth] Erro ao verificar roles:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro ao verificar permissões',
        },
      });
    }
  };
}
