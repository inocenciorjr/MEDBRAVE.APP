import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils/cn"

interface CardSkeletonProps {
  className?: string
  showIcon?: boolean
  lines?: number
}

export function CardSkeleton({ className, showIcon = true, lines = 2 }: CardSkeletonProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-24" />
        {showIcon && <Skeleton className="h-6 w-6 rounded-full" />}
      </div>
      <Skeleton className="h-8 w-32 mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full mb-2 last:mb-0" />
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800",
      className
    )}>
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
