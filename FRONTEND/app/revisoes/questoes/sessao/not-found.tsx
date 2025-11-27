import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="w-full py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg dark:shadow-dark-xl max-w-md">
            <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
              error
            </span>
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">
              Questão não encontrada
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
              A questão que você está procurando não existe ou foi removida.
            </p>
            <Link
              href="/"
              className="inline-block bg-primary text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-primary/90 transition-all"
            >
              Voltar para o início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
