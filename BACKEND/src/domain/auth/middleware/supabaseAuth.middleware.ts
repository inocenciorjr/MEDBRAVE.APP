import { Request, Response, NextFunction } from 'express';
import { supabase } from '../../../config/supabaseAdmin';
import { AppError } from '../../../utils/errors';
import logger from '../../../utils/logger';
import { SupabaseUserRepository } from '../repositories/SupabaseUserRepository';
import { User, CreateUserDTO } from '../repositories/IUserRepository';
import { UserPlanAssignmentService } from '../services/UserPlanAssignmentService';

// ✅ OTIMIZAÇÃO: Instâncias singleton (evita criar a cada requisição)
const userRepository = new SupabaseUserRepository();
const planAssignmentService = new UserPlanAssignmentService();

/**
 * Interface para estender o objeto Request com informações do usuário
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    user_role: string;
    emailVerified: boolean;
    username_slug?: string;
  };
  token?: string;
}

// --- CACHE DE USUÁRIO ---
const userCache = new Map<string, { data: User | null; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // ✅ OTIMIZAÇÃO: Aumentado para 60 segundos

// --- CACHE DE TOKEN VERIFICADO ---
// ✅ OTIMIZAÇÃO: Cache de tokens já verificados para evitar chamadas repetidas ao Supabase Auth
const tokenCache = new Map<string, { userId: string; email: string; emailVerified: boolean; metadata: any; expiresAt: number }>();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos (tokens JWT têm validade maior)

// --- CONTROLE DE CLEANUP DE SESSÕES ---
// ✅ OTIMIZAÇÃO: Executar cleanup apenas a cada 5 minutos por usuário
const lastSessionCleanup = new Map<string, number>();
const SESSION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

async function getUserFromCacheOrRepository(userId: string): Promise<User | null> {
  const now = Date.now();
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  // Buscar do repository
  const user = await userRepository.findById(userId);

  userCache.set(userId, { data: user, expiresAt: now + CACHE_TTL_MS });
  return user;
}

/**
 * Verifica token com cache para evitar chamadas repetidas ao Supabase Auth
 * 
 * IMPORTANTE: O cache é por token específico, então tokens renovados
 * serão verificados novamente (não usam cache do token antigo)
 */
async function verifyTokenWithCache(token: string): Promise<{ userId: string; email: string; emailVerified: boolean; metadata: any } | null> {
  const now = Date.now();
  
  // Verificar cache primeiro (cache é por token específico)
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  // Verificar com Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    // Se o token estava em cache mas agora é inválido, remover do cache
    if (cached) {
      tokenCache.delete(token);
    }
    return null;
  }

  const result = {
    userId: authData.user.id,
    email: authData.user.email || '',
    emailVerified: authData.user.email_confirmed_at !== null,
    metadata: authData.user.user_metadata || {},
    expiresAt: now + TOKEN_CACHE_TTL_MS,
  };

  tokenCache.set(token, result);
  
  // Limpar cache de tokens antigos periodicamente (evita memory leak)
  if (tokenCache.size > 1000) {
    const keysToDelete: string[] = [];
    tokenCache.forEach((value, key) => {
      if (value.expiresAt < now) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => tokenCache.delete(key));
  }
  
  return result;
}

/**
 * Middleware de autenticação Supabase
 *
 * Verifica se o usuário está autenticado através do token JWT.
 * Em caso positivo, adiciona informações do usuário ao objeto Request.
 */
export const supabaseAuthMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn(
        '[SupabaseAuthMiddleware] Authorization header não fornecido',
      );
      throw new AppError(401, 'Token de autenticação não fornecido');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn(
        '[SupabaseAuthMiddleware] Formato de Authorization header inválido:',
        authHeader,
      );
      throw new AppError(401, 'Formato de token inválido');
    }

    const token = parts[1];
    if (!token || token.trim() === '') {
      logger.warn('[SupabaseAuthMiddleware] Token vazio após split');
      throw new AppError(401, 'Token vazio');
    }

    try {
      // ✅ OTIMIZAÇÃO: Verificar token com cache (evita chamadas repetidas ao Supabase Auth)
      const authResult = await verifyTokenWithCache(token);

      if (!authResult) {
        throw new AppError(401, 'Token inválido');
      }

      const userData = await getUserFromCacheOrRepository(authResult.userId);

      // Obter role diretamente do raw_user_meta_data do Supabase Auth
      const userRoleFromMetadata = authResult.metadata?.role;
      let user_role = 'STUDENT'; // Default em maiúsculo

      if (userRoleFromMetadata) {
        // Normalizar: Converter role para maiúsculo para consistência com enum UserRole
        user_role = String(userRoleFromMetadata).toUpperCase();
      } else if (userData && userData.role) {
        // Fallback para compatibilidade com usuários existentes
        user_role = String(userData.role).toUpperCase();
      }

      // --- Garantir username_slug legível ---
      let usernameSlug = userData?.username_slug as string | undefined;

      const sanitize = (txt: string) => {
        // Mapa de substituição de caracteres acentuados
        const accentMap: { [key: string]: string } = {
          'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
          'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
          'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
          'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
          'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
          'ç': 'c', 'ñ': 'n',
          'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
          'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
          'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
          'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
          'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
          'Ç': 'C', 'Ñ': 'N'
        };

        return (txt || 'user')
          .split('')
          .map(char => accentMap[char] || char)
          .join('')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 20);
      };

      // Se usuário não existe OU existe mas não tem slug
      if (!userData || !usernameSlug) {
        const displayName = userData?.display_name || authResult.metadata?.name || authResult.email.split('@')[0];
        const base = sanitize(displayName);
        const rand = Math.random().toString(36).substring(2, 6); // 4 chars
        usernameSlug = `${base}-${rand}`;
      }

      // Se usuário não existe, criar completo
      if (!userData) {
        const newUser: CreateUserDTO = {
          id: authResult.userId,
          email: authResult.email,
          display_name: authResult.metadata?.name || authResult.metadata?.display_name || authResult.metadata?.full_name || authResult.email.split('@')[0],
          photo_url: authResult.metadata?.photoURL || authResult.metadata?.avatar_url || undefined,
          role: 'student',
          username_slug: usernameSlug,
          mastered_flashcards: 0,
          total_decks: 0,
          total_flashcards: 0,
          active_flashcards: 0
        };

        // Inserir usuário usando repository
        try {
          await userRepository.create(newUser);
          logger.info(`✅ Usuário criado: ${newUser.email} (${usernameSlug})`);
          
          // ✅ OTIMIZAÇÃO: Atribuir plano TRIAL em background (não bloqueia resposta)
          setImmediate(async () => {
            try {
              await planAssignmentService.assignTrialPlan(authResult.userId);
              logger.info(`✅ Plano TRIAL de 7 dias atribuído ao usuário: ${authResult.userId}`);
            } catch (planError) {
              logger.error(`❌ Erro ao atribuir plano trial: ${planError}`);
            }
          });
        } catch (insertError: any) {
          // Se erro de duplicata, significa que usuário foi criado entre a verificação e agora
          if (insertError.code === '23505') {
            logger.info(`ℹ️ Usuário já existe (criado concorrentemente): ${newUser.email}`);
            // Limpar cache e buscar usuário novamente
            userCache.delete(authResult.userId);
            const refreshedUserData = await getUserFromCacheOrRepository(authResult.userId);
            if (refreshedUserData?.username_slug) {
              usernameSlug = refreshedUserData.username_slug;
            }
          } else {
            logger.error('Erro ao criar usuário na tabela users:', {
              error: insertError,
              code: insertError.code,
              message: insertError.message,
            });
            throw new AppError(500, `Erro ao criar usuário: ${insertError.message}`);
          }
        }
      } else if (!userData.username_slug) {
        // ✅ OTIMIZAÇÃO: Se usuário existe mas não tem slug, atualizar em background
        setImmediate(async () => {
          try {
            await userRepository.update(authResult.userId, { username_slug: usernameSlug });
          } catch (updateError: any) {
            logger.error('Erro ao atualizar username_slug:', updateError);
          }
        });
      }

      req.user = {
        id: authResult.userId,
        email: authResult.email,
        user_role: user_role,
        emailVerified: authResult.emailVerified,
        username_slug: usernameSlug,
      };
      req.token = token;

      // ✅ OTIMIZAÇÃO: Limitar sessões apenas a cada 5 minutos por usuário
      const now = Date.now();
      const lastCleanup = lastSessionCleanup.get(authResult.userId) || 0;
      
      if (now - lastCleanup > SESSION_CLEANUP_INTERVAL_MS) {
        lastSessionCleanup.set(authResult.userId, now);
        
        // Executar cleanup em background (não bloqueia resposta)
        setImmediate(async () => {
          try {
            const { SessionService } = await import('../services/SessionService');
            const sessionService = new SessionService();
            const MAX_SESSIONS = 2;
            
            const revokedCount = await sessionService.cleanupOldSessions(authResult.userId, MAX_SESSIONS);
            
            if (revokedCount > 0) {
              logger.info(`[SessionLimit] ${revokedCount} sessões antigas revogadas para usuário ${authResult.userId}`);
            }
          } catch (sessionError) {
            logger.error('[SessionLimit] Erro ao limpar sessões antigas:', sessionError);
          }
        });
      }

      next();
    } catch (error: any) {
      console.error('[Supabase Auth Middleware] Erro detalhado:', {
        message: error?.message,
        stack: error?.stack?.split('\n')[0],
      });
      logger.error(
        'Erro ao verificar token Supabase ou buscar usuário:',
        error,
      );
      next(error);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware opcional que não bloqueia usuários não autenticados
 * Útil para rotas que podem ser acessadas com ou sem autenticação
 */
export const optionalSupabaseAuthMiddleware = async (
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
      // ✅ OTIMIZAÇÃO: Verificar token com cache
      const authResult = await verifyTokenWithCache(token);

      if (!authResult) {
        return next();
      }

      // Busca o documento do usuário no repository
      const userData = await getUserFromCacheOrRepository(authResult.userId);

      // Obter role diretamente do raw_user_meta_data do Supabase Auth
      const userRoleFromMetadata = authResult.metadata?.role;
      let user_role = 'STUDENT'; // Default em maiúsculo

      if (userRoleFromMetadata) {
        user_role = String(userRoleFromMetadata).toUpperCase();
      } else if (userData && userData.role) {
        user_role = String(userData.role).toUpperCase();
      }

      req.user = {
        id: authResult.userId,
        email: authResult.email,
        user_role: user_role,
        emailVerified: authResult.emailVerified,
      };
      req.token = token;
    } catch (error) {
      logger.warn('Erro ao verificar token opcional:', error);
    }

    next();
  } catch (error) {
    next(error);
  }
};
