import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import AppError from '../../../utils/AppError';
import { mentorshipLogger } from '../utils/loggerAdapter';

/**
 * Middleware para verificar se o usuário está autenticado
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(401, 'Token de autenticação não fornecido');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new AppError('Formato de token inválido', 401);
    }

    try {
      const decodedToken = await getAuth().verifyIdToken(token);

      // Adicionar o usuário decodificado ao request
      req.user = {
        id: decodedToken.uid,
        email: decodedToken.email || '',
        role: decodedToken.role || 'STUDENT',
        emailVerified: decodedToken.email_verified ?? false,
      };

      next();
    } catch (error) {
      mentorshipLogger.error('Erro ao verificar token', error);
      throw new AppError('Token inválido ou expirado', 401);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware para verificar se o usuário é mentor
 */
export const isMentor = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Usuário não autenticado', 401);
    }

    if (req.user.role !== 'MENTOR') {
      throw new AppError('Acesso permitido apenas para mentores', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware para verificar se o usuário é o mentor ou mentorado da mentoria
 */
export const isMentorOrMentee = (mentorshipService: any) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const mentorshipId = req.params.mentorshipId || req.body.mentorshipId;

      if (!mentorshipId) {
        throw new AppError('ID da mentoria não fornecido', 400);
      }

      const mentorship = await mentorshipService.getMentorshipById(mentorshipId);

      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      const userId = req.user.id;

      // Verificar se o usuário é o mentor ou mentorado
      if (userId !== mentorship.mentorId && userId !== mentorship.menteeId) {
        throw new AppError('Acesso não autorizado a esta mentoria', 403);
      }

      // Adicionar a mentoria ao request para uso posterior
      req.mentorship = mentorship;

      next();
    } catch (error) {
      next(error);
    }
  };
};
