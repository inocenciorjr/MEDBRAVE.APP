import { Skeleton } from "@/components/ui/skeleton";

export function PlannerPageSkeleton() {
  return (
    <div className="w-full py-8 animate-pulse">
      {/* Header - responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-8 sm:h-10 w-48 sm:w-64 mb-3" />
          <Skeleton className="h-4 sm:h-5 w-64 sm:w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-full sm:w-32" />
          <Skeleton className="h-10 w-full sm:w-32" />
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-10 w-28 sm:w-32" />
        <Skeleton className="h-10 w-28 sm:w-32" />
      </div>

      {/* Calendar/Schedule View */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
        {/* Calendar Header */}
        <div className="p-4 sm:p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
          {/* Dias da semana - escondido no mobile */}
          <div className="hidden sm:grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>

        {/* Calendar Body - simplificado no mobile */}
        <div className="p-4 sm:p-6">
          {/* Mobile: lista de dias */}
          <div className="sm:hidden space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="border border-border-light dark:border-border-dark rounded-lg p-3"
              >
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
          {/* Desktop: grid de calendário */}
          <div className="hidden sm:grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square border border-border-light dark:border-border-dark rounded-lg p-2"
              >
                <Skeleton className="h-4 w-8 mb-2" />
                <Skeleton className="h-2 w-full mb-1" />
                <Skeleton className="h-2 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 sm:p-6 border border-border-light dark:border-border-dark"
          >
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-8 sm:h-10 w-24 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
