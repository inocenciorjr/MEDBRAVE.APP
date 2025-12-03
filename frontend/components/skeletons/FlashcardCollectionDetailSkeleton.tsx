import { Skeleton } from "@/components/ui/skeleton";

export function FlashcardCollectionDetailSkeleton() {
  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-48 sm:w-64" />
      </div>

      <div className="w-full py-8 animate-pulse">
        {/* Collection Header */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl p-4 sm:p-8 mb-6 sm:mb-8 border border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div className="flex-1">
              <Skeleton className="h-8 sm:h-10 w-full sm:w-3/4 mb-3" />
              <Skeleton className="h-4 sm:h-5 w-full mb-2" />
              <Skeleton className="h-4 sm:h-5 w-2/3" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full hidden sm:block" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
            <Skeleton className="h-10 sm:h-12 w-full sm:w-40" />
            <Skeleton className="h-10 sm:h-12 w-full sm:w-40" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-surface-light dark:bg-surface-dark rounded-xl p-3 sm:p-4 border border-border-light dark:border-border-dark"
            >
              <Skeleton className="h-3 sm:h-4 w-16 sm:w-20 mb-2" />
              <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
            </div>
          ))}
        </div>

        {/* Decks List */}
        <div className="space-y-3 sm:space-y-4">
          <Skeleton className="h-6 sm:h-7 w-28 sm:w-32 mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 sm:p-6 border border-border-light dark:border-border-dark"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <Skeleton className="h-5 sm:h-6 w-full sm:w-64 mb-2" />
                  <Skeleton className="h-4 w-40 sm:w-48" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-full sm:w-32" />
                  <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
