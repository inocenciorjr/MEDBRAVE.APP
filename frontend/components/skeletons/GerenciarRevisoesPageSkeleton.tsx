import { Skeleton } from "@/components/ui/skeleton";

export function GerenciarRevisoesPageSkeleton() {
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
        <div className="flex gap-2 sm:gap-4">
          <Skeleton className="h-10 w-full sm:w-32" />
          <Skeleton className="h-10 w-full sm:w-32" />
        </div>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-border-light dark:border-border-dark"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
          <Skeleton className="h-4 w-full col-span-4" />
          <Skeleton className="h-4 w-full col-span-2" />
          <Skeleton className="h-4 w-full col-span-2" />
          <Skeleton className="h-4 w-full col-span-2" />
          <Skeleton className="h-4 w-full col-span-2" />
        </div>

        {/* Table Rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-4 p-4 border-b border-border-light dark:border-border-dark last:border-b-0"
          >
            <div className="col-span-4">
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-5 w-full col-span-2" />
            <Skeleton className="h-5 w-full col-span-2" />
            <Skeleton className="h-5 w-full col-span-2" />
            <div className="col-span-2 flex gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
        <Skeleton className="h-4 w-40 sm:w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-10 w-10 rounded" />
        </div>
      </div>
    </div>
  );
}
