/**
 * Serviço de Autenticação com Supabase
 * 
 * Este serviço encapsula toda a lógica de autenticação da aplicação,
 * incluindo login, registro, logout, gerenciamento de tokens e sincronização
 * com o backend.
 * 
 * Implementa o padrão Singleton para garantir uma única instância em toda a aplicação.
 * 
 * @module lib/services/supabaseAuthService
 */

import { supabase } from '@/config/supabase';
import type { User, AuthResult, BackendUserData } from '@/lib/types/auth';
import type { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Duração do cache de tokens em milissegundos (50 minutos)
 * Tokens do Supabase expiram em 60 minutos, então renovamos 10 minutos antes
 */
const TOKEN_CACHE_DURATION = 50 * 60 * 1000;

/**
 * Tempo de debounce para sincronização com backend (5 segundos)
 * Evita múltiplas chamadas simultâneas ao backend
 */
const SYNC_DEBOUNCE_TIME = 5000;

/**
 * Classe que gerencia toda a autenticação com Supabase
 * Implementa padrão Singleton
 */
class SupabaseAuthService {
  /** Token JWT atual armazenado em memória */
  private token: string | null;
  
  /** Usuário atual armazenado em memória */
  private user: User | null;
  
  /** Promise de sincronização em andamento (para debounce) */
  private syncPromise: Promise<User | undefined> | null;
  
  /** Timestamp da última sincronização */
  private lastSyncTime: number;

  /**
   * Construtor privado para implementar Singleton
   * Inicializa o serviço com dados do localStorage se disponíveis
   */
  constructor() {
    this.token = this.getToken();
    this.user = this.getUser();
    this.syncPromise = null;
    this.lastSyncTime = 0;
  }

  /**
   * Realiza login com email e senha
   * 
   * @param email - Email do usuário
   * @param password - Senha do usuário
   * @returns Promise com usuário e token
   * @throws Error com mensagem amigável em caso de falha
   * 
   * @example
   * ```typescript
   * try {
   *   const { user, token } = await supabaseAuthService.login('user@example.com', 'password123');
   *   console.log('Login bem-sucedido:', user.email);
   * } catch (error) {
   *   console.error('Erro no login:', error.message);
   * }
   * ```
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(this.getSupabaseErrorMessage(error.message));
      }

      if (!data.user || !data.session) {
        throw new Error('Falha ao obter dados de autenticação');
      }

      const userWithRole = await this.getUserWithRole(data.user);
      const token = data.session.access_token;
      
      // Armazenar localmente
      this.setToken(token);
      this.setUser(userWithRole);
      
      // Sincronizar com backend (não bloqueia o login)
      this.syncUserWithBackend(token).catch(error => {
        console.warn('Erro ao sincronizar usuário com backend:', error);
      });
      
      return { user: userWithRole, token };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Realiza login com Google OAuth
   * 
   * @param userId - ID do usuário original (opcional, para vincular contas)
   * @returns Promise que resolve quando o redirect é iniciado
   * @throws Error com mensagem amigável em caso de falha
   * 
   * @example
   * ```typescript
   * try {
   *   await supabaseAuthService.loginWithGoogle();
   *   // Usuário será redirecionado para Google
   * } catch (error) {
   *   console.error('Erro no login com Google:', error.message);
   * }
   * ```
   */
  async loginWithGoogle(userId?: string): Promise<void> {
    try {
      // Garantir que estamos no browser
      if (typeof window === 'undefined') {
        throw new Error('Login com Google só pode ser feito no browser');
      }

      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('[Auth Service] Iniciando login com Google, redirect:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
          ...(userId && {
            queryParams: { user_id: userId }
          })
        }
      });

      if (error) {
        console.error('[Auth Service] Erro no OAuth:', error);
        throw new Error(this.getSupabaseErrorMessage(error.message));
      }

      console.log('[Auth Service] OAuth iniciado com sucesso, URL:', data.url);
    } catch (error) {
      console.error('[Auth Service] Erro ao iniciar login com Google:', error);
      throw error;
    }
  }

  /**
   * Registra um novo usuário
   * 
   * @param email - Email do novo usuário
   * @param password - Senha do novo usuário
   * @param displayName - Nome de exibição do novo usuário
   * @returns Promise com usuário e token
   * @throws Error com mensagem amigável em caso de falha
   * 
   * @example
   * ```typescript
   * try {
   *   const { user, token } = await supabaseAuthService.register(
   *     'newuser@example.com',
   *     'securePassword123',
   *     'João Silva'
   *   );
   *   console.log('Registro bem-sucedido:', user.email);
   * } catch (error) {
   *   console.error('Erro no registro:', error.message);
   * }
   * ```
   */
  async register(email: string, password: string, displayName: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (error) {
        throw new Error(this.getSupabaseErrorMessage(error.message));
      }

      if (!data.user) {
        throw new Error('Falha ao criar usuário');
      }

      // Verificar se precisa confirmar email
      if (data.user && !data.user.email_confirmed_at && !data.session) {
        throw new Error('Por favor, verifique seu e-mail para confirmar a conta.');
      }

      const userWithRole = this.mapSupabaseUser(data.user);
      const token = data.session?.access_token || '';
      
      if (token) {
        this.setToken(token);
        this.setUser(userWithRole);
        
        // Sincronizar com backend (não bloqueia o registro)
        this.syncUserWithBackend(token).catch(error => {
          console.warn('Erro ao sincronizar usuário com backend:', error);
        });
      }
      
      return { user: userWithRole, token };
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  /**
   * Realiza logout do usuário
   * Limpa todos os dados de autenticação do localStorage e memória
   * 
   * @returns Promise que resolve quando o logout é concluído
   * 
   * @example
   * ```typescript
   * await supabaseAuthService.logout();
   * console.log('Logout realizado com sucesso');
   * ```
   */
  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erro no logout do Supabase:', error);
      }
      
      // Limpar dados locais
      this.setToken(null);
      this.setUser(null);
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('user_id');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('authToken');
      }
      
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Envia email de recuperação de senha
   * 
   * @param email - Email do usuário que esqueceu a senha
   * @returns Promise que resolve quando o email é enviado
   * @throws Error com mensagem amigável em caso de falha
   * 
   * @example
   * ```typescript
   * try {
   *   await supabaseAuthService.forgotPassword('user@example.com');
   *   console.log('Email de recuperação enviado');
   * } catch (error) {
   *   console.error('Erro ao enviar email:', error.message);
   * }
   * ```
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw new Error(this.getSupabaseErrorMessage(error.message));
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  /**
   * Obtém o token JWT atual do localStorage ou sessionStorage
   * 
   * @returns Token JWT ou null se não houver token
   * 
   * @example
   * ```typescript
   * const token = supabaseAuthService.getToken();
   * if (token) {
   *   console.log('Usuário autenticado');
   * }
   * ```
   */
  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  /**
   * Armazena o token JWT no localStorage
   * 
   * @param token - Token JWT para armazenar (null para remover)
   * @private
   */
  private setToken(token: string | null): void {
    if (typeof window === 'undefined') {
      this.token = token;
      return;
    }
    
    if (token) {
      localStorage.setItem('authToken', token);
      this.token = token;
    } else {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      this.token = null;
    }
  }

  /**
   * Obtém um token válido, renovando se necessário
   * 
   * Esta função verifica se há uma sessão ativa no Supabase e retorna
   * o token de acesso. Se o token estiver próximo de expirar, o Supabase
   * automaticamente o renova.
   * 
   * @returns Promise com token válido ou null se não autenticado
   * 
   * @example
   * ```typescript
   * const token = await supabaseAuthService.getValidToken();
   * if (token) {
   *   // Usar token para fazer requisição
   * }
   * ```
   */
  async getValidToken(): Promise<string | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Erro ao obter sessão:', error);
        throw error;
      }
      
      if (session) {
        this.setToken(session.access_token);
        return session.access_token;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter token válido:', error);
      return null;
    }
  }

  /**
   * Verifica se o usuário está autenticado
   * 
   * @returns true se há token e usuário, false caso contrário
   * 
   * @example
   * ```typescript
   * if (supabaseAuthService.isAuthenticated()) {
   *   console.log('Usuário está autenticado');
   * } else {
   *   console.log('Usuário não está autenticado');
   * }
   * ```
   */
  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  /**
   * Obtém o usuário atual do localStorage
   * 
   * @returns Usuário atual ou null se não houver usuário
   * 
   * @example
   * ```typescript
   * const user = supabaseAuthService.getUser();
   * if (user) {
   *   console.log('Usuário:', user.email);
   * }
   * ```
   */
  getUser(): User | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.error('Erro ao parsear usuário do localStorage:', error);
      return null;
    }
  }

  /**
   * Armazena o usuário no localStorage
   * 
   * @param user - Usuário para armazenar (null para remover)
   * @private
   */
  private setUser(user: User | null): void {
    if (typeof window === 'undefined') {
      this.user = user;
      return;
    }
    
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('user_id', user.uid);
      this.user = user;
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('user_id');
      this.user = null;
    }
  }

  /**
   * Sincroniza dados do usuário com o backend
   * 
   * Implementa debounce de 5 segundos para evitar múltiplas chamadas simultâneas.
   * Atualiza o role do usuário e outros dados do backend.
   * 
   * @param token - Token JWT para autenticação (opcional, usa o token atual se não fornecido)
   * @param force - Força a sincronização ignorando o debounce
   * @returns Promise com usuário atualizado ou undefined
   * 
   * @example
   * ```typescript
   * const updatedUser = await supabaseAuthService.syncUserWithBackend();
   * if (updatedUser) {
   *   console.log('Usuário sincronizado:', updatedUser.role);
   * }
   * ```
   */
  async syncUserWithBackend(token?: string, force: boolean = false): Promise<User | undefined> {
    const now = Date.now();
    
    // Implementar debounce
    if (!force && this.syncPromise && (now - this.lastSyncTime) < SYNC_DEBOUNCE_TIME) {
      return this.syncPromise;
    }

    this.lastSyncTime = now;
    this.syncPromise = this._performSync(token || this.getToken());
    
    try {
      const result = await this.syncPromise;
      return result;
    } finally {
      this.syncPromise = null;
    }
  }

  /**
   * Executa a sincronização com o backend
   * 
   * @param authToken - Token JWT para autenticação
   * @returns Promise com usuário atualizado ou undefined
   * @private
   */
  private async _performSync(authToken: string | null): Promise<User | undefined> {
    if (!authToken) {
      console.warn('Token não disponível para sincronização');
      return undefined;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(`${apiUrl}/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData && userData.user) {
          const currentUser = this.getUser();
          const updatedUser = { ...currentUser, ...userData.user } as User;
          this.setUser(updatedUser);
          return updatedUser;
        }
      } else {
        console.warn('Falha na sincronização com backend:', response.status);
      }
    } catch (error) {
      console.warn('Erro na sincronização com backend:', error);
    }
    
    return undefined;
  }

  /**
   * Obtém usuário do Supabase com role do backend
   * 
   * Faz uma requisição ao backend para obter o role do usuário.
   * Se falhar, usa 'student' como role padrão.
   * 
   * @param supabaseUser - Usuário do Supabase
   * @returns Promise com usuário mapeado incluindo role
   * 
   * @example
   * ```typescript
   * const user = await supabaseAuthService.getUserWithRole(supabaseUser);
   * console.log('Role do usuário:', user.role);
   * ```
   */
  async getUserWithRole(supabaseUser: SupabaseUser): Promise<User> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        console.warn('Token não disponível para obter role');
        return {
          ...this.mapSupabaseUser(supabaseUser),
          role: 'student'
        };
      }

      const response = await fetch(`${apiUrl}/user/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData: BackendUserData = await response.json();
        return {
          ...this.mapSupabaseUser(supabaseUser),
          role: userData.role || 'student'
        };
      } else {
        console.warn('Falha ao obter role do backend, usando role padrão');
        return {
          ...this.mapSupabaseUser(supabaseUser),
          role: 'student'
        };
      }
    } catch (error) {
      console.error('Erro ao obter role do usuário:', error);
      return {
        ...this.mapSupabaseUser(supabaseUser),
        role: 'student'
      };
    }
  }

  /**
   * Mapeia usuário do Supabase para o formato da aplicação
   * 
   * @param user - Usuário do Supabase
   * @returns Usuário no formato da aplicação
   * 
   * @example
   * ```typescript
   * const mappedUser = supabaseAuthService.mapSupabaseUser(supabaseUser);
   * console.log('Usuário mapeado:', mappedUser);
   * ```
   */
  mapSupabaseUser(user: SupabaseUser): User {
    return {
      uid: user.id,
      email: user.email || '',
      displayName: user.user_metadata?.display_name || user.email || 'Usuário',
      photoURL: user.user_metadata?.photoURL || user.user_metadata?.avatar_url || null,
      emailVerified: !!user.email_confirmed_at,
      role: 'student' // Será sobrescrito pelo getUserWithRole
    };
  }

  /**
   * Converte mensagens de erro do Supabase para português
   * 
   * @param errorMessage - Mensagem de erro original do Supabase
   * @returns Mensagem de erro amigável em português
   * @private
   */
  private getSupabaseErrorMessage(errorMessage: string): string {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('invalid login credentials')) {
      return 'E-mail ou senha incorretos. Por favor, tente novamente.';
    }
    if (lowerError.includes('email not confirmed')) {
      return 'Por favor, confirme seu e-mail antes de fazer login.';
    }
    if (lowerError.includes('user not found')) {
      return 'Usuário não encontrado. Verifique seu e-mail ou registre-se.';
    }
    if (lowerError.includes('email already registered') || lowerError.includes('already been registered')) {
      return 'Este e-mail já está em uso por outra conta.';
    }
    if (lowerError.includes('password should be at least')) {
      return 'Senha muito fraca. Use pelo menos 6 caracteres.';
    }
    if (lowerError.includes('network')) {
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
    
    return errorMessage || 'Ocorreu um erro. Por favor, tente novamente.';
  }
}

/**
 * Instância única do serviço de autenticação (Singleton)
 * Use esta instância em toda a aplicação
 * 
 * @example
 * ```typescript
 * import { supabaseAuthService } from '@/lib/services/supabaseAuthService';
 * 
 * // Login
 * const { user, token } = await supabaseAuthService.login('email@example.com', 'password');
 * 
 * // Logout
 * await supabaseAuthService.logout();
 * ```
 */
export const supabaseAuthService = new SupabaseAuthService();
