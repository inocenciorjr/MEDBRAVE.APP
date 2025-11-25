import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './supabaseAuth.middleware';

export function adminMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {


  if (!req.user) {
    console.log('❌ [AdminMiddleware] Usuário não autenticado');
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }

  if (req.user.user_role !== 'ADMIN' && req.user.user_role !== 'SUPERADMIN') {
    console.log(
      '❌ [AdminMiddleware] Acesso negado. Role atual:',
      req.user.user_role,
    );
    return res
      .status(403)
      .json({ error: 'Acesso restrito a administradores.' });
  }

  // console.log('✅ [AdminMiddleware] Acesso autorizado para admin');
  next();
  return;
}
