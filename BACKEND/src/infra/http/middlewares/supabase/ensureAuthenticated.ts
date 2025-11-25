import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AppError } from '../../../../shared/errors/AppError';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export async function ensureAuthenticated(
  request: Request,
  _response: Response,
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

    // Setar tanto userId quanto user para compatibilidade
    request.userId = user.id;
    request.user = {
      id: user.id,
      email: user.email || '',
      user_role: user.user_metadata?.user_role || 'user',
      emailVerified: user.email_confirmed_at !== null,
      username_slug: user.user_metadata?.username_slug,
    };

    return next();
  } catch (error) {
    throw new AppError('Invalid JWT token', 401);
  }
}
