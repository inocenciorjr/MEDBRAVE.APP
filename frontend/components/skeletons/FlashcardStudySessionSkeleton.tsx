import { Skeleton } from "@/components/ui/skeleton"

export function FlashcardStudySessionSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>

        {/* Flashcard */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-12 min-h-[500px] flex flex-col items-center justify-center">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-6 w-3/4 mb-8" />
            <Skeleton className="h-12 w-48 rounded-lg" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
