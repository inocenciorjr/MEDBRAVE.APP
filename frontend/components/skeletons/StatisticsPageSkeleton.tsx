import { Skeleton } from "@/components/ui/skeleton";

export function StatisticsPageSkeleton() {
  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-32 sm:w-48" />
      </div>

      <div className="w-full py-8 animate-pulse">
        {/* Header - responsivo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="space-y-2">
            <Skeleton className="h-8 sm:h-9 w-48 sm:w-64" />
            <Skeleton className="h-4 w-64 sm:w-80 max-w-full" />
          </div>
          <Skeleton className="h-10 w-full sm:w-36" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Skeleton className="h-10 w-28 sm:w-32" />
          <Skeleton className="h-10 w-28 sm:w-32" />
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-surface-light dark:bg-surface-dark rounded-xl p-3 sm:p-6 border border-border-light dark:border-border-dark"
            >
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                <Skeleton className="h-5 sm:h-6 w-5 sm:w-6 rounded-full" />
              </div>
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-24 mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>

        {/* Streak and Reviews Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 sm:p-6 border border-border-light dark:border-border-dark">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-16 sm:h-20 w-full" />
              <Skeleton className="h-16 sm:h-20 w-full" />
            </div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 sm:p-6 border border-border-light dark:border-border-dark">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-48 sm:h-64 w-full" />
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 sm:p-6 border border-border-light dark:border-border-dark"
            >
              <Skeleton className="h-6 w-40 sm:w-48 mb-4" />
              <Skeleton className="h-48 sm:h-64 w-full" />
            </div>
          ))}
        </div>

        {/* Study Time Chart */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 sm:p-6 border border-border-light dark:border-border-dark mb-6">
          <Skeleton className="h-6 w-40 sm:w-48 mb-4" />
          <Skeleton className="h-64 sm:h-80 w-full" />
        </div>
      </div>
    </>
  );
}
