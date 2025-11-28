'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

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

  const fetchUser = async () => {
    console.log('🔄 [UserContext] Iniciando fetchUser...');
    try {
      // Buscar sessão do Supabase
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      console.log('🔄 [UserContext] Buscando sessão...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ [UserContext] Erro na sessão:', sessionError);
        setUser(null);
        setLoading(false);
        return;
      }
      
      if (!session) {
        console.log('⚠️ [UserContext] Sem sessão ativa');
        setUser(null);
        setLoading(false);
        return;
      }
      
      console.log('✅ [UserContext] Sessão encontrada:', session.user.id);

      // Buscar dados do usuário do banco
      console.log('🔄 [UserContext] Buscando dados do usuário...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role, display_name, photo_url')
        .eq('id', session.user.id)
        .single();

      if (userError) {
        console.error('❌ [UserContext] Erro ao buscar dados do usuário:', userError);
        setUser(null);
        setLoading(false);
        return;
      }
      
      if (!userData) {
        console.error('❌ [UserContext] Usuário não encontrado no banco');
        setUser(null);
        setLoading(false);
        return;
      }
      
      console.log('✅ [UserContext] Dados do usuário encontrados:', userData.display_name);

      // Buscar plano ativo (usar maybeSingle para não dar erro se não encontrar)
      const { data: planData, error: planError } = await supabase
        .from('user_plans')
        .select(`
          id,
          plan_id,
          status,
          start_date,
          end_date,
          is_trial,
          plans (
            id,
            name
          )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (planError) {
        console.warn('Erro ao buscar plano ativo:', planError);
      }

      const user = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        displayName: userData.display_name || session.user.email?.split('@')[0] || 'Usuário',
        photoURL: userData.photo_url || session.user.user_metadata?.avatar_url || null,
        activePlan: planData ? {
          id: planData.id,
          planId: planData.plan_id,
          planName: planData.plans?.name || 'Plano',
          status: planData.status,
          startDate: planData.start_date,
          endDate: planData.end_date,
          isTrial: planData.is_trial,
        } : null,
      };
      
      console.log('✅ [UserContext] Usuário carregado com sucesso:', user.displayName);
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
  }, []);

  const refreshUser = async () => {
    setLoading(true);
    await fetchUser();
  };

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
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
