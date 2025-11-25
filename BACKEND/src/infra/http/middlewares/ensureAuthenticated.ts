import { Request, NextFunction } from 'express';
import { supabase } from '../../../config/supabaseAdmin';
import { AppError } from '../../../shared/errors/AppError';

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export async function ensureAuthenticated(
  request: Request,
  next: NextFunction,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new AppError('JWT token is missing', 401);
  }

  const [, token] = authHeader.split(' ');

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AppError('Invalid JWT token', 401);
    }

    request.userId = user.id;
    return next();
  } catch (error) {
    throw new AppError('Invalid JWT token', 401);
  }
}
