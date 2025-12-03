'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, addDays, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { plannerService } from '@/lib/services/plannerService';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

interface DayReview {
  FLASHCARD?: { count: number; completed: number };
  QUESTION?: { count: number; completed: number };
  ERROR_NOTEBOOK?: { count: number; completed: number };
}

interface UserTask {
  id: string;
  title: string;
  status: string;
}

interface CompactPlannerProps {
  daysToShow?: number;
}

export function CompactPlanner({ daysToShow = 5 }: CompactPlannerProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [showUserTasks, setShowUserTasks] = useState(false);
  
  const effectiveDaysToShow = isMobile ? Math.min(daysToShow, 3) : daysToShow;

  const today = new Date();
  const startDate = format(today, 'yyyy-MM-dd');
  const endDate = format(addDays(today, 6), 'yyyy-MM-dd');

  // Query para revisões - com cache de 2 minutos
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['compact-planner-reviews', startDate, endDate],
    queryFn: async () => {
      const response = await fetchWithAuth(`/unified-reviews/planner?limit=200&startDate=${startDate}&endDate=${endDate}`);
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Query para eventos do planner - com cache de 1 minuto
  const { data: plannerEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['compact-planner-events', startDate, endDate],
    queryFn: () => plannerService.getEvents(startDate, endDate),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Processar dados com useMemo para evitar recálculos
  const reviewsByDay = useMemo(() => {
    if (!reviewsData?.success || !reviewsData?.data?.grouped) return {};
    
    const grouped: Record<string, DayReview> = {};
    Object.entries(reviewsData.data.grouped).forEach(([dateKey, types]: [string, any]) => {
      grouped[dateKey] = {};
      ['FLASHCARD', 'QUESTION', 'ERROR_NOTEBOOK'].forEach((type) => {
        const typeData = types[type];
        if (typeData) {
          grouped[dateKey][type as keyof DayReview] = {
            count: (typeData.reviews?.length || 0) + (typeData.completed_count || 0),
            completed: typeData.completed_count || 0,
          };
        }
      });
    });
    return grouped;
  }, [reviewsData]);

  const userTasksByDay = useMemo(() => {
    if (!plannerEvents) return {};
    
    const tasksByDay: Record<string, UserTask[]> = {};
    plannerEvents
      .filter(e => e.event_type === 'user_task')
      .forEach((task) => {
        const dateKey = task.date;
        if (!tasksByDay[dateKey]) tasksByDay[dateKey] = [];
        tasksByDay[dateKey].push({
          id: task.id!,
          title: task.title,
          status: task.status || 'pending',
        });
      });
    return tasksByDay;
  }, [plannerEvents]);

  const loading = reviewsLoading || eventsLoading;

  // Verificar se há tarefas do usuário em algum dia
  const hasUserTasks = Object.values(userTasksByDay).some(tasks => tasks.length > 0);

  // Alternar automaticamente entre sistema e usuário a cada 5 segundos
  useEffect(() => {
    if (!hasUserTasks) return;

    const interval = setInterval(() => {
      setShowUserTasks(prev => !prev);
    }, 3000);

    return () => clearInterval(interval);
  }, [hasUserTasks]);

  const days = Array.from({ length: effectiveDaysToShow }, (_, i) => addDays(new Date(), i));

  // Sempre mostrar os 3 tipos para consistência visual
  const typeOrder: (keyof DayReview)[] = ['FLASHCARD', 'QUESTION', 'ERROR_NOTEBOOK'];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'FLASHCARD': return 'layers';
      case 'QUESTION': return 'list_alt';
      case 'ERROR_NOTEBOOK': return 'book';
      default: return 'event';
    }
  };

  const getTypeColorClass = (type: string) => {
    switch (type) {
      case 'FLASHCARD': return 'bg-purple-100 dark:bg-purple-900/30';
      case 'QUESTION': return 'bg-cyan-100 dark:bg-cyan-900/30';
      case 'ERROR_NOTEBOOK': return 'bg-green-100 dark:bg-green-900/30';
      default: return 'bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const handleDayClick = () => {
    router.push('/planner');
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 w-32 bg-border-light dark:bg-border-dark rounded mb-4" />
        <div className={`grid gap-2 ${isMobile ? 'grid-cols-3' : 'grid-cols-5'}`}>
          {[...Array(effectiveDaysToShow)].map((_, i) => (
            <div key={i} className="h-24 bg-border-light dark:bg-border-dark rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-text-light-primary dark:text-text-dark-primary">
          Planner
        </h2>
        <button
          onClick={() => router.push('/planner')}
          className="group px-3 py-1.5 rounded-lg text-sm font-display font-medium 
                     bg-primary/10 dark:bg-primary/20 text-primary 
                     hover:bg-primary hover:text-white
                     border border-primary/20 hover:border-primary
                     shadow-sm hover:shadow-md hover:shadow-primary/20
                     transition-all duration-300 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base">calendar_month</span>
          Ver completo
          <span className="material-symbols-outlined text-base transition-transform duration-300 group-hover:translate-x-0.5">
            chevron_right
          </span>
        </button>
      </div>

      <div className={`grid gap-2 items-start ${isMobile ? 'grid-cols-3' : 'grid-cols-5'}`}>
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayData = reviewsByDay[dateKey];
          const isCurrentDay = isToday(day);
          const isPast = isBefore(startOfDay(day), startOfDay(new Date()));

          return (
            <button
              key={dateKey}
              onClick={() => handleDayClick()}
              className={`
                relative p-2 rounded-lg border-2 transition-all duration-200
                hover:scale-105 hover:shadow-md flex flex-col items-stretch
                ${isCurrentDay 
                  ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                  : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark'
                }
                ${isPast && !isCurrentDay ? 'opacity-60' : ''}
              `}
            >
              {/* Day Header - altura fixa */}
              <div className="text-center mb-2 flex-shrink-0">
                <div className="text-xs font-inter text-text-light-secondary dark:text-text-dark-secondary uppercase">
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={`text-lg font-display font-bold ${isCurrentDay ? 'text-primary' : 'text-text-light-primary dark:text-text-dark-primary'}`}>
                  {format(day, 'd')}
                </div>
              </div>

              {/* Review Indicators - alterna entre sistema e usuário */}
              <div className="relative overflow-hidden min-h-[92px]">
                {/* Tarefas do Sistema */}
                <div 
                  className={`space-y-1 transition-all duration-500 ${
                    showUserTasks && userTasksByDay[dateKey]?.length 
                      ? 'opacity-0 -translate-x-full absolute inset-0' 
                      : 'opacity-100 translate-x-0'
                  }`}
                >
                  {typeOrder.map((type) => {
                    const data = dayData?.[type];
                    const total = data?.count || 0;
                    const completed = data?.completed || 0;
                    const isComplete = total > 0 && completed === total;
                    
                    return (
                      <div
                        key={type}
                        className={`
                          flex items-center justify-between px-1.5 py-0.5 rounded text-xs
                          ${isComplete 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                            : `${getTypeColorClass(type)} text-text-light-primary dark:text-text-dark-primary`
                          }
                        `}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {isComplete ? 'check_circle' : getTypeIcon(type)}
                        </span>
                        <span className="font-inter font-medium">
                          {isComplete ? '✓' : total === 0 ? '0' : `${completed}/${total}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Tarefas do Usuário */}
                {userTasksByDay[dateKey]?.length > 0 && (
                  <div 
                    className={`space-y-1 transition-all duration-500 h-full flex flex-col justify-start ${
                      showUserTasks 
                        ? 'opacity-100 translate-x-0' 
                        : 'opacity-0 translate-x-full absolute inset-0'
                    }`}
                  >
                    {userTasksByDay[dateKey].slice(0, 3).map((task) => {
                      const isComplete = task.status === 'completed';
                      
                      return (
                        <div
                          key={task.id}
                          className={`
                            flex items-center px-1.5 py-0.5 rounded text-xs
                            ${isComplete 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 line-through' 
                              : 'bg-amber-100 dark:bg-amber-900/30 text-text-light-primary dark:text-text-dark-primary'
                            }
                          `}
                        >
                          <span className="font-inter font-medium truncate text-[10px] w-full text-center">
                            {task.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
