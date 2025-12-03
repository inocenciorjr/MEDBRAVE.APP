import { Skeleton } from "@/components/ui/skeleton";

export function EspecialidadeFlashcardsSkeleton() {
  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-64 sm:w-96" />
      </div>

      <div className="w-full py-8 animate-pulse">
        {/* Specialty Header */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl p-4 sm:p-8 mb-6 sm:mb-8 border border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-8 sm:h-10 w-48 sm:w-64 mb-2" />
              <Skeleton className="h-4 sm:h-5 w-full sm:w-96 max-w-full" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Skeleton className="h-8 w-28 sm:w-32" />
            <Skeleton className="h-8 w-28 sm:w-32" />
            <Skeleton className="h-8 w-28 sm:w-32" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Skeleton className="h-10 w-full sm:flex-1" />
          <div className="flex gap-2 sm:gap-4">
            <Skeleton className="h-10 w-full sm:w-32" />
            <Skeleton className="h-10 w-full sm:w-32" />
          </div>
        </div>

        {/* Collections Grid */}
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
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
