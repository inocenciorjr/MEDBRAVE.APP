import { Skeleton } from "@/components/ui/skeleton"

export function CollectionCardSkeleton() {
  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-lg border border-border-light dark:border-border-dark w-full min-h-[380px] flex flex-col items-center relative animate-pulse">
      {/* Badge Oficial - Top Right */}
      <div className="absolute top-3 right-3">
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>

      {/* Thumbnail */}
      <Skeleton className="h-32 w-32 rounded-lg mb-4" />
      
      {/* Title */}
      <Skeleton className="h-6 w-3/4 mb-1" />
      <Skeleton className="h-6 w-2/3 mb-2" />
      
      {/* Author */}
      <Skeleton className="h-4 w-32 mb-3" />
      
      {/* Deck count */}
      <Skeleton className="h-4 w-40 mb-6" />
      
      {/* Stats */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-1">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
      
      {/* Buttons */}
      <div className="mt-auto w-full flex flex-col gap-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function CollectionGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CollectionCardSkeleton key={i} />
      ))}
    </div>
  )
}
