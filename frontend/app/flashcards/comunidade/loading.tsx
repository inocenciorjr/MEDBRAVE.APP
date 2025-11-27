export default function Loading() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="h-10 w-48 bg-border-light dark:bg-border-dark rounded animate-pulse" />

      {/* Tabs Skeleton */}
      <div className="flex space-x-8 border-b border-border-light dark:border-border-dark">
        <div className="h-10 w-32 bg-border-light dark:bg-border-dark rounded animate-pulse" />
        <div className="h-10 w-32 bg-border-light dark:bg-border-dark rounded animate-pulse" />
      </div>

      {/* Carousel Section Skeleton */}
      <div className="space-y-12">
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-border-light dark:bg-border-dark rounded animate-pulse" />
              <div className="h-10 w-64 bg-border-light dark:bg-border-dark rounded animate-pulse" />
            </div>
            <div className="h-8 w-24 bg-border-light dark:bg-border-dark rounded animate-pulse" />
          </div>
          <div className="flex space-x-6 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-64 w-[250px] flex-shrink-0 bg-border-light dark:bg-border-dark rounded animate-pulse" />
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-2">
              <div className="h-6 w-64 bg-border-light dark:bg-border-dark rounded animate-pulse" />
              <div className="h-4 w-80 bg-border-light dark:bg-border-dark rounded animate-pulse" />
              <div className="h-10 w-64 bg-border-light dark:bg-border-dark rounded animate-pulse" />
            </div>
            <div className="h-8 w-24 bg-border-light dark:bg-border-dark rounded animate-pulse" />
          </div>
          <div className="flex space-x-6 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 w-[250px] flex-shrink-0 bg-border-light dark:bg-border-dark rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
