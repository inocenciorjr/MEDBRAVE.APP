export default function LoginLoading() {
  return (
    <div className="bg-background-light dark:bg-background-dark flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[600px]">
          
          {/* Left Side Skeleton */}
          <div className="w-full lg:w-1/2 bg-gray-200 dark:bg-gray-800 hidden lg:block animate-pulse">
            <div className="h-full w-full"></div>
          </div>

          {/* Right Side Skeleton */}
          <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-8">
              
              {/* Logo Skeleton */}
              <div className="flex flex-col items-center justify-center mb-10">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="mt-4 h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>

              {/* Form Skeleton */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                   </div>
                  <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>

                <div className="h-12 w-full bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
              </div>

              {/* Divider */}
              <div className="flex items-center my-6">
                 <div className="flex-grow h-px bg-gray-200 dark:bg-gray-700"></div>
                 <div className="mx-4 h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                 <div className="flex-grow h-px bg-gray-200 dark:bg-gray-700"></div>
              </div>

              {/* Google Button */}
              <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>

              {/* Footer */}
              <div className="flex justify-center mt-8">
                 <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
