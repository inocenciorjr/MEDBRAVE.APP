'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/**
 * Layout Client-Side para área administrativa
 * Verifica autenticação no cliente
 */
export default function AdminClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Verificar sessão do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('[Admin Layout] Sem sessão, redirecionando para login');
        router.push('/login?redirect=/admin');
        return;
      }

      console.log('[Admin Layout] Sessão encontrada, usuário autenticado');
      setIsAuthenticated(true);
    } catch (error) {
      console.error('[Admin Layout] Erro ao verificar autenticação:', error);
      router.push('/login?redirect=/admin');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
