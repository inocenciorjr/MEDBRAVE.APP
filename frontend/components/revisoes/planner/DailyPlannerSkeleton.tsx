import { Skeleton } from "@/components/ui/skeleton"

export function DailyPlannerSkeleton() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  return (
    <div className="relative select-none animate-pulse">
      <div className="border-2 border-border-light dark:border-border-dark rounded-2xl overflow-hidden shadow-2xl dark:shadow-dark-2xl bg-surface-light dark:bg-surface-dark">
        {/* Header Row */}
        <div className="grid grid-cols-[100px,repeat(7,1fr)] border-b-2 border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark shadow-lg dark:shadow-dark-lg">
          {/* Canto superior esquerdo */}
          <div className="h-14 bg-surface-light dark:bg-surface-dark border-r-2 border-border-light dark:border-border-dark flex items-center justify-center">
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
          
          {/* Headers dos dias */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-14 flex flex-col items-center justify-center gap-1 bg-background-light dark:bg-background-dark ${i > 0 ? 'border-l-2' : ''} border-border-light dark:border-border-dark`}
            >
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          ))}
        </div>

        {/* Grid de conteúdo */}
        <div className="grid grid-cols-[100px,repeat(7,1fr)]">
          {/* Coluna de horários */}
          <div className="sticky left-0 z-20 bg-background-light dark:bg-background-dark border-r-2 border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg">
            {hours.map(hour => (
              <div key={hour} className="h-12 flex items-center justify-center border-b-2 border-border-light dark:border-border-dark">
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <div key={dayIndex} className={`${dayIndex > 0 ? 'border-l-2' : ''} border-border-light dark:border-border-dark`}>
              {hours.map(hour => (
                <div
                  key={hour}
                  className="h-12 border-b-2 border-border-light dark:border-border-dark p-1"
                >
                  {/* Randomly show some event skeletons */}
                  {Math.random() > 0.85 && (
                    <Skeleton className="h-10 w-full rounded" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
