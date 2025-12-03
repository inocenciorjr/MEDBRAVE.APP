import { Skeleton } from "@/components/ui/skeleton";

export function FlashcardsPageSkeleton() {
  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-32" />
      </div>

      <div className="w-full py-8 animate-pulse">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Skeleton className="h-10 w-36 sm:w-48" />
          <Skeleton className="h-10 w-32 sm:w-48" />
        </div>

        {/* Header - responsivo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <Skeleton className="h-7 sm:h-8 w-40 sm:w-48 mb-2" />
            <Skeleton className="h-4 w-64 sm:w-96 max-w-full" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 w-full sm:w-40" />
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Collections Grid - responsivo: 1 col mobile, 2 tablet, 4 desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden border border-border-light dark:border-border-dark"
            >
              {/* Thumbnail */}
              <Skeleton className="h-36 sm:h-48 w-full" />

              {/* Content */}
              <div className="p-4">
                <Skeleton className="h-5 sm:h-6 w-3/4 mb-3" />
                <div className="flex items-center gap-4 mb-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
