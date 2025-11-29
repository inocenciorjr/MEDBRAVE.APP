'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Monitorar sessão em tempo real
  const { showRevokedModal, closeRevokedModal } = useSessionMonitor(user?.id);
  
  // Rastrear atividade em tempo real
  useActivityTracker(user?.id || null, sessionId);

  const fetchUser = async (retryCount = 0) => {
    try {
      // Buscar sessão do Supabase
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ [UserContext] Erro na sessão:', sessionError);
        setUser(null);
        setLoading(false);
        return;
      }
      
      if (!session) {
        // No mobile, às vezes a sessão demora para ser estabelecida
        // Tentar novamente após um delay
        if (retryCount < 2) {
          setTimeout(() => fetchUser(retryCount + 1), 1000);
          return;
        }
        
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Extrair session_id do token JWT (está no payload)
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        setSessionId(payload.session_id || null);
      } catch (e) {
        // Silently fail
      }

      // Buscar dados do usuário via API do backend (evita problemas de RLS)
      
      const token = session.access_token;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('❌ [UserContext] Erro ao buscar dados do usuário:', response.statusText);
        setUser(null);
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
      
      const user = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        displayName: userData.displayName || session.user.email?.split('@')[0] || 'Usuário',
        photoURL: userData.photoURL || session.user.user_metadata?.avatar_url || null,
        activePlan: userData.activePlan || null,
      };
      setUser(user);
      setLoading(false);
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
      
      return () => {
        subscription.unsubscribe();
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
    <UserContext.Provider value={{ user, loading, refreshUser }}>
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
