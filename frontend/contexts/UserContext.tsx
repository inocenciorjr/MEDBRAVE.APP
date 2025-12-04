'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSessionMonitor } from '@/lib/hooks/useSessionMonitor';
import { useActivityTracker } from '@/lib/hooks/useActivityTracker';
import { SessionRevokedModal } from '@/components/auth/SessionRevokedModal';

interface UserPlan {
  id: string;
  planId: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string | null;
  isTrial?: boolean;
}

interface User {
  id: string;
  email: string;
  role: string;
  displayName: string;
  photoURL: string | null;
  activePlan: UserPlan | null;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  authFailed: boolean; // Novo estado para indicar falha definitiva
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  
  // Monitorar sessão em tempo real
  const { showRevokedModal, closeRevokedModal } = useSessionMonitor(user?.id);
  
  // Rastrear atividade em tempo real
  useActivityTracker(user?.id || null, sessionId);

  const fetchUser = async (retryCount = 0) => {
    try {
      // Verificar se estamos no client-side
      if (typeof window === 'undefined') return;

      // 1. Tentar obter token do localStorage (que pode ter sido colocado pelo AuthContext)
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      // Se tiver token e user no localStorage, usar dados básicos enquanto busca atualizados
      if (storedToken && storedUser && !user) {
         try {
            const parsedUser = JSON.parse(storedUser);
            // Não setamos loading false aqui para não piscar, mas poderíamos
         } catch (e) {}
      }

      let token = storedToken;
      let sessionUser = null;

      // Se não tem token no storage, tentar pegar do Supabase SDK
      if (!token) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          token = session.access_token;
          sessionUser = session.user;
        }
      }

      if (!token) {
        // Se ainda não tem token, pode ser que o AuthContext esteja recuperando via cookies (Edge Mobile)
        // Tentar novamente após um delay maior
        if (retryCount < 3) {
          // Aumentar o tempo de espera progressivamente: 1s, 2s, 3s
          const delay = 1000 * (retryCount + 1);
          console.log(`[UserContext] Token não encontrado, tentando novamente em ${delay}ms (tentativa ${retryCount + 1}/3)`);
          setTimeout(() => fetchUser(retryCount + 1), delay);
          return;
        }
        
        console.log('[UserContext] Token não encontrado após tentativas. Usuário não autenticado.');
        setUser(null);
        setLoading(false);
        setAuthFailed(true);
        return;
      }

      // Se temos token, tentar restaurar a sessão do SDK se estiver vazia
      // Isso garante que realtime e storage funcionem
      // NOTA: No Edge Mobile, PULAR isso pois setSession trava
      const isEdgeMobile = /Edg|Edge/i.test(navigator.userAgent) && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
      
      if (typeof window !== 'undefined' && !isEdgeMobile) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession && token) {
           console.log('[UserContext] Restaurando sessão do SDK com token encontrado...');
           const storedSessionStr = localStorage.getItem(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1]}-auth-token`);
           
           if (storedSessionStr) {
              try {
                const storedSession = JSON.parse(storedSessionStr);
                if (storedSession.refresh_token) {
                   await supabase.auth.setSession({
                      access_token: token,
                      refresh_token: storedSession.refresh_token
                   });
                }
              } catch(e) {}
           }
        }
      } else if (isEdgeMobile) {
        console.log('[UserContext] Edge Mobile detectado, pulando restauração do SDK');
      }

      // Se temos token, buscar dados completos do usuário
      // No Edge Mobile, usar proxy do Next.js para evitar problemas de CORS
      const apiUrl = isEdgeMobile 
        ? '/api/user/me'  // Proxy local - mesmo domínio
        : `${process.env.NEXT_PUBLIC_API_URL}/user/me`;  // API externa
      
      console.log('[UserContext] Buscando usuário de:', apiUrl, isEdgeMobile ? '(via proxy)' : '(direto)');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      console.log('[UserContext] Resposta recebida:', response.status);

      if (!response.ok) {
        console.error('❌ [UserContext] Erro ao buscar dados do usuário:', response.status, response.statusText);
        // Se der 401, talvez o token expirou. O AuthContext deve lidar com isso, mas aqui limpamos.
        if (response.status === 401) {
           setUser(null);
        }
        setLoading(false);
        return;
      }

      const userData = await response.json();
      
      if (!userData) {
        console.error('❌ [UserContext] Usuário não encontrado no banco');
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Construir objeto de usuário final
      const finalUser = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        displayName: userData.displayName || sessionUser?.email?.split('@')[0] || userData.email?.split('@')[0] || 'Usuário',
        photoURL: userData.photoURL || sessionUser?.user_metadata?.avatar_url || null,
        activePlan: userData.activePlan || null,
      };

      setUser(finalUser);
      setLoading(false);

      // Extrair session_id se disponível (para tracking)
      if (token.includes('.')) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setSessionId(payload.session_id || null);
        } catch (e) { }
      }

    } catch (error) {
      console.error('❌ [UserContext] Erro ao buscar usuário:', error);
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    
    // Adicionar listener para mudanças de autenticação
    const setupAuthListener = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          fetchUser();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        }
      });

      // Escutar evento customizado do AuthContext (útil para Edge Mobile recovery)
      const handleTokenUpdate = (e: Event) => {
         console.log('[UserContext] Token atualizado via evento, recarregando user...');
         fetchUser();
      };
      window.addEventListener('auth-token-updated', handleTokenUpdate);
      
      return () => {
        subscription.unsubscribe();
        window.removeEventListener('auth-token-updated', handleTokenUpdate);
      };
    };
    
    setupAuthListener();
    
    // Configurar tracking de atividade e timeout de sessão
    const setupSessionTimeout = async () => {
      const { setupActivityTracking, cleanupActivityTracking } = await import('@/lib/utils/sessionTimeout');
      setupActivityTracking();
      
      return () => {
        cleanupActivityTracking();
      };
    };
    
    setupSessionTimeout();
  }, []);

  const refreshUser = async () => {
    setLoading(true);
    await fetchUser();
  };

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, authFailed }}>
      {children}
      
      {/* Modal de sessão revogada */}
      <SessionRevokedModal 
        isOpen={showRevokedModal} 
        onClose={closeRevokedModal} 
      />
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
