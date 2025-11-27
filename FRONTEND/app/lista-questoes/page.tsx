'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ListaQuestoesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar automaticamente para a nova página
    router.replace('/lista-questoes/minhas-listas');
  }, [router]);

  // Skeleton minimalista para redirect rápido
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-9 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg p-6">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
