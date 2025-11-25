'use client';

/**
 * Context de Autenticação
 * 
 * Este módulo fornece um Context Provider para gerenciar o estado de autenticação
 * em toda a aplicação React. Inclui:
 * - Estado de usuário, loading e error
 * - Métodos de login, registro e logout
 * - Listener de mudanças de estado do Supabase
 * - Cache inicial de usuário do localStorage
 * - Sincronização automática com backend
 * 
 * @module lib/contexts/AuthContext
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/config/supabase';
import { supabaseAuthService } from '@/lib/services/supabaseAuthService';
import type { User } from '@/lib/types/auth';

/**
 * Interface do valor do contexto de autenticação
 */
interface AuthContextValue {
  /** Usuário atualmente autenticado (null se não autenticado) */
  user: User | null;
  
  /** Indica se o estado de autenticação está sendo carregado */
  loading: boolean;
  
  /** Mensagem de erro de autenticação (null se não houver erro) */
  error: string | null;
  
  /** Token JWT atual (null se não autenticado) */
  token: string | null;
  
  /** Indica se há um usuário autenticado */
  isAuthenticated: boolean;
  
  /** Realiza login com email e senha */
  login: (email: string, password: string) => Promise<void>;
  
  /** Realiza login com Google OAuth */
  loginWithGoogle: () => Promise<void>;
  
  /** Registra um novo usuário */
  register: (email: string, password: string, displayName: string) => Promise<void>;
  
  /** Realiza logout do usuário */
  logout: () => Promise<void>;
  
  /** Envia email de recuperação de senha */
  forgotPassword: (email: string) => Promise<void>;
  
  /** Atualiza dados do usuário */
  updateUser: (userData: User) => void;
}

/**
 * Contexto de autenticação
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Props do AuthProvider
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider do contexto de autenticação
 * 
 * Gerencia o estado global de autenticação e fornece métodos para
 * login, logout, registro, etc. Implementa listener de mudanças de
 * estado do Supabase e sincronização com backend.
 * 
 * @param props - Props do componente
 * @returns Provider component
 * 
 * @example
 * ```typescript
 * // Em app/layout.tsx ou _app.tsx
 * import { AuthProvider } from '@/lib/contexts/AuthContext';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <AuthProvider>
 *       {children}
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processingRef = React.useRef(false); // Flag para prevenir processamento duplicado
  const lastProcessedRef = React.useRef<string | null>(null); // Último usuário processado
  const lastProcessedTimeRef = React.useRef<number>(0); // Timestamp do último processamento

  /**
   * Effect para inicializar autenticação e listener de mudanças
   */
  useEffect(() => {
    // Timeout de segurança: se após 2 segundos ainda estiver loading, força false
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Timeout de segurança: forçando loading = false');
        setLoading(false);
      }
    }, 2000);
    
    // Tentar restaurar usuário do localStorage primeiro (cache inicial)
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        setLoading(false); // Para de carregar se há usuário no cache
        clearTimeout(safetyTimeout); // Cancelar timeout se já carregou
      } catch (error) {
        console.error('Erro ao recuperar usuário do localStorage:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
      }
    }
    
    // Verificar sessão atual imediatamente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !user) {
        const basicUser = supabaseAuthService.mapSupabaseUser(session.user);
        setUser(basicUser);
        setLoading(false);
        clearTimeout(safetyTimeout);
        
        localStorage.setItem('user', JSON.stringify(basicUser));
        localStorage.setItem('user_id', basicUser.uid);
        if (session.access_token) {
          localStorage.setItem('authToken', session.access_token);
        }
      } else if (!session) {
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    });
    
    // Listener de mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // ✅ Ignorar eventos TOKEN_REFRESHED para evitar loops
      if (_event === 'TOKEN_REFRESHED') {
        return;
      }
      
      if (session?.user) {
        // Prevenir processamento duplicado
        if (processingRef.current) {
          return;
        }
        
        // Debounce: ignorar se processou o mesmo usuário há menos de 2 segundos
        const now = Date.now();
        if (lastProcessedRef.current === session.user.id && now - lastProcessedTimeRef.current < 2000) {
          return;
        }
        
        processingRef.current = true;
        lastProcessedRef.current = session.user.id;
        lastProcessedTimeRef.current = now;
        
        try {
          
          // Usar mapeamento básico imediatamente para não bloquear a UI
          const basicUser = supabaseAuthService.mapSupabaseUser(session.user);
          setUser(basicUser);
          setLoading(false); // Liberar UI imediatamente
          
          // Salvar no localStorage
          localStorage.setItem('user', JSON.stringify(basicUser));
          localStorage.setItem('user_id', basicUser.uid);
          
          // Salvar token
          if (session.access_token) {
            localStorage.setItem('authToken', session.access_token);
          }
          
          // Buscar role do backend em background (não bloqueia UI)
          supabaseAuthService.getUserWithRole(session.user)
            .then((mappedUser) => {
              setUser(mappedUser);
              localStorage.setItem('user', JSON.stringify(mappedUser));
            })
            .finally(() => {
              processingRef.current = false; // Liberar flag
            });
        } catch (error) {
          processingRef.current = false; // Liberar flag em caso de erro
          
          // Fallback: usar mapeamento básico
          const fallbackUser = supabaseAuthService.mapSupabaseUser(session.user);
          setUser(fallbackUser);
          localStorage.setItem('user', JSON.stringify(fallbackUser));
          localStorage.setItem('user_id', fallbackUser.uid);
          
          // Salvar token mesmo com fallback
          if (session.access_token) {
            localStorage.setItem('authToken', session.access_token);
          }
          
          setLoading(false);
        }
      } else {
        // Limpar dados se não há usuário
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('user_id');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('authToken');
        
        // Garantir que loading seja false
        setLoading(false);
      }
    });
    
    // Cleanup: cancelar inscrição ao desmontar
    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  /**
   * Realiza login com email e senha
   */
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await supabaseAuthService.login(email, password);
      setUser(result.user);
      
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('user_id', result.user.uid);
      
      if (result.token) {
        localStorage.setItem('authToken', result.token);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(errorMessage);
      console.error('Erro ao fazer login:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Realiza login com Google OAuth
   */
  const loginWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseAuthService.loginWithGoogle();
      // O resultado será processado pelo onAuthStateChange
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login com Google';
      setError(errorMessage);
      console.error('Erro ao fazer login com Google:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Registra um novo usuário
   */
  const register = async (email: string, password: string, displayName: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await supabaseAuthService.register(email, password, displayName);
      setUser(result.user);
      
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('user_id', result.user.uid);
      
      if (result.token) {
        localStorage.setItem('authToken', result.token);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao registrar';
      setError(errorMessage);
      console.error('Erro ao registrar:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Realiza logout do usuário
   */
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      
      await supabaseAuthService.logout();
      setUser(null);
      
      localStorage.removeItem('user');
      localStorage.removeItem('user_id');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      sessionStorage.removeItem('authToken');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envia email de recuperação de senha
   */
  const forgotPassword = async (email: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await supabaseAuthService.forgotPassword(email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao recuperar senha';
      setError(errorMessage);
      console.error('Erro ao recuperar senha:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza dados do usuário
   */
  const updateUser = (userData: User): void => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('user_id', userData.uid);
  };
  
  const value: AuthContextValue = {
    user,
    loading,
    error,
    token: typeof window !== 'undefined' ? localStorage.getItem('authToken') : null,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    register,
    logout,
    forgotPassword,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para usar o contexto de autenticação
 * 
 * @returns Valor do contexto de autenticação
 * @throws Error se usado fora do AuthProvider
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { user, login, logout } = useAuth();
 *   
 *   if (!user) {
 *     return <LoginForm onLogin={login} />;
 *   }
 *   
 *   return (
 *     <div>
 *       <p>Bem-vindo, {user.displayName}!</p>
 *       <button onClick={logout}>Sair</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
}
