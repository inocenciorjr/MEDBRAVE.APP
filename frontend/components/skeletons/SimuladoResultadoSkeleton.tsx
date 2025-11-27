// A página de resultado de simulado usa o QuestionView, então o skeleton deve ser igual ao de resolução de questões
export function SimuladoResultadoSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          {/* Breadcrumb */}
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>

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
  )
}
