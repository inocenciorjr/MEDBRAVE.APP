import { Skeleton } from "@/components/ui/skeleton"

export function MonthlyPlannerSkeleton() {
  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  
  return (
    <div className="animate-pulse">
      <div className="border-2 border-border-light dark:border-border-dark rounded-2xl overflow-hidden shadow-2xl dark:shadow-dark-2xl bg-surface-light dark:bg-surface-dark">
        {/* Headers dos dias da semana */}
        <div className="grid grid-cols-7 border-b-2 border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark shadow-lg dark:shadow-dark-lg">
          {weekDays.map((day, i) => (
            <div
              key={day}
              className={`text-center py-3 ${i < 6 ? 'border-r-2' : ''} border-border-light dark:border-border-dark`}
            >
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
        </div>

        {/* Grid de células do calendário - 6 semanas */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 42 }).map((_, i) => {
            const isLastInRow = (i + 1) % 7 === 0;
            const isLastRow = i >= 35;
            
            return (
              <div
                key={i}
                className={`relative min-h-[140px] p-3 ${!isLastRow ? 'border-b-2' : ''} ${!isLastInRow ? 'border-r-2' : ''} border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark`}
              >
                {/* Day number */}
                <div className="mb-2">
                  <Skeleton className="h-5 w-6" />
                </div>
                
                {/* Event cards */}
                <div className="space-y-2">
                  {/* Randomly show some event skeletons */}
                  {Math.random() > 0.6 && (
                    <>
                      <Skeleton className="h-8 w-full rounded-lg" />
                      {Math.random() > 0.5 && <Skeleton className="h-8 w-full rounded-lg" />}
                      {Math.random() > 0.7 && <Skeleton className="h-8 w-full rounded-lg" />}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}
