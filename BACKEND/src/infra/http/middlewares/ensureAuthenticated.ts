import { Request, NextFunction } from 'express';
import { auth } from 'firebase-admin';
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
    throw new AppError(401, 'JWT token is missing');
  }

  const [, token] = authHeader.split(' ');

  try {
    const decodedToken = await auth().verifyIdToken(token);
    request.userId = decodedToken.uid;

    return next();
  } catch {
    throw new AppError(401, 'Invalid JWT token');
  }
}
