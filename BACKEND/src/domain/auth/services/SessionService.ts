import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class SessionService {
  private supabase;

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
   */
  async listUserSessions(userId: string) {
    const { data, error } = await this.supabase
      .from('auth.sessions')
      .select('id, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar sessões: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Revoga uma sessão específica
   */
  async revokeSession(sessionId: string): Promise<void> {
    const { error } = await this.supabase.auth.admin.deleteSession(sessionId);

    if (error) {
      throw new Error(`Erro ao revogar sessão: ${error.message}`);
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

    return data.role === 'admin';
  }
}
