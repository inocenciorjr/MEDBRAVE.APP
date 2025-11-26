import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AppError } from '../../../../shared/errors/AppError';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// SERVICE_ROLE_KEY é o correto para backends validarem tokens de usuários
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

  console.log('[ensureAuthenticated] Headers:', {
    authorization: authHeader ? 'presente' : 'ausente',
    origin: request.headers.origin,
    referer: request.headers.referer,
  });

  if (!authHeader) {
    console.error('[ensureAuthenticated] JWT token is missing');
    throw new AppError('JWT token is missing', 401);
  }

  const [, token] = authHeader.split(' ');

  console.log('[ensureAuthenticated] Token:', token ? `${token.substring(0, 20)}...` : 'vazio');
  console.log('[ensureAuthenticated] Supabase URL:', supabaseUrl);
  console.log('[ensureAuthenticated] Service Role Key:', supabaseServiceKey ? 'configurada' : 'AUSENTE');

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      console.error('[ensureAuthenticated] Erro do Supabase:', error.message, error.status);
      throw new AppError(`Invalid JWT token: ${error.message}`, 401);
    }

    if (!user) {
      console.error('[ensureAuthenticated] Usuário não encontrado');
      throw new AppError('Invalid JWT token: user not found', 401);
    }

    console.log('[ensureAuthenticated] ✅ Usuário autenticado:', user.email);

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
    console.error('[ensureAuthenticated] Erro não tratado:', error);
    throw new AppError('Invalid JWT token', 401);
  }
}
