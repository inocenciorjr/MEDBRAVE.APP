'use client';

interface EmptyStateProps {
  onCreateList: () => void;
}

export default function EmptyState({ onCreateList }: EmptyStateProps) {
  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl dark:shadow-dark-xl p-8 sm:p-12 lg:p-16 text-center flex flex-col items-center justify-center">
      <div className="mb-6 bg-gray-100 dark:bg-gray-700 rounded-full p-6 text-primary inline-flex">
        <span className="material-symbols-outlined text-6xl">note_add</span>
      </div>
      
      <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-3">
        Você ainda não tem listas
      </h2>
      
      <p className="max-w-md mx-auto text-text-light-secondary dark:text-text-dark-secondary mb-8">
        Listas personalizadas servem para você focar em pontos que acredita que pode ainda pode melhorar 
        ou direcionar revisões de acordo com temas ou focos do seu interesse.
      </p>
      
      <button
        onClick={onCreateList}
        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
      >
        <span className="material-symbols-outlined text-xl">add_circle</span>
        <span>Criar Lista</span>
      </button>
    </div>
  );
}
