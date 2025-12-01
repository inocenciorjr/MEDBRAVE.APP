import { Request, Response, NextFunction } from 'express';
import AppError from '../../../utils/AppError';
import { mentorshipLogger } from '../utils/loggerAdapter';
import { supabase } from '../../../config/supabase';

/**
 * Middleware para verificar se o usuário está autenticado usando Supabase
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Token de autenticação não fornecido', 401);
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new AppError('Formato de token inválido', 401);
    }

    try {
      // Verificar token com Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        mentorshipLogger.error('Erro ao verificar token Supabase', error);
        throw new AppError('Token inválido ou expirado', 401);
      }

      // Buscar role do usuário na tabela profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Adicionar o usuário decodificado ao request
      req.user = {
        id: user.id,
        email: user.email || '',
        user_role: profile?.role?.toUpperCase() || 'STUDENT',
        emailVerified: user.email_confirmed_at !== null,
      };

      next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
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
export const isMentor = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new AppError('Usuário não autenticado', 401);
    }

    if ((req.user.user_role || '').toUpperCase() !== 'MENTOR') {
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

      const mentorship =
        await mentorshipService.getMentorshipById(mentorshipId);

      if (!mentorship) {
        throw new AppError(
          `Mentoria com ID ${mentorshipId} não encontrada`,
          404,
        );
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
