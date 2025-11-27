'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { verifyAdminAccess, type UserProfile } from '@/services/admin/authService';

interface UseAdminAuthReturn {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  error: string | null;
}

/**
 * Hook para proteger rotas administrativas
 * Verifica se o usuário está autenticado e tem permissão de admin
 * Redireciona para /login se não estiver autenticado ou não for admin
 */
export function useAdminAuth(): UseAdminAuthReturn {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        const adminUser = await verifyAdminAccess();
        
        if (!adminUser) {
          // Usuário não é admin ou não está autenticado
          setError('Acesso negado. Você precisa estar autenticado como administrador para acessar esta área.');
          
          // Redirecionar para login com redirect para a página atual
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        setUser(adminUser);
        setError(null);
      } catch (error) {
        console.error('Erro ao verificar acesso admin:', error);
        setError('Erro ao verificar permissões. Por favor, faça login novamente.');
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } finally {
        setLoading(false);
      }
    }

    checkAdminAccess();
  }, [router, pathname]);

  return {
    user,
    loading,
    isAdmin: !!user,
    error,
  };
}
