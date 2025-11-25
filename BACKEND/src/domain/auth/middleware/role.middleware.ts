import { Response, NextFunction } from 'express';
import { AppError } from '../../../utils/errors';
import { AuthenticatedRequest } from './supabaseAuth.middleware';
import { UserRole } from '../../user/types';
import logger from '../../../utils/logger';

/**
 * Middleware para verificação de roles/papéis de usuário
 *
 * Verifica se o usuário autenticado possui pelo menos uma das roles especificadas.
 * Deve ser usado após o middleware de autenticação.
 *
 * @param allowedRoles Array com as roles permitidas para acessar o recurso
 */
export const roleMiddleware = (allowedRoles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): void => {
    try {
      // Verifica se o usuário está autenticado
      if (!req.user) {
        throw new AppError(
          401,
          'Autenticação necessária para acessar este recurso',
        );
      }

      // Se ADMIN estiver presente nas roles permitidas, verificar se o usuário é admin
      const isAdmin = req.user.user_role === UserRole.ADMIN;
      if (allowedRoles.includes(UserRole.ADMIN) && isAdmin) {
        return next();
      }

      // Verifica se a role do usuário está na lista de roles permitidas
      const hasAllowedRole = allowedRoles.includes(req.user.user_role as UserRole);

      if (!hasAllowedRole) {
        logger.warn(
          `Tentativa de acesso não autorizado: usuário ${req.user.id} com role ${req.user.user_role} tentou acessar recurso restrito a ${allowedRoles.join(', ')}`,
        );
        throw new AppError(
          403,
          'Você não tem permissão para acessar este recurso',
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware para verificar se o usuário é administrador
 */
export const adminMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  return roleMiddleware([UserRole.ADMIN])(req, _res, next);
};

/**
 * Middleware para verificar se o usuário é mentor
 */
export const mentorMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  return roleMiddleware([UserRole.MENTOR, UserRole.ADMIN])(req, _res, next);
};

/**
 * Middleware para verificar se o usuário é professor
 */
export const teacherMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  return roleMiddleware([UserRole.TEACHER, UserRole.ADMIN])(req, _res, next);
};

/**
 * Middleware para verificar se o usuário é o proprietário do recurso ou administrador
 *
 * @param getResourceUserId Função que retorna o ID do proprietário do recurso
 */
export const ownerOrAdminMiddleware = (
  getResourceUserId: (req: AuthenticatedRequest) => string | Promise<string>,
) => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Verifica se o usuário está autenticado
      if (!req.user) {
        throw new AppError(
          401,
          'Autenticação necessária para acessar este recurso',
        );
      }

      // Se for admin, permite acesso
      if (req.user.user_role === UserRole.ADMIN) {
        return next();
      }

      // Obtém o ID do proprietário do recurso
      const resourceUserId = await getResourceUserId(req);

      // Verifica se o usuário autenticado é o proprietário do recurso
      if (req.user.id !== resourceUserId) {
        logger.warn(
          `Tentativa de acesso não autorizado: usuário ${req.user.id} tentou acessar recurso do usuário ${resourceUserId}`,
        );
        throw new AppError(
          403,
          'Você não tem permissão para acessar este recurso',
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
