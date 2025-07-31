import { Request, Response, NextFunction } from 'express';

export function selfMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  const paramId = req.params.id || req.body.id;
  if (paramId && userId !== paramId) {
    return res.status(403).json({ error: 'Você só pode alterar o seu próprio perfil.' });
  }
  next();
  return;
} 