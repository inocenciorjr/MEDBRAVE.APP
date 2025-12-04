'use client';

/**
 * Context de Autenticação
 * 
 * Gerencia o estado de autenticação em toda a aplicação React.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { supabaseAuthService } from '@/lib/services/supabaseAuthService';
import type { User } from '@/lib/types/auth';

const supabase = createClient();

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processingRef = React.useRef(false);
  const lastProcessedRef = React.useRef<string | null>(null);
  const lastProcessedTimeRef = React.useRef<number>(0);

  useEffect(() => {
    // Ignorar páginas de auth
    const currentPath = window.location.pathname;
    console.log('[AuthContext] Iniciando, path:', currentPath);
    
    if (currentPath.startsWith('/auth/')) {
      console.log('[AuthContext] Página de auth, ignorando');
      setLoading(false);
      return;
    }

    // Timeout de segurança
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Timeout de segurança: forçando loading = false');
        setLoading(false);
      }
    }, 2000);

    // Restaurar usuário do localStorage
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    console.log('[AuthContext] localStorage - user:', storedUser ? 'presente' : 'ausente', 'token:', token ? 'presente' : 'ausente');

    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        console.log('[AuthContext] Usuário restaurado do localStorage:', parsedUser.email);
        setUser(parsedUser);
        setLoading(false);
        clearTimeout(safetyTimeout);
      } catch (error) {
        console.error('Erro ao recuperar usuário do localStorage:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
      }
    } else {
      console.log('[AuthContext] Sem usuário no localStorage');
    }

    // Verificar sessão atual
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && !user) {
        const basicUser = supabaseAuthService.mapSupabaseUser(session.user);
        setUser(basicUser);
        setLoading(false);
        clearTimeout(safetyTimeout);

        localStorage.setItem('user', JSON.stringify(basicUser));
        localStorage.setItem('user_id', basicUser.uid);
        if (session.access_token) {
          localStorage.setItem('authToken', session.access_token);
          window.dispatchEvent(new CustomEvent('auth-token-updated', {
            detail: { token: session.access_token }
          }));
        }
      } else if (!session) {
        // Tentar recuperar sessão dos cookies (fallback para Edge Mobile)
        if (!localStorage.getItem('user')) {
          try {
            console.log('[AuthContext] Tentando recuperar sessão dos cookies...');
            const res = await fetch('/api/auth/recover-session');
            if (res.ok) {
              const data = await res.json();
              console.log('[AuthContext] Sessão recuperada dos cookies!');
              
              // Restaurar sessão no Supabase
              const { data: { session: newSession } } = await supabase.auth.setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
              });

              if (newSession?.user) {
                const basicUser = supabaseAuthService.mapSupabaseUser(newSession.user);
                setUser(basicUser);
                
                localStorage.setItem('user', JSON.stringify(basicUser));
                localStorage.setItem('user_id', basicUser.uid);
                localStorage.setItem('authToken', data.access_token);
                
                window.dispatchEvent(new CustomEvent('auth-token-updated', {
                  detail: { token: data.access_token }
                }));

                // Buscar role em background
                supabaseAuthService.getUserWithRole(newSession.user)
                  .then((mappedUser) => {
                    setUser(mappedUser);
                    localStorage.setItem('user', JSON.stringify(mappedUser));
                  });
              }
            } else {
              console.log('[AuthContext] Não foi possível recuperar sessão dos cookies');
            }
          } catch (e) {
            console.error('[AuthContext] Falha ao recuperar sessão:', e);
          }
        }

        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    });

    // Listener de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthContext] onAuthStateChange:', _event, session ? 'com sessão' : 'sem sessão');
      
      if (_event === 'TOKEN_REFRESHED' && session?.access_token) {
        console.log('🔄 [Auth] Token renovado automaticamente');
        localStorage.setItem('authToken', session.access_token);
        window.dispatchEvent(new CustomEvent('auth-token-updated', {
          detail: { token: session.access_token }
        }));
        return;
      }

      // IMPORTANTE: Se já temos usuário no localStorage, não limpar por causa do SDK
      const hasLocalUser = localStorage.getItem('user') && localStorage.getItem('authToken');
      
      if (session?.user) {
        if (processingRef.current) return;

        const now = Date.now();
        if (lastProcessedRef.current === session.user.id && now - lastProcessedTimeRef.current < 2000) {
          return;
        }

        processingRef.current = true;
        lastProcessedRef.current = session.user.id;
        lastProcessedTimeRef.current = now;

        try {
          const basicUser = supabaseAuthService.mapSupabaseUser(session.user);
          setUser(basicUser);
          setLoading(false);

          localStorage.setItem('user', JSON.stringify(basicUser));
          localStorage.setItem('user_id', basicUser.uid);

          if (session.access_token) {
            localStorage.setItem('authToken', session.access_token);
            window.dispatchEvent(new CustomEvent('auth-token-updated', {
              detail: { token: session.access_token }
            }));
          }

          // Buscar role em background
          supabaseAuthService.getUserWithRole(session.user)
            .then((mappedUser) => {
              setUser(mappedUser);
              localStorage.setItem('user', JSON.stringify(mappedUser));
            })
            .finally(() => {
              processingRef.current = false;
            });
        } catch (error) {
          processingRef.current = false;
          const fallbackUser = supabaseAuthService.mapSupabaseUser(session.user);
          setUser(fallbackUser);
          localStorage.setItem('user', JSON.stringify(fallbackUser));
          localStorage.setItem('user_id', fallbackUser.uid);

          if (session.access_token) {
            localStorage.setItem('authToken', session.access_token);
            window.dispatchEvent(new CustomEvent('auth-token-updated', {
              detail: { token: session.access_token }
            }));
          }
          setLoading(false);
        }
      } else {
        // Só limpar se não temos usuário no localStorage
        // O SDK pode não ter a sessão mas nós salvamos manualmente
        if (!hasLocalUser) {
          console.log('[AuthContext] Limpando sessão (sem usuário local)');
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('user_id');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          sessionStorage.removeItem('authToken');
        } else {
          console.log('[AuthContext] Mantendo sessão local (SDK sem sessão mas localStorage tem)');
        }
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

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
        window.dispatchEvent(new CustomEvent('auth-token-updated', {
          detail: { token: result.token }
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await supabaseAuthService.loginWithGoogle();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login com Google';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

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
        window.dispatchEvent(new CustomEvent('auth-token-updated', {
          detail: { token: result.token }
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao registrar';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

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

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await supabaseAuthService.forgotPassword(email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao recuperar senha';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}
