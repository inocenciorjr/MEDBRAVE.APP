'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Question page error:', error);
  }, [error]);

  return (
    <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg dark:shadow-dark-xl max-w-md">
            <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
              warning
            </span>
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">
              Erro ao carregar questão
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
              Ocorreu um erro ao carregar a questão. Por favor, tente novamente.
            </p>
            <button
              onClick={reset}
              className="bg-primary text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-primary/90 transition-all"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
