import { Skeleton } from "@/components/ui/skeleton";

export function IniciarSessaoSkeleton() {
  return (
    <div className="w-full py-8 animate-pulse">
      {/* Header */}
      <div className="text-center mb-8">
        <Skeleton className="h-10 sm:h-12 w-64 sm:w-96 mx-auto mb-4" />
        <Skeleton className="h-5 sm:h-6 w-48 sm:w-64 mx-auto" />
      </div>

      {/* Main Card */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 sm:p-8 border border-border-light dark:border-border-dark shadow-xl max-w-4xl mx-auto">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 sm:h-10 w-12 sm:w-16 mx-auto mb-2" />
              <Skeleton className="h-3 sm:h-4 w-16 sm:w-24 mx-auto" />
            </div>
          ))}
        </div>

        {/* Options */}
        <div className="space-y-3 sm:space-y-4 mb-8">
          <Skeleton className="h-5 sm:h-6 w-32 mb-4" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 sm:p-4 border border-border-light dark:border-border-dark rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 sm:h-5 w-32 sm:w-48" />
              </div>
              <Skeleton className="h-4 w-12 sm:w-16" />
            </div>
          ))}
        </div>

        {/* Action Button */}
        <Skeleton className="h-12 sm:h-14 w-full rounded-lg" />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-8 max-w-4xl mx-auto">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 sm:p-6 border border-primary/20"
          >
            <Skeleton className="h-6 w-6 rounded-full mb-3" />
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
