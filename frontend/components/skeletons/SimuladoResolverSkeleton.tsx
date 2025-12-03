import { Skeleton } from "@/components/ui/skeleton";

export function SimuladoResolverSkeleton() {
  return (
    <>
      {/* Header fixo no topo - responsivo */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-primary shadow-lg">
        <div className="w-full px-3 sm:px-4 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between text-white animate-pulse">
            {/* Mobile: apenas timer e botão */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="h-10 w-10 bg-white/20 rounded-lg"></div>
              <div>
                <div className="h-5 w-48 bg-white/20 rounded mb-2"></div>
                <div className="h-4 w-32 bg-white/20 rounded"></div>
              </div>
            </div>

            {/* Timer skeleton */}
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <div className="h-5 w-5 sm:h-6 sm:w-6 bg-white/30 rounded-full"></div>
              <div className="h-6 sm:h-8 w-16 sm:w-24 bg-white/30 rounded"></div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-lg hidden sm:block"></div>
              <div className="h-10 sm:h-12 w-28 sm:w-40 bg-white/90 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Espaçamento para o header fixo */}
      <div className="h-16 sm:h-20"></div>

      {/* Conteúdo da questão */}
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="animate-pulse space-y-4 sm:space-y-6">
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
                <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
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
                  </div>
                  <Skeleton className="h-10 w-24 sm:w-32 rounded-lg" />
                </div>
              </div>
            </div>

            {/* Navigation Panel */}
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
        </div>
      </div>
    </>
  );
}
