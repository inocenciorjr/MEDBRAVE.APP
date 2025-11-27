import { Skeleton } from "@/components/ui/skeleton"

export function SimuladoConfigurarSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-3" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Configuration Form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 space-y-8">
        {/* Modo de Prova */}
        <div>
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>

        {/* Tempo */}
        <div>
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>

        {/* Ordem das Questões */}
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </div>

        {/* Mostrar Gabarito */}
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-48" />
        </div>
      </div>
    </div>
  )
}
