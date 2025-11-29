import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface UserSession {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  user_agent: string | null;
  ip: string | null;
  refreshed_at: string | null;
  not_after: string | null;
}

export class SessionService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Lista todas as sessões de um usuário
   * Usa função RPC para acessar auth.sessions
   */
  async listUserSessions(userId: string): Promise<UserSession[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_sessions', {
        p_user_id: userId
      });

      if (error) {
        console.error('[SessionService] Erro ao listar sessões:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('[SessionService] Erro ao listar sessões:', error);
      return [];
    }
  }

  /**
   * Revoga uma sessão específica
   * Usa SQL direto para deletar a sessão do auth.sessions
   */
  async revokeSession(sessionId: string): Promise<void> {
    try {
      // Deleta a sessão diretamente usando SQL
      const { error } = await this.supabase.rpc('revoke_session', {
        p_session_id: sessionId
      });

      if (error) {
        console.error(`[SessionService] Erro ao revogar sessão:`, error);
      }
    } catch (error: any) {
      console.error(`[SessionService] Erro ao revogar sessão:`, error);
    }
  }

  /**
   * Revoga todas as sessões exceto a atual
   */
  async revokeAllOtherSessions(userId: string, currentSessionId?: string): Promise<number> {
    const sessions = await this.listUserSessions(userId);
    
    const sessionsToRevoke = currentSessionId
      ? sessions.filter(s => s.id !== currentSessionId)
      : sessions;

    for (const session of sessionsToRevoke) {
      await this.revokeSession(session.id);
    }

    return sessionsToRevoke.length;
  }

  /**
   * Limpa sessões antigas mantendo apenas as N mais recentes
   */
  async cleanupOldSessions(userId: string, maxSessions: number = 2): Promise<number> {
    const sessions = await this.listUserSessions(userId);

    if (sessions.length <= maxSessions) {
      return 0;
    }

    const sessionsToRevoke = sessions.slice(maxSessions);

    for (const session of sessionsToRevoke) {
      await this.revokeSession(session.id);
    }

    return sessionsToRevoke.length;
  }

  /**
   * Remove TODAS as sessões de um usuário (para limpar bagunça)
   */
  async purgeAllUserSessions(email: string): Promise<number> {
    // Buscar usuário pelo email
    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      throw new Error(`Usuário não encontrado: ${email}`);
    }

    const sessions = await this.listUserSessions(userData.id);

    for (const session of sessions) {
      await this.revokeSession(session.id);
    }

    return sessions.length;
  }

  /**
   * Verifica se usuário é admin
   */
  async isUserAdmin(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.role === 'ADMIN';
  }
}
