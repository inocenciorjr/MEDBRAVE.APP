import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  console.log('🔍 [AdminMiddleware] Verificando acesso admin:', {
    hasUser: !!req.user,
    userRole: req.user?.role,
    userId: req.user?.id,
    email: req.user?.email
  });
  
  if (!req.user) {
    console.log('❌ [AdminMiddleware] Usuário não autenticado');
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }
  
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
    console.log('❌ [AdminMiddleware] Acesso negado. Role atual:', req.user.role);
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  
  console.log('✅ [AdminMiddleware] Acesso autorizado para admin');
  next();
  return;
}