import { Skeleton } from "@/components/ui/skeleton";

export function FlashcardStudySessionSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl animate-pulse">
        {/* Progress Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="flex justify-between mb-2">
            <Skeleton className="h-4 w-24 sm:w-32" />
            <Skeleton className="h-4 w-20 sm:w-24" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>

        {/* Flashcard */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark overflow-hidden">
          <div className="p-6 sm:p-12 min-h-[300px] sm:min-h-[500px] flex flex-col items-center justify-center">
            <Skeleton className="h-6 sm:h-8 w-40 sm:w-48 mb-6 sm:mb-8" />
            <Skeleton className="h-5 sm:h-6 w-full mb-3 sm:mb-4" />
            <Skeleton className="h-5 sm:h-6 w-full mb-3 sm:mb-4" />
            <Skeleton className="h-5 sm:h-6 w-3/4 mb-6 sm:mb-8" />
            <Skeleton className="h-10 sm:h-12 w-40 sm:w-48 rounded-lg" />
          </div>
        </div>

        {/* Action Buttons - responsivo */}
        <div className="flex justify-center gap-2 sm:gap-4 mt-6 sm:mt-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              className="h-12 w-16 sm:h-16 sm:w-24 rounded-xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
