import { Skeleton } from "@/components/ui/skeleton";

export function SimuladosPageSkeleton() {
  return (
    <div className="w-full py-8 animate-pulse">
      {/* Header - responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-8 sm:h-10 w-48 sm:w-64 mb-3" />
          <Skeleton className="h-4 sm:h-5 w-64 sm:w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-full sm:w-40" />
      </div>

      {/* Filters - responsivo */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Skeleton className="h-10 w-full sm:flex-1" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-full sm:w-32" />
          <Skeleton className="h-10 w-full sm:w-32" />
        </div>
      </div>

      {/* Simulados Grid - responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 sm:p-6 border border-border-light dark:border-border-dark"
          >
            <div className="flex items-start justify-between mb-4">
              <Skeleton className="h-5 sm:h-6 w-3/4" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <Skeleton className="h-2 w-full mb-2" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
