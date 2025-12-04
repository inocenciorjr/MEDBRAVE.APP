'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { useAuth } from '@/lib/contexts/AuthContext';

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
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('[Admin Layout] Não autenticado, redirecionando para login');
      router.push('/login?redirect=/admin');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PagePlanGuard>
      <AdminLayout>{children}</AdminLayout>
    </PagePlanGuard>
  );
}
