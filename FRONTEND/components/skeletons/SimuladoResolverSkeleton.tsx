export function SimuladoResolverSkeleton() {
  return (
    <>
      {/* Header fixo no topo - IGUAL ao real */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-primary shadow-lg">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between text-white animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-white/20 rounded-lg"></div>
              <div>
                <div className="h-5 w-48 bg-white/20 rounded mb-2"></div>
                <div className="h-4 w-32 bg-white/20 rounded"></div>
              </div>
            </div>
            
            {/* Timer skeleton */}
            <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <div className="h-6 w-6 bg-white/30 rounded-full"></div>
              <div className="h-8 w-24 bg-white/30 rounded"></div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-lg"></div>
              <div className="h-12 w-40 bg-white/90 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Espaçamento para o header fixo */}
      <div className="h-20"></div>

      {/* Conteúdo da questão - MESMA estrutura do QuestionView */}
      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            {/* Question Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg overflow-hidden">
              {/* Question Header com tags */}
              <div className="p-6 border-b border-border-light dark:border-border-dark">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-7 w-56 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>
              </div>

              {/* Question Body */}
              <div className="p-8">
                <div className="space-y-3 mb-8">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>

                {/* Alternatives */}
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                    <div key={letter} className="border-2 border-border-light dark:border-border-dark rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-6 border-t border-border-light dark:border-border-dark">
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                  <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
              </div>
            </div>

            {/* Navigation Panel */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="flex gap-2 flex-wrap justify-center">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  ))}
                </div>
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
