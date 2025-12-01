import { Skeleton } from "@/components/ui/skeleton";

export default function PerfilLoading() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card Skeleton */}
          <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-lg shadow-lg p-6 transition-colors duration-300">
            {/* Title */}
            <Skeleton className="h-6 w-48 mb-6" />

            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Skeleton className="w-24 h-24 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>

                {/* E-mail */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-2">
                  <Skeleton className="h-12 w-48" />
                  <Skeleton className="h-12 flex-1" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Skeleton className="h-12 w-full sm:w-40" />
                <Skeleton className="h-12 w-full sm:w-32" />
              </div>
            </div>
          </div>

          {/* Plan Card Skeleton */}
          <div className="bg-white dark:bg-surface-dark rounded-lg shadow-lg p-6 transition-colors duration-300">
            <Skeleton className="h-6 w-24 mb-6" />

            <div className="space-y-4">
              <div className="text-center">
                <Skeleton className="w-16 h-16 rounded-full mx-auto mb-3" />
                <Skeleton className="h-6 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>

              <div className="pt-4 border-t border-border-light dark:border-border-dark">
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Account Info Skeleton */}
        <div className="bg-white dark:bg-surface-dark rounded-lg shadow-lg p-6 transition-colors duration-300">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
