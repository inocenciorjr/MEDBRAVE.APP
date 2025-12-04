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

// Helper para ler cookie
function getCookieValue(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Helper para ler do IndexedDB
async function getFromIndexedDB(): Promise<{ token: string | null; user: string | null; userId: string | null }> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('medbrave-auth', 1);
      request.onerror = () => resolve({ token: null, user: null, userId: null });
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('session')) {
          resolve({ token: null, user: null, userId: null });
          return;
        }
        const tx = db.transaction('session', 'readonly');
        const store = tx.objectStore('session');
        const results: { token: string | null; user: string | null; userId: string | null } = { token: null, user: null, userId: null };
        
        const tokenReq = store.get('authToken');
        tokenReq.onsuccess = () => { results.token = tokenReq.result?.value || null; };
        
        const userReq = store.get('user');
        userReq.onsuccess = () => { results.user = userReq.result?.value || null; };
        
        const userIdReq = store.get('user_id');
        userIdReq.onsuccess = () => { results.userId = userIdReq.result?.value || null; };
        
        tx.oncomplete = () => resolve(results);
        tx.onerror = () => resolve({ token: null, user: null, userId: null });
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session', { keyPath: 'key' });
        }
      };
    } catch {
      resolve({ token: null, user: null, userId: null });
    }
  });
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  token: string | null;
  isAuthenticated: boolean;
  authFailed: boolean; // Indica falha definitiva na autenticação
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
  const [authFailed, setAuthFailed] = useState(false);
  
  // Refs para controle de concorrência e estado
  const isRecoveringRef = useRef(false);
  const initAttemptedRef = useRef(false);
  const recoveryAttemptsRef = useRef(0); // Contador para evitar loop infinito

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
        // 1. Verificar localStorage primeiro (mais rápido), com fallback para sessionStorage (Edge Mobile fix)
        let storedUser = localStorage.getItem('user');
        let storedToken = localStorage.getItem('authToken');
        
        // Fallback 1: sessionStorage
        if (!storedUser || !storedToken) {
          const sessionUser = sessionStorage.getItem('user');
          const sessionToken = sessionStorage.getItem('authToken');
          if (sessionUser && sessionToken) {
            console.log('[AuthContext] Recuperando do sessionStorage');
            storedUser = sessionUser;
            storedToken = sessionToken;
            localStorage.setItem('user', sessionUser);
            localStorage.setItem('authToken', sessionToken);
            const userId = sessionStorage.getItem('user_id');
            if (userId) localStorage.setItem('user_id', userId);
          }
        }
        
        // Fallback 2: IndexedDB (mais robusto para Edge Mobile)
        if (!storedUser || !storedToken) {
          try {
            const idbData = await getFromIndexedDB();
            if (idbData.token && idbData.user) {
              console.log('[AuthContext] Recuperando do IndexedDB');
              storedUser = idbData.user;
              storedToken = idbData.token;
              localStorage.setItem('user', idbData.user);
              localStorage.setItem('authToken', idbData.token);
              if (idbData.userId) localStorage.setItem('user_id', idbData.userId);
            }
          } catch (e) {
            console.log('[AuthContext] IndexedDB não disponível');
          }
        }
        
        // Fallback 3: Cookies no cliente
        if (!storedUser || !storedToken) {
          const cookieToken = getCookieValue('sb-access-token');
          if (cookieToken) {
            console.log('[AuthContext] Token encontrado em cookie, tentando recuperar sessão...');
            storedToken = cookieToken;
          }
        }
        
        console.log('[AuthContext] storage - user:', storedUser ? 'presente' : 'ausente', 'token:', storedToken ? 'presente' : 'ausente');

        if (storedUser && storedToken) {
          try {
            const parsedUser = JSON.parse(storedUser) as User;
            setUser(parsedUser);
            setAuthFailed(false);
            setLoading(false);
            console.log('[AuthContext] Usuário restaurado do storage');
            
            // Verificar se é Edge Mobile - se for, NÃO fazer validação em background imediatamente
            // pois isso causa loops e delays desnecessários
            const isEdgeMobile = /Edg|Edge/i.test(navigator.userAgent) && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
            
            if (isEdgeMobile) {
              console.log('[AuthContext] Edge Mobile detectado, pulando validação em background');
              // No Edge Mobile, confiar no storage e só validar se houver erro em alguma operação
              return;
            }
            
            // Em outros navegadores, verificar em background (não bloqueia UI)
            setTimeout(() => validateSessionInBackground(), 2000);
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
        setAuthFailed(true);
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
      
      // Verificar se os cookies existem no cliente primeiro
      const clientCookies = document.cookie;
      const hasAccessToken = clientCookies.includes('sb-access-token');
      const hasRefreshToken = clientCookies.includes('sb-refresh-token');
      console.log('[AuthContext] Cookies no cliente - access:', hasAccessToken, 'refresh:', hasRefreshToken);
      
      if (!hasAccessToken && !hasRefreshToken) {
        console.log('[AuthContext] Nenhum cookie de sessão encontrado no cliente');
        clearSession();
        setLoading(false);
        isRecoveringRef.current = false;
        return;
      }
      
      try {
        const res = await fetch('/api/auth/recover-session');
        
        if (res.ok) {
          const data = await res.json();
          if (data.access_token && data.user) {
            console.log('[AuthContext] Sessão recuperada dos cookies!');
            
            // Restaurar sessão no Supabase SDK
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            });

            if (sessionError) {
              console.error('[AuthContext] Erro ao restaurar sessão no SDK:', sessionError);
              throw sessionError;
            }

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
        // Falhou recuperação - marcar como falha definitiva
        clearSession();
      } catch (error) {
        console.error('[AuthContext] Erro na recuperação:', error);
        clearSession();
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
      setAuthFailed(false);
      recoveryAttemptsRef.current = 0; // Reset contador de tentativas
      window.dispatchEvent(new CustomEvent('auth-token-updated', {
        detail: { token }
      }));
    };

    const clearSession = () => {
      console.log('[AuthContext] Limpando sessão');
      setUser(null);
      setAuthFailed(true);
      localStorage.removeItem('user');
      localStorage.removeItem('user_id');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      sessionStorage.removeItem('authToken');
    };
    
    // Listener para evento de token atualizado (vindo do callback ou outros lugares)
    const handleTokenUpdated = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const token = customEvent.detail?.token;
      console.log('[AuthContext] Evento auth-token-updated recebido');
      
      if (token) {
        // Tentar restaurar usuário do localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser) as User;
            setUser(parsedUser);
            setAuthFailed(false);
            setLoading(false);
            console.log('[AuthContext] Usuário restaurado via evento');
          } catch (e) {
            console.error('[AuthContext] Erro ao parsear usuário do evento');
          }
        }
      }
    };
    
    window.addEventListener('auth-token-updated', handleTokenUpdated);

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
        // Só processar se não estivermos tentando recuperar E se não já falhamos
        if (!isRecoveringRef.current && !authFailed) {
           // Verificar se o localStorage ainda existe (pode ter sido limpo pelo logout)
           const hasLocalToken = localStorage.getItem('authToken');
           
           if (hasLocalToken && recoveryAttemptsRef.current < 2) {
             recoveryAttemptsRef.current++;
             console.log(`[AuthContext] SIGNED_OUT detectado, tentativa de recuperação ${recoveryAttemptsRef.current}/2...`);
             tryRecoverSession();
           } else {
             // Sem token ou já tentamos demais - limpar e parar
             console.log('[AuthContext] SIGNED_OUT - limpando sessão (sem token ou tentativas esgotadas)');
             clearSession();
           }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('auth-token-updated', handleTokenUpdated);
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
      await supabaseAuthService.forgotPassword(email);
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
      authFailed,
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
