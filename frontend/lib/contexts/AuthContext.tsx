'use client';

/**
 * Context de Autenticação
 * 
 * Gerencia o estado de autenticação em toda a aplicação React.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  
  // Refs para controle de concorrência e estado
  const processingRef = useRef(false);
  const lastProcessedRef = useRef<string | null>(null);
  const lastProcessedTimeRef = useRef<number>(0);
  const isRecoveringRef = useRef(false);
  const initAttemptedRef = useRef(false);

  useEffect(() => {
    // Ignorar páginas de auth
    const currentPath = window.location.pathname;
    console.log('[AuthContext] Iniciando, path:', currentPath);
    
    if (currentPath.startsWith('/auth/')) {
      console.log('[AuthContext] Página de auth, ignorando');
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      if (initAttemptedRef.current) return;
      initAttemptedRef.current = true;

      try {
        // 1. Verificar localStorage primeiro (mais rápido)
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('authToken');
        
        console.log('[AuthContext] localStorage - user:', storedUser ? 'presente' : 'ausente', 'token:', storedToken ? 'presente' : 'ausente');

        if (storedUser && storedToken) {
          try {
            const parsedUser = JSON.parse(storedUser) as User;
            setUser(parsedUser);
            setLoading(false);
            console.log('[AuthContext] Usuário restaurado do localStorage');
            
            // Ainda assim, verificamos a sessão em background para garantir validade
            validateSessionInBackground();
            return;
          } catch (e) {
            console.error('[AuthContext] Erro ao parsear usuário do storage');
          }
        }

        // 2. Se não tem localStorage, verificar sessão do Supabase SDK
        console.log('[AuthContext] Verificando sessão do Supabase...');
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          await handleSessionFound(session);
        } else {
          // 3. Se não tem sessão no SDK, tentar recuperação via Cookies (Edge Mobile fix)
          await tryRecoverSession();
        }
      } catch (error) {
        console.error('[AuthContext] Erro fatal na inicialização:', error);
        setLoading(false);
      }
    };

    const validateSessionInBackground = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Se localStorage diz que tem user, mas SDK diz que não...
        // Talvez o token expirou ou é um caso de Edge Mobile
        console.log('[AuthContext] Validação falhou (sem sessão SDK), tentando recuperar...');
        await tryRecoverSession();
      } else {
        // Sessão válida, atualizar dados se necessário
        if (session.access_token !== localStorage.getItem('authToken')) {
           handleSessionFound(session);
        }
      }
    };

    const tryRecoverSession = async () => {
      // Evitar loop de recuperação
      if (isRecoveringRef.current) return;
      isRecoveringRef.current = true;
      
      console.log('[AuthContext] Tentando recuperar sessão dos cookies...');
      
      try {
        const res = await fetch('/api/auth/recover-session');
        
        if (res.ok) {
          const data = await res.json();
          if (data.access_token && data.user) {
            console.log('[AuthContext] Sessão recuperada com sucesso!');
            
            // Restaurar sessão no Supabase SDK
            await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            });

            // Configurar usuário
            const basicUser = supabaseAuthService.mapSupabaseUser(data.user);
            
            // Salvar tudo
            saveSessionToStorage(basicUser, data.access_token);
            setUser(basicUser);
            
            // Buscar role atualizada
            updateUserRole(data.user);
            
            setLoading(false);
            isRecoveringRef.current = false;
            return;
          }
        }
        
        console.log('[AuthContext] Não foi possível recuperar sessão dos cookies (401 ou sem dados)');
        // Se falhou recuperação e não tínhamos localStorage, estamos deslogados
        if (!localStorage.getItem('user')) {
           clearSession();
        }
      } catch (error) {
        console.error('[AuthContext] Erro na recuperação:', error);
      } finally {
        setLoading(false);
        isRecoveringRef.current = false;
      }
    };

    const handleSessionFound = async (session: any) => {
      console.log('[AuthContext] Sessão encontrada via SDK');
      const basicUser = supabaseAuthService.mapSupabaseUser(session.user);
      setUser(basicUser);
      saveSessionToStorage(basicUser, session.access_token);
      setLoading(false);
      
      // Buscar role
      updateUserRole(session.user);
    };

    const updateUserRole = async (supabaseUser: any) => {
       try {
         const mappedUser = await supabaseAuthService.getUserWithRole(supabaseUser);
         setUser(mappedUser);
         localStorage.setItem('user', JSON.stringify(mappedUser));
       } catch (e) {
         console.error('[AuthContext] Erro ao atualizar role:', e);
       }
    };

    const saveSessionToStorage = (user: User, token: string) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('user_id', user.uid);
      localStorage.setItem('authToken', token);
      window.dispatchEvent(new CustomEvent('auth-token-updated', {
        detail: { token }
      }));
    };

    const clearSession = () => {
      console.log('[AuthContext] Limpando sessão');
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('user_id');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      sessionStorage.removeItem('authToken');
    };

    // Inicializar
    initializeAuth();

    // Listener de eventos do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] Evento: ${event}`, session ? 'com sessão' : 'sem sessão');

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
           handleSessionFound(session);
        }
      } else if (event === 'SIGNED_OUT') {
        // Só limpar se não estivermos tentando recuperar
        if (!isRecoveringRef.current) {
           // Se temos localStorage, vamos tentar recuperar antes de aceitar o SIGNED_OUT
           // (exceto se foi um logout explícito, mas aqui não sabemos. 
           // Assumimos que se o usuário clicou em logout, o app chamou logout() que limpa tudo)
           
           // Verificar se o localStorage ainda existe (pode ter sido limpo pelo logout)
           if (localStorage.getItem('authToken')) {
             console.log('[AuthContext] SIGNED_OUT detectado mas temos token local. Tentando recuperar...');
             tryRecoverSession();
           } else {
             clearSession();
           }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
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
        window.dispatchEvent(new CustomEvent('auth-token-updated', { detail: { token: result.token } }));
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
        window.dispatchEvent(new CustomEvent('auth-token-updated', { detail: { token: result.token } }));
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
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('user_id');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      sessionStorage.removeItem('authToken');
      setLoading(false);
      // Forçar refresh da página para limpar estados globais
      window.location.href = '/login';
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      setLoading(true);
      await supabaseAuthService.resetPassword(email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar email de recuperação';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      token: user ? localStorage.getItem('authToken') : null,
      isAuthenticated: !!user,
      login,
      loginWithGoogle,
      register,
      logout,
      forgotPassword,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
