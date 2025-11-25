import { Skeleton } from "@/components/ui/skeleton"

export function CadernoErrosItemSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Skeleton className="h-6 w-64 mb-6" />

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>

          {/* Question Content */}
          <div className="p-8">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-5 w-full mb-3" />
            <Skeleton className="h-5 w-full mb-3" />
            <Skeleton className="h-5 w-3/4 mb-8" />

            {/* Your Answer */}
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-6 mb-6 border border-rose-200 dark:border-rose-800">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Correct Answer */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 mb-6 border border-emerald-200 dark:border-emerald-800">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Notes Section */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between">
            <Skeleton className="h-10 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
