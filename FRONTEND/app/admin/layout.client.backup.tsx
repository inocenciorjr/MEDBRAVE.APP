'use client';

import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin, error } = useAdminAuth();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não for admin, mostrar mensagem de erro
  if (!isAdmin || !user || error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg 
              className="mx-auto h-16 w-16 text-red-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Acesso Negado
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'Você não tem permissão para acessar esta área.'}
          </p>
          <div className="space-y-3">
            <a
              href="/"
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar para Home
            </a>
            <a
              href="/login"
              className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Fazer Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Se for admin, renderizar o layout admin
  return <AdminLayout>{children}</AdminLayout>;
}
