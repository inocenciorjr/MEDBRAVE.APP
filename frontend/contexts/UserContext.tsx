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
    try {
      const response = await fetchWithAuth('/user/me');
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      setUser(null);
    } finally {
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
