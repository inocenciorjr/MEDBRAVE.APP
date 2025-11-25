export function ProvaIntegraPageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Title */}
      <div className="mb-8">
        <div className="h-9 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg dark:shadow-dark-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Institution Cards */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg dark:shadow-dark-lg p-6">
            {/* Institution Header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>

            {/* Exams */}
            <div className="space-y-3">
              {[1, 2].map((j) => (
                <div key={j} className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-lg">
                  <div className="flex-1">
                    <div className="h-5 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
