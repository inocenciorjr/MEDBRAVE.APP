import { supabaseAuthMiddleware } from '../domain/auth/middleware/supabaseAuth.middleware';

// Alias para manter compatibilidade com as rotas existentes
export const authenticateToken = supabaseAuthMiddleware;