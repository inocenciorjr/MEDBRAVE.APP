import { Request, Response, NextFunction } from 'express';
import { auth as firebaseAdminAuth, firestore } from '../../../config/firebaseAdmin';
import { AppError } from '../../../utils/errors';
import logger from '../../../utils/logger';
import * as admin from 'firebase-admin';

/**
 * Interface para estender o objeto Request com informações do usuário
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    emailVerified: boolean;
    slug?: string;
  };
  token?: string;
}

// --- CACHE DE USUÁRIO ---
const userCache = new Map<string, { data: any, expiresAt: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

async function getUserFromCacheOrFirestore(userId: string): Promise<any> {
  const now = Date.now();
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }
  // Buscar do Firestore
  const userDoc = await firestore.collection('users').doc(userId).get();
  const data = userDoc.exists ? userDoc.data() : null;
  userCache.set(userId, { data, expiresAt: now + CACHE_TTL_MS });
  return data;
}

/**
 * Middleware de autenticação
 *
 * Verifica se o usuário está autenticado através do token JWT.
 * Em caso positivo, adiciona informações do usuário ao objeto Request.
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Log detalhado dos headers recebidos
   // Headers recebidos - log removido
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('❌ [AuthMiddleware] Authorization header não fornecido');
      throw new AppError(401, 'Token de autenticação não fornecido');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('❌ [AuthMiddleware] Formato de Authorization header inválido:', authHeader);
      throw new AppError(401, 'Formato de token inválido');
    }

    const token = parts[1];
    if (!token || token.trim() === '') {
      logger.warn('❌ [AuthMiddleware] Token vazio após split');
      throw new AppError(401, 'Token vazio');
    }

    // Log do token (primeiros e últimos caracteres para debug)
  // Token recebido - log removido
    
    try {
      // Verificando token
      
      // Valida o ID Token do Firebase
      const decoded = await firebaseAdminAuth.verifyIdToken(token);
      // Token verificado com sucesso
      
      const data = await getUserFromCacheOrFirestore(decoded.uid);
      let role = 'STUDENT'; // Default em maiúsculo
      if (data && data.role) {
        // 🔄 NORMALIZAR: Converter role para maiúsculo para consistência com enum UserRole
        role = data.role.toUpperCase();
      }
      
      // --- Garantir usernameSlug legível ---
      let usernameSlug = data?.usernameSlug as string | undefined;
      const sanitize = (txt: string) => (txt || 'user')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // remove acentos
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 20);

      // Se usuário não existe OU existe mas não tem slug
      if (!data || !usernameSlug) {
        const base = sanitize(
          (data?.displayName) || 
          decoded.name || 
          (decoded.email || '').split('@')[0]
        );
        const rand = Math.random().toString(36).substring(2, 6); // 4 chars
        usernameSlug = `${base}-${rand}`;

        // Se usuário não existe, criar completo
        if (!data) {
          await firestore.runTransaction(async (tx) => {
            tx.set(firestore.doc(`usernames/${usernameSlug}`), { uid: decoded.uid });
            tx.set(firestore.doc(`users/${decoded.uid}`), {
              email: decoded.email,
              displayName: decoded.name || '',
              photoURL: decoded.picture || null,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              role: 'student',
              usernameSlug,
            });
          });
        } else {
          // Se usuário existe mas não tem slug, só adicionar slug
          await firestore.runTransaction(async (tx) => {
            tx.set(firestore.doc(`usernames/${usernameSlug}`), { uid: decoded.uid });
            tx.update(firestore.doc(`users/${decoded.uid}`), {
              usernameSlug,
            });
          });
        }
      }
      
      req.user = {
        id: decoded.uid,
        email: decoded.email || '',
        role,
        emailVerified: decoded.email_verified || false,
        slug: usernameSlug,
      };
      req.token = token;
      
      next();
    } catch (error) {
      console.error('❌ [Auth Middleware] Erro detalhado:', {
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n')[0]
      });
      logger.error('Erro ao verificar token Firebase ou buscar usuário:', error);
      throw new AppError(401, 'Token inválido ou usuário não encontrado');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware opcional que não bloqueia usuários não autenticados
 * Útil para rotas que podem ser acessadas com ou sem autenticação
 */
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // Se não tiver cabeçalho de autorização, apenas continua
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    try {
      // Valida o ID Token do Firebase
      const decoded = await firebaseAdminAuth.verifyIdToken(token);
      
      // Busca o documento do usuário no Firestore
      const data = await getUserFromCacheOrFirestore(decoded.uid);
      let role = 'STUDENT'; // Default em maiúsculo
      if (data && data.role) {
        // 🔄 NORMALIZAR: Converter role para maiúsculo para consistência com enum UserRole
        role = data.role.toUpperCase();
      }
      req.user = {
        id: decoded.uid,
        email: decoded.email || '',
        role,
        emailVerified: decoded.email_verified || false,
      };
      req.token = token;
      
    } catch (error) {
      // Log do erro, mas continua o fluxo
      logger.warn('Erro ao verificar token opcional:', error);
    }

    next();
  } catch (error) {
    next(error);
  }
};
