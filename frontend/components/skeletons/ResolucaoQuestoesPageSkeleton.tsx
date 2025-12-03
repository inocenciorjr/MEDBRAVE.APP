import { Skeleton } from "@/components/ui/skeleton";

export function ResolucaoQuestoesPageSkeleton() {
  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-40 sm:w-48" />
      </div>

      <div className="w-full py-8 animate-pulse space-y-4 sm:space-y-6">
        {/* Question Card */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg overflow-hidden">
          {/* Question Header com tags */}
          <div className="p-4 sm:p-6 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 sm:h-7 w-40 sm:w-56" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 sm:w-24 rounded-full" />
              <Skeleton className="h-6 w-16 sm:w-20 rounded-full" />
              <Skeleton className="h-6 w-24 sm:w-32 rounded-full" />
            </div>
          </div>

          {/* Question Body */}
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-8">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Alternatives */}
            <div className="space-y-2 sm:space-y-3">
              {["A", "B", "C", "D", "E"].map((letter) => (
                <div
                  key={letter}
                  className="border-2 border-border-light dark:border-border-dark rounded-xl p-3 sm:p-4"
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 sm:p-6 border-t border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 sm:gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-10 w-10 rounded-lg hidden sm:block" />
                <Skeleton className="h-10 w-10 rounded-lg hidden sm:block" />
              </div>
              <Skeleton className="h-10 w-24 sm:w-32 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Navigation Panel - simplificado no mobile */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <Skeleton className="h-10 w-20 sm:w-24 rounded-lg" />
            <div className="flex gap-1 sm:gap-2 flex-wrap justify-center">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg"
                />
              ))}
            </div>
            <Skeleton className="h-10 w-20 sm:w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </>
  );
}
