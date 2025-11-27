'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-red-500 dark:text-red-400">
          <span className="material-symbols-outlined text-6xl">error</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">
          Erro ao carregar coleções da comunidade
        </h2>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          {error.message || 'Ocorreu um erro inesperado'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
