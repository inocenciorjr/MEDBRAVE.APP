import { Skeleton } from "@/components/ui/skeleton";

export function ProvaIntegraPageSkeleton() {
  return (
    <div className="w-full py-8 animate-pulse">
      {/* Title */}
      <div className="mb-8">
        <Skeleton className="h-8 sm:h-9 w-48 sm:w-64" />
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg dark:shadow-dark-lg p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Institution Cards */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg dark:shadow-dark-lg p-4 sm:p-6"
          >
            {/* Institution Header */}
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <Skeleton className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-5 sm:h-6 w-40 sm:w-48 mb-2" />
                <Skeleton className="h-4 w-28 sm:w-32" />
              </div>
            </div>

            {/* Exams */}
            <div className="space-y-3">
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className="flex items-center justify-between p-3 sm:p-4 bg-background-light dark:bg-background-dark rounded-lg gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 sm:h-5 w-full max-w-[200px] sm:max-w-[256px] mb-2" />
                    <Skeleton className="h-3 sm:h-4 w-32 sm:w-40" />
                  </div>
                  <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
