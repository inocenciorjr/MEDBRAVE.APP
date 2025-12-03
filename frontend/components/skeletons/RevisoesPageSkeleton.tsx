import { Skeleton } from "@/components/ui/skeleton";

export function RevisoesPageSkeleton() {
  return (
    <div className="w-full py-8 animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 sm:h-10 w-48 sm:w-64 mb-3" />
        <Skeleton className="h-4 sm:h-5 w-64 sm:w-96 max-w-full" />
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 sm:p-6 border border-border-light dark:border-border-dark"
          >
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-28 sm:w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 sm:h-10 w-24 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>

      {/* Review Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl p-4 sm:p-6 border border-primary/20"
          >
            <Skeleton className="h-10 sm:h-12 w-10 sm:w-12 rounded-full mb-4" />
            <Skeleton className="h-6 sm:h-7 w-40 sm:w-48 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-6" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Progress Section */}
      <div className="mt-8 bg-surface-light dark:bg-surface-dark rounded-xl p-4 sm:p-6 border border-border-light dark:border-border-dark">
        <Skeleton className="h-6 w-40 sm:w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="flex justify-between mb-2">
                <Skeleton className="h-4 w-28 sm:w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
