import { Skeleton } from "@/components/ui/skeleton";

export function CadernoErrosItemSkeleton() {
  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-48 sm:w-64" />
      </div>

      <div className="w-full py-8 animate-pulse">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-28 sm:w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-xl border border-border-light dark:border-border-dark overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 sm:h-6 w-40 sm:w-48" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>

          {/* Question Content */}
          <div className="p-4 sm:p-6 lg:p-8">
            <Skeleton className="h-5 sm:h-6 w-32 mb-4" />
            <Skeleton className="h-4 sm:h-5 w-full mb-3" />
            <Skeleton className="h-4 sm:h-5 w-full mb-3" />
            <Skeleton className="h-4 sm:h-5 w-3/4 mb-8" />

            {/* Your Answer */}
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-rose-200 dark:border-rose-800">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Correct Answer */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-emerald-200 dark:border-emerald-800">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Notes Section */}
            <div className="border-t border-border-light dark:border-border-dark pt-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-24 sm:h-32 w-full rounded-lg" />
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 sm:p-6 border-t border-border-light dark:border-border-dark flex flex-col sm:flex-row justify-between gap-4">
            <Skeleton className="h-10 w-full sm:w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-full sm:w-40" />
              <Skeleton className="h-10 w-full sm:w-40" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
