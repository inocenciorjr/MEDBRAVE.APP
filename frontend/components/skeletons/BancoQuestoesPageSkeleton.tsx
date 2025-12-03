import { Skeleton } from "@/components/ui/skeleton";

export function BancoQuestoesPageSkeleton() {
  return (
    <div className="w-full py-8 animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 sm:h-10 w-48 sm:w-64 mb-3" />
        <Skeleton className="h-4 sm:h-5 w-64 sm:w-96 max-w-full" />
      </div>

      {/* Stepper - escondido no mobile */}
      <div className="hidden sm:flex items-center justify-between mb-8 max-w-4xl mx-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            {i < 5 && <Skeleton className="h-1 w-8 md:w-16 mx-1 md:mx-2" />}
          </div>
        ))}
      </div>

      {/* Mobile Stepper */}
      <div className="sm:hidden flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-2 w-2 rounded-full" />
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 sm:p-8 border border-border-light dark:border-border-dark">
        <Skeleton className="h-6 sm:h-7 w-40 sm:w-48 mb-6" />

        {/* Grid de opções - responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="border border-border-light dark:border-border-dark rounded-lg p-3 sm:p-4"
            >
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        {/* Botões de navegação */}
        <div className="flex justify-between">
          <Skeleton className="h-10 w-20 sm:w-24" />
          <Skeleton className="h-10 w-28 sm:w-32" />
        </div>
      </div>
    </div>
  );
}
