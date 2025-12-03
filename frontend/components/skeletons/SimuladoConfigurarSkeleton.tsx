import { Skeleton } from "@/components/ui/skeleton"

export function SimuladoConfigurarSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Skeleton className="h-6 w-64" />

      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <Skeleton className="w-20 h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-9 w-72 mx-auto mb-3" />
        <Skeleton className="h-8 w-56 mx-auto rounded-full" />
      </div>

      {/* Card de Informações */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl 
                    border border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl overflow-hidden">
        <div className="p-5 border-b border-border-light dark:border-border-dark">
          <Skeleton className="h-6 w-48" />
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-background-light dark:bg-background-dark rounded-xl">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl 
                    border border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl overflow-hidden">
        <div className="p-5 border-b border-border-light dark:border-border-dark">
          <Skeleton className="h-6 w-56" />
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-background-light dark:bg-background-dark rounded-xl">
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="flex-1 h-14 rounded-xl" />
        <Skeleton className="flex-1 h-14 rounded-xl" />
      </div>
    </div>
  )
}
