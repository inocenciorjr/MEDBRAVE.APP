import { Skeleton } from "@/components/ui/skeleton"

export function BancoQuestoesPageSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-3" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 max-w-4xl mx-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            {i < 5 && <Skeleton className="h-1 w-16 mx-2" />}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800">
        <Skeleton className="h-7 w-48 mb-6" />
        
        {/* Grid de opções */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        {/* Botões de navegação */}
        <div className="flex justify-between">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  )
}
