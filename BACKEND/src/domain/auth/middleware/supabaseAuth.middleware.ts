import { Request, Response, NextFunction } from 'express';
import { supabase } from '../../../config/supabaseAdmin';
import { AppError } from '../../../utils/errors';
import logger from '../../../utils/logger';
import { SupabaseUserRepository } from '../repositories/SupabaseUserRepository';
import { User, CreateUserDTO } from '../repositories/IUserRepository';
import { UserPlanAssignmentService } from '../services/UserPlanAssignmentService';

// Instância do repository
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
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

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
  console.log('🔐 [SupabaseAuthMiddleware] Iniciando verificação de autenticação');
  console.log('🔐 [SupabaseAuthMiddleware] Path:', req.path);
  console.log('🔐 [SupabaseAuthMiddleware] Method:', req.method);
  
  try {
    const authHeader = req.headers.authorization;
    console.log('🔐 [SupabaseAuthMiddleware] Authorization header:', authHeader ? 'presente' : 'ausente');

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
      // Verificar token com Supabase
      const { data: authData, error: authError } =
        await supabase.auth.getUser(token);

      if (authError || !authData.user) {
        throw new AppError(401, 'Token inválido');
      }

      const userData = await getUserFromCacheOrRepository(authData.user.id);

      // Obter role diretamente do raw_user_meta_data do Supabase Auth
      const userRoleFromMetadata = authData.user.user_metadata?.role;
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
        const displayName = userData?.display_name || authData.user.user_metadata?.name || (authData.user.email || '').split('@')[0];
        const base = sanitize(displayName);
        const rand = Math.random().toString(36).substring(2, 6); // 4 chars
        usernameSlug = `${base}-${rand}`;
      }

      // Se usuário não existe, criar completo
      if (!userData) {
        const newUser: CreateUserDTO = {
          id: authData.user.id,
          email: authData.user.email || '',
          display_name: authData.user.user_metadata?.name || authData.user.user_metadata?.display_name || authData.user.user_metadata?.full_name || (authData.user.email || '').split('@')[0],
          photo_url: authData.user.user_metadata?.photoURL || authData.user.user_metadata?.avatar_url || undefined,
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
          
          // Atribuir plano FREE padrão ao novo usuário
          try {
            await planAssignmentService.assignDefaultFreePlan(authData.user.id);
            logger.info(`✅ Plano FREE atribuído ao usuário: ${authData.user.id}`);
          } catch (planError) {
            logger.error(`❌ Erro ao atribuir plano padrão: ${planError}`);
            // Não falhar a autenticação por erro de plano
          }
        } catch (insertError: any) {
          // Se erro de duplicata, significa que usuário foi criado entre a verificação e agora
          if (insertError.code === '23505') {
            logger.info(`ℹ️ Usuário já existe (criado concorrentemente): ${newUser.email}`);
            // Limpar cache e buscar usuário novamente
            userCache.delete(authData.user.id);
            let userData = await getUserFromCacheOrRepository(authData.user.id);
            if (userData && !userData.username_slug) {
              usernameSlug = usernameSlug; // Manter o slug gerado
            } else if (userData) {
              usernameSlug = userData.username_slug;
            }
          } else {
            logger.error('Erro ao criar usuário na tabela users:', {
              error: insertError,
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
              newUser: { id: newUser.id, email: newUser.email, username_slug: newUser.username_slug }
            });
            throw new AppError(500, `Erro ao criar usuário: ${insertError.message}`);
          }
        }
      } else {
        // Se usuário existe mas não tem slug, só adicionar slug
        try {
          await userRepository.update(authData.user.id, { username_slug: usernameSlug });
        } catch (updateError: any) {
          logger.error('Erro ao atualizar username_slug:', updateError);
        }
      }

      req.user = {
        id: authData.user.id,
        email: authData.user.email || '',
        user_role: user_role,
        emailVerified: authData.user.email_confirmed_at !== null,
        username_slug: usernameSlug,
      };
      req.token = token;

      // Limitar sessões simultâneas (máximo 2 dispositivos)
      try {
        const { SessionService } = await import('../services/SessionService');
        const sessionService = new SessionService();
        const MAX_SESSIONS = 2;
        
        const revokedCount = await sessionService.cleanupOldSessions(authData.user.id, MAX_SESSIONS);
        
        if (revokedCount > 0) {
          logger.info(`[SessionLimit] ${revokedCount} sessões antigas revogadas para usuário ${authData.user.id}`);
        }
      } catch (sessionError) {
        // Log do erro mas não bloqueia o fluxo
        logger.error('[SessionLimit] Erro ao limpar sessões antigas:', sessionError);
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
      // Verificar token com Supabase
      const { data: authData, error: authError } =
        await supabase.auth.getUser(token);

      if (authError || !authData.user) {
        return next();
      }

      // Busca o documento do usuário no repository
      const userData = await getUserFromCacheOrRepository(authData.user.id);

      // Obter role diretamente do raw_user_meta_data do Supabase Auth
      const userRoleFromMetadata = authData.user.user_metadata?.role;
      let user_role = 'STUDENT'; // Default em maiúsculo

      if (userRoleFromMetadata) {
        // Normalizar: Converter role para maiúsculo para consistência com enum UserRole
        user_role = String(userRoleFromMetadata).toUpperCase();
      } else if (userData && userData.role) {
        // Fallback para compatibilidade com usuários existentes
        user_role = String(userData.role).toUpperCase();
      }

      req.user = {
        id: authData.user.id,
        email: authData.user.email || '',
        user_role: user_role,
        emailVerified: authData.user.email_confirmed_at !== null,
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
