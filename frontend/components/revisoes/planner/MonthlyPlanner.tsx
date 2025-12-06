'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { TaskSource, TaskPermissions, getDefaultPermissions } from './types';
import { CreateTaskModal } from './CreateTaskModal';
import { DayTasksModal } from './DayTasksModal';
import { plannerService } from '@/lib/services/plannerService';
import { Tooltip } from './Tooltip';

interface MonthlyPlannerProps {
  currentDate: Date;
}

interface GroupedReview {
  id: string;
  title: string;
  color: string;
  content_type: 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK';
  count: number;
  reviewIds: string[];
  source: TaskSource;
  permissions: TaskPermissions;
  status?: 'pending' | 'completed';
  completed_count?: number;
  total_count?: number;
}

interface ManualTask {
  id: string;
  title: string;
  color: string;
  taskType: string;
  source: TaskSource;
  permissions: TaskPermissions;
  status?: 'pending' | 'completed';
}

export function MonthlyPlanner({ currentDate }: MonthlyPlannerProps) {
  const router = useRouter();
  const [groupedReviews, setGroupedReviews] = useState<Record<string, GroupedReview[]>>({});
  const [manualTasks, setManualTasks] = useState<Record<string, ManualTask[]>>({});
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDayTasksModalOpen, setIsDayTasksModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<(GroupedReview | ManualTask)[]>([]);
  const [selectedTask, setSelectedTask] = useState<GroupedReview | ManualTask | null>(null);
  const [studyDays, setStudyDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); // Todos os dias por padrão
  const cacheRef = useState<Map<string, Record<string, GroupedReview[]>>>(new Map())[0];

  useEffect(() => {
    const monthKey = format(startOfMonth(currentDate), 'yyyy-MM');
    const cached = cacheRef.get(monthKey);
    
    if (cached) {
      // Mostrar cache imediatamente
      setGroupedReviews(cached);
      setLoading(false);
      
      // Recarregar em background
      loadReviews(true);
    } else {
      // Não tem cache, carregar com loading
      setLoading(true);
      loadReviews(false);
    }
    
    // Carregar preferências de estudo
    loadStudyPreferences();
  }, [currentDate]);

  const loadStudyPreferences = async () => {
    try {
      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
      const response = await fetchWithAuth('/review-preferences');
      const result = await response.json();
      
      if (result.success && result.data?.study_days) {
        setStudyDays(result.data.study_days);
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    }
  };

  const loadReviews = async (isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {
        setLoading(true);
      }
      
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      // Buscar eventos salvos do planner
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      
      // Carregar em paralelo
      const [savedEvents, response] = await Promise.all([
        plannerService.getEvents(startDate, endDate).catch(err => {
          console.error('Erro ao carregar eventos salvos:', err);
          return [];
        }),
        fetch(`/api/unified-reviews/planner?limit=500&startDate=${startDate}&endDate=${endDate}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
      ]);

      // Separar eventos do sistema e tarefas do usuário
      const savedEventsMap: Record<string, any> = {};
      const userTasksByDate: Record<string, ManualTask[]> = {};
      
      savedEvents.forEach(event => {
        if (event.event_type === 'user_task') {
          // Tarefa do usuário
          const dateKey = event.date;
          if (!userTasksByDate[dateKey]) {
            userTasksByDate[dateKey] = [];
          }
          userTasksByDate[dateKey].push({
            id: event.id || `user-task-${Date.now()}`,
            title: event.title || 'Sem título',
            color: event.color || 'gray',
            taskType: event.metadata?.taskType || 'other',
            source: 'user',
            permissions: getDefaultPermissions('user'),
            status: (event.status === 'completed' ? 'completed' : 'pending') as 'pending' | 'completed',
          });
        } else {
          // Evento do sistema
          const key = `${event.date}-${event.content_type}`;
          savedEventsMap[key] = event;
        }
      });
      
      // Atualizar tarefas manuais
      setManualTasks(userTasksByDate);

      const result = await response.json();
      if (result.success) {
        // O novo endpoint já retorna agrupado por data e tipo
        const reviewsByDayAndType: Record<string, Record<string, any>> = {};
        
        Object.entries(result.data.grouped).forEach(([dateKey, types]: [string, any]) => {
          reviewsByDayAndType[dateKey] = {};
          
          Object.entries(types).forEach(([typeKey, data]: [string, any]) => {
            reviewsByDayAndType[dateKey][typeKey] = data; // Salvar o objeto completo, não apenas reviews
          });
        });

        // Criar grupos por tipo
        const grouped: Record<string, GroupedReview[]> = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        Object.entries(reviewsByDayAndType).forEach(([dateKey, types]) => {
          grouped[dateKey] = [];
          
          // Ordem: FLASHCARD, QUESTION, ERROR_NOTEBOOK
          const orderedTypes: Array<'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK'> = ['FLASHCARD', 'QUESTION', 'ERROR_NOTEBOOK'];
          
          orderedTypes.forEach((contentType) => {
            const typeData = types[contentType];
            const reviews = typeData?.reviews || [];
            const savedKey = `${dateKey}-${contentType}`;
            const savedEvent = savedEventsMap[savedKey];
            
            // Só adicionar se houver revisões pendentes OU se houver evento salvo (concluído)
            if (reviews.length === 0 && !savedEvent) return;
            
            // Usar completed_count da API (fonte de verdade) ou do evento salvo
            const completedCount = typeData?.completed_count || savedEvent?.completed_count || 0;
            const pendingCount = reviews.length;
            const totalCount = completedCount + pendingCount;
            
            // Determinar status real: só está completo se não há pendentes
            const actualStatus = pendingCount === 0 && completedCount > 0 ? 'completed' : 'pending';
            
            // Verificar se está atrasada (apenas dias ANTERIORES a hoje, não incluindo hoje)
            // Usar formato YYYY-MM-DD para evitar problemas de timezone
            const taskDate = new Date(dateKey + 'T00:00:00');
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            const isOverdue = taskDate.getTime() < todayDate.getTime() && actualStatus !== 'completed';
            const taskColor = isOverdue ? 'red' : getColorByContentType(contentType);
            
            grouped[dateKey].push({
              id: savedEvent?.id || `grouped-${dateKey}-${contentType}`,
              title: getGroupedTitle(contentType, totalCount),
              color: taskColor,
              content_type: contentType,
              count: pendingCount,
              reviewIds: reviews.map((r: any) => r.id),
              source: 'system',
              permissions: getDefaultPermissions('system'),
              status: actualStatus,
              completed_count: completedCount,
              total_count: totalCount,
            });
          });
        });

        // Adicionar eventos salvos que não têm revisões pendentes (ex: tarefas concluídas)
        Object.entries(savedEventsMap).forEach(([key, event]) => {
          // A chave está no formato "YYYY-MM-DD-CONTENT_TYPE"
          // Precisamos pegar os 3 primeiros elementos como data e o último como tipo
          const parts = key.split('-');
          const contentType = parts[parts.length - 1]; // Último elemento
          const dateKey = parts.slice(0, parts.length - 1).join('-'); // Todos menos o último
          
          // Filtrar apenas tipos válidos de revisão (ignorar USER_TASK e outros)
          const validTypes = ['FLASHCARD', 'QUESTION', 'ERROR_NOTEBOOK'];
          if (!validTypes.includes(contentType)) return;
          
          // Se já foi adicionado acima, pular
          if (grouped[dateKey]?.some(item => item.id === event.id)) return;
          
          // Adicionar evento salvo sem revisões pendentes
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          
          const taskDate = new Date(dateKey + 'T00:00:00');
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          const isOverdue = taskDate.getTime() < todayDate.getTime() && event.status !== 'completed';
          const taskColor = isOverdue ? 'red' : getColorByContentType(contentType as 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK');
          
          grouped[dateKey].push({
            id: event.id,
            title: getGroupedTitle(contentType as 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK', event.total_count || 0),
            color: taskColor,
            content_type: contentType as 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK',
            count: 0, // Sem revisões pendentes
            reviewIds: [],
            source: 'system',
            permissions: getDefaultPermissions('system'),
            status: event.status || 'pending',
            completed_count: event.completed_count || 0,
            total_count: event.total_count || 0,
          });
        });

        setGroupedReviews(grouped);
        
        // Salvar no cache
        const monthKey = format(startOfMonth(currentDate), 'yyyy-MM');
        cacheRef.set(monthKey, grouped);
      }
    } catch (error) {
      console.error('Erro ao carregar revisões:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getGroupedTitle = (contentType: 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK', count: number): string => {
    switch (contentType) {
      case 'FLASHCARD':
        return `${count} Flashcard${count > 1 ? 's' : ''}`;
      case 'QUESTION':
        return `${count} Questõ${count > 1 ? 'es' : 'ão'}`;
      case 'ERROR_NOTEBOOK':
        return `${count} Erro${count > 1 ? 's' : ''}`;
    }
  };

  const getColorByContentType = (contentType: 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK'): string => {
    switch (contentType) {
      case 'QUESTION':
        return 'cyan';
      case 'FLASHCARD':
        return 'purple';
      case 'ERROR_NOTEBOOK':
        return 'green';
    }
  };

  const getColorClasses = (color: string) => {
    // Safelist para Tailwind: bg-cyan-50 dark:bg-cyan-900/20 text-cyan-900 dark:text-cyan-100 border-l-4 border-cyan-500 bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100 border-l-4 border-purple-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 border-l-4 border-red-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-l-4 border-blue-500 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 border-l-4 border-orange-500 bg-pink-50 dark:bg-pink-900/20 text-pink-900 dark:text-pink-100 border-l-4 border-pink-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border-l-4 border-yellow-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100 border-l-4 border-green-500 bg-gray-50 dark:bg-gray-900/20 text-gray-900 dark:text-gray-100 border-l-4 border-gray-500
    const classes: Record<string, string> = {
      cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-900 dark:text-cyan-100 border-l-4 border-cyan-500',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100 border-l-4 border-purple-500',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 border-l-4 border-red-500',
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-l-4 border-blue-500',
      orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 border-l-4 border-orange-500',
      pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-900 dark:text-pink-100 border-l-4 border-pink-500',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border-l-4 border-yellow-500',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100 border-l-4 border-green-500',
      gray: 'bg-gray-50 dark:bg-gray-900/20 text-gray-900 dark:text-gray-100 border-l-4 border-gray-500',
    };
    return classes[color] || 'bg-gray-50 dark:bg-gray-900/20 text-gray-900 dark:text-gray-100 border-l-4 border-gray-500';
  };

  const getIconByContentType = (contentType: 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK'): string => {
    switch (contentType) {
      case 'QUESTION': return 'list_alt';
      case 'FLASHCARD': return 'layers';
      case 'ERROR_NOTEBOOK': return 'book';
    }
  };
  
  const getSourceBadge = (source: TaskSource) => {
    if (source === 'mentor') {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-md font-bold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110">
          M
        </span>
      );
    }
    if (source === 'admin') {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-md font-bold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110">
          A
        </span>
      );
    }
    // Não mostrar badge para 'system' e 'user'
    return null;
  };

  // Gerar dias do calendário
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Começa na segunda
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  if (loading) {
    const { MonthlyPlannerSkeleton } = require('./MonthlyPlannerSkeleton');
    return <MonthlyPlannerSkeleton />;
  }

  return (
    <>
      {/* Botão flutuante para criar tarefa */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 z-40 group">
        <button
          onClick={() => {
            setSelectedDate(new Date());
            setIsCreateModalOpen(true);
          }}
          className="bg-primary text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 flex items-center justify-center shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl hover:bg-primary/90 transition-all duration-300 ease-out hover:scale-110 hover:rotate-90"
        >
          <span className="material-symbols-outlined text-xl sm:text-2xl lg:text-3xl transition-transform duration-300 group-hover:scale-110">
            add
          </span>
        </button>
        <Tooltip text="Criar nova tarefa" position="left" />
      </div>

      <div className="border sm:border-2 border-border-light dark:border-border-dark rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl dark:shadow-dark-xl sm:dark:shadow-dark-2xl bg-surface-light dark:bg-surface-dark">
        {/* Headers dos dias da semana */}
        <div className="grid grid-cols-7 border-b sm:border-b-2 border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark shadow-lg dark:shadow-dark-lg">
          {weekDays.map((day, idx) => (
            <div
              key={day}
              className="text-center py-1.5 sm:py-2 lg:py-3 border-r sm:border-r-2 last:border-r-0 border-border-light dark:border-border-dark hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200 group"
            >
              <span className="font-display font-bold text-[10px] sm:text-xs lg:text-sm uppercase tracking-wider text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary group-hover:scale-105 transition-all duration-200">
                <span className="sm:hidden">{day.charAt(0)}</span>
                <span className="hidden sm:inline">{day}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Grid de células do calendário */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayGroupedReviews = groupedReviews[dateKey] || [];
            const dayManualTasks = manualTasks[dateKey] || [];
            const allItems = [...dayGroupedReviews, ...dayManualTasks];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayFlag = isToday(day);
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
            const dayOfWeek = day.getDay(); // 0 = Domingo, 1 = Segunda, etc.
            const isStudyDay = studyDays.includes(dayOfWeek);

            return (
              <div
                key={dateKey}
                onClick={(e) => {
                  // Se clicou diretamente na célula (não em um card)
                  if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.day-cell-content')) {
                    if (!isPast && allItems.length === 0) {
                      setSelectedDate(day);
                      setIsCreateModalOpen(true);
                    } else if (allItems.length > 0) {
                      setSelectedDate(day);
                      setSelectedDayTasks(allItems);
                      setIsDayTasksModalOpen(true);
                    }
                  }
                }}
                style={!isStudyDay ? {
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.05), rgba(168, 85, 247, 0.05) 10px, rgba(168, 85, 247, 0.15) 10px, rgba(168, 85, 247, 0.15) 20px)',
                  backgroundColor: 'rgba(168, 85, 247, 0.03)'
                } : {}}
                className={`relative min-h-[80px] sm:min-h-[100px] md:min-h-[120px] lg:min-h-[140px] p-1 sm:p-1.5 md:p-2 lg:p-3 border-b sm:border-b-2 border-r sm:border-r-2 last:border-r-0 border-border-light dark:border-border-dark transition-all duration-300 ease-out group overflow-hidden ${
                  isPast
                    ? 'cursor-not-allowed opacity-50 bg-background-light/50 dark:bg-background-dark/50'
                    : 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 hover:shadow-lg dark:hover:shadow-dark-lg sm:hover:scale-[1.02] hover:z-10 before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/0 before:via-primary/0 before:to-primary/0 hover:before:from-primary/5 hover:before:via-transparent hover:before:to-transparent before:transition-all before:duration-500 before:pointer-events-none'
                } ${
                  isTodayFlag
                    ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent ring-1 sm:ring-2 ring-primary/50 ring-inset shadow-xl dark:shadow-dark-xl animate-pulse-slow'
                    : isCurrentMonth
                    ? 'bg-background-light dark:bg-background-dark'
                    : 'bg-background-light/30 dark:bg-background-dark/30'
                } ${
                  !isCurrentMonth && 'opacity-40'
                }`}
              >
                {/* Header do dia */}
                <div className="flex items-center justify-between mb-1 sm:mb-1.5 lg:mb-2">
                  {isTodayFlag ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 rounded-full blur-md animate-pulse"></div>
                      <span className="relative text-xs sm:text-sm lg:text-base font-display font-bold bg-gradient-to-br from-primary to-primary/80 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 inline-flex items-center justify-center shadow-xl dark:shadow-dark-xl ring-1 sm:ring-2 ring-primary/40 animate-pulse">
                        {format(day, 'd')}
                      </span>
                    </div>
                  ) : (
                    <span className={`text-xs sm:text-sm lg:text-base font-inter font-bold transition-all duration-200 ${
                      isCurrentMonth 
                        ? 'text-text-light-primary dark:text-text-dark-primary group-hover:text-primary group-hover:scale-110' 
                        : 'text-text-light-secondary dark:text-text-dark-secondary'
                    }`}>
                      {format(day, 'd')}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPast) {
                        setSelectedDate(day);
                        setIsCreateModalOpen(true);
                      }
                    }}
                    className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary-light rounded-full font-bold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 hover:bg-primary/30 dark:hover:bg-primary/40 flex items-center justify-center"
                    title="Criar nova tarefa"
                  >
                    <span className="material-symbols-outlined !text-[10px] sm:!text-xs lg:!text-sm">add</span>
                  </button>
                </div>

                {/* Items do dia (agrupados) */}
                {allItems.length > 0 ? (
                  <div className="space-y-0.5 sm:space-y-1 lg:space-y-1.5 overflow-hidden">
                    {allItems.slice(0, window?.innerWidth < 640 ? 2 : 3).map((item) => {
                      const isReview = 'content_type' in item;
                      const icon = isReview 
                        ? getIconByContentType(item.content_type)
                        : 'menu_book';
                      
                      // Título simplificado - mais curto em mobile
                      const displayTitle = isReview 
                        ? (item.content_type === 'FLASHCARD' ? 'Flash' :
                           item.content_type === 'QUESTION' ? 'Quest' :
                           'Erros')
                        : item.title;
                      
                      const displayTitleFull = isReview 
                        ? (item.content_type === 'FLASHCARD' ? 'Flashcards' :
                           item.content_type === 'QUESTION' ? 'Questões' :
                           'Caderno de Erros')
                        : item.title;
                      
                      const isCompleted = item.status === 'completed';
                      const hasProgress = isReview && item.completed_count !== undefined && item.total_count !== undefined && item.total_count > 0;
                      const progressPercent = hasProgress ? (item.completed_count! / item.total_count!) * 100 : 0;
                      
                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(item);
                          }}
                          className={`relative flex items-center justify-between text-[9px] sm:text-[10px] lg:text-xs px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-1 lg:py-1.5 rounded sm:rounded-lg ${getColorClasses(item.color)} shadow-md hover:shadow-lg dark:shadow-dark-md dark:hover:shadow-dark-lg gap-0.5 sm:gap-1 lg:gap-1.5 transition-all duration-200 hover:scale-[1.02] cursor-pointer group/item overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700 before:pointer-events-none`}
                        >
                          {/* Barra de progresso (se houver) */}
                          {hasProgress && progressPercent > 0 && (
                            <div 
                              className="absolute left-0 top-0 bottom-0 transition-all duration-500 rounded-l sm:rounded-l-lg overflow-hidden"
                              style={{ width: `${progressPercent}%` }}
                            >
                              <div className={`absolute inset-0 ${
                                item.color === 'red' ? 'bg-progress-bar-red-light dark:bg-progress-bar-red-dark' :
                                item.color === 'purple' ? 'bg-progress-bar-purple-light dark:bg-progress-bar-purple-dark' :
                                item.color === 'cyan' ? 'bg-progress-bar-cyan-light dark:bg-progress-bar-cyan-dark' :
                                item.color === 'blue' ? 'bg-progress-bar-blue-light dark:bg-progress-bar-blue-dark' :
                                item.color === 'orange' ? 'bg-progress-bar-orange-light dark:bg-progress-bar-orange-dark' :
                                item.color === 'pink' ? 'bg-progress-bar-pink-light dark:bg-progress-bar-pink-dark' :
                                item.color === 'yellow' ? 'bg-yellow-600/40 dark:bg-yellow-500/30' :
                                item.color === 'green' ? 'bg-green-600/40 dark:bg-green-500/30' :
                                'bg-gray-600/40 dark:bg-gray-500/30'
                              }`} />
                            </div>
                          )}
                          
                          <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-1.5 min-w-0 flex-1 relative z-10">
                            <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-200 ${
                              isCompleted 
                                ? 'bg-white/60 dark:bg-white/40' 
                                : 'bg-white/40 dark:bg-white/20 group-hover/item:scale-110 group-hover/item:bg-white/60 dark:group-hover/item:bg-white/30'
                            }`}>
                              <span className={`material-symbols-outlined !text-[8px] sm:!text-[10px] lg:!text-xs ${isCompleted ? 'filled' : ''}`}>
                                {isCompleted ? 'check_circle' : icon}
                              </span>
                            </div>
                            <span className={`truncate font-semibold ${isCompleted ? 'line-through' : ''}`}>
                              <span className="sm:hidden">{displayTitle}</span>
                              <span className="hidden sm:inline">{displayTitleFull}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 relative z-10">
                            {isReview && hasProgress && (
                              <span className="font-bold bg-white/30 dark:bg-black/20 px-0.5 sm:px-1 lg:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] lg:text-xs shadow-sm hidden xs:inline">
                                {item.completed_count}/{item.total_count}
                              </span>
                            )}
                            {isReview && !hasProgress && item.count > 0 && (
                              <span className="font-bold bg-white/30 dark:bg-black/20 px-0.5 sm:px-1 lg:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] lg:text-xs shadow-sm">
                                {item.count}
                              </span>
                            )}
                            {isCompleted && (
                              <span className="font-bold bg-white/40 dark:bg-white/30 px-0.5 sm:px-1 lg:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] lg:text-xs shadow-sm">
                                ✓
                              </span>
                            )}
                            <span className="hidden lg:inline">{getSourceBadge(item.source)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {allItems.length > (typeof window !== 'undefined' && window?.innerWidth < 640 ? 2 : 3) && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(day);
                          setSelectedDayTasks(allItems);
                          setIsDayTasksModalOpen(true);
                        }}
                        className="relative text-[8px] sm:text-[10px] text-center font-semibold mt-0.5 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded py-0.5 sm:py-1 shadow-sm hover:shadow-md dark:shadow-dark-sm dark:hover:shadow-dark-md transition-all duration-200 hover:scale-105 cursor-pointer group/more border border-primary/20 hover:border-primary/40 overflow-hidden"
                      >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/more:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
                        
                        {/* Content */}
                        <div className="relative flex items-center justify-center gap-0.5">
                          <span className="text-primary font-bold">
                            +{allItems.length - (typeof window !== 'undefined' && window?.innerWidth < 640 ? 2 : 3)}
                          </span>
                          <span className="material-symbols-outlined !text-[8px] sm:!text-xs text-primary group-hover/more:scale-110 transition-transform duration-200">
                            arrow_forward
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  !isPast && isCurrentMonth && (
                    <div className="day-cell-content flex items-center justify-center h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="text-center pointer-events-none">
                        <span className="material-symbols-outlined text-3xl text-text-light-secondary/30 dark:text-text-dark-secondary/30 group-hover:text-primary/50 transition-colors duration-200">
                          add_circle
                        </span>
                        <p className="text-xs text-text-light-secondary/50 dark:text-text-dark-secondary/50 mt-1 font-medium">
                          Criar tarefa
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedDate(null);
        }}
        onCreateTask={async (taskData) => {
          if (!selectedDate) return;
          
          try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            
            // Verificar se é tarefa recorrente
            if (taskData.isRecurring && taskData.recurringDays && taskData.recurringEndDate) {
              // Criar tarefa recorrente (backend vai expandir automaticamente)
              const savedEvent = await plannerService.createEvent({
                event_type: 'user_task',
                title: taskData.title,
                description: taskData.description,
                date: dateStr,
                start_hour: taskData.start_hour,
                start_minute: taskData.start_minute,
                end_hour: taskData.end_hour,
                end_minute: taskData.end_minute,
                color: taskData.color,
                icon: taskData.icon,
                metadata: taskData.metadata,
                content_type: 'USER_TASK',
                is_recurring: true,
                recurrence_pattern: {
                  days: taskData.recurringDays,
                },
                recurrence_end_date: taskData.recurringEndDate,
              });
              
              console.log('✅ Tarefa recorrente criada com sucesso');
            } else {
              // Tarefa única
              const savedEvent = await plannerService.createEvent({
                event_type: 'user_task',
                title: taskData.title,
                description: taskData.description,
                date: dateStr,
                start_hour: taskData.start_hour,
                start_minute: taskData.start_minute,
                end_hour: taskData.end_hour,
                end_minute: taskData.end_minute,
                color: taskData.color,
                icon: taskData.icon,
                metadata: taskData.metadata,
                content_type: 'USER_TASK',
              });
              
              // Atualizar estado local
              const newTask: ManualTask = {
                id: savedEvent.id || `user-task-${Date.now()}`,
                title: taskData.title,
                color: taskData.color,
                taskType: taskData.taskType,
                source: taskData.source,
                permissions: taskData.permissions,
              };
              
              setManualTasks(prev => ({
                ...prev,
                [dateStr]: [...(prev[dateStr] || []), newTask],
              }));
              
              console.log('✅ Tarefa criada com sucesso no planner mensal');
            }
            
            // Recarregar tarefas para mostrar as recorrentes expandidas
            await loadReviews(true);
          } catch (error) {
            console.error('❌ Erro ao criar tarefa:', error);
            alert('Erro ao criar tarefa. Tente novamente.');
          }
        }}
        selectedDate={selectedDate || undefined}
        selectedHour={8}
      />

      <DayTasksModal
        isOpen={isDayTasksModalOpen}
        onClose={() => {
          setIsDayTasksModalOpen(false);
          setSelectedDayTasks([]);
        }}
        date={selectedDate || new Date()}
        tasks={selectedDayTasks}
        onTaskAction={(task) => {
          setIsDayTasksModalOpen(false);
          setSelectedTask(task as GroupedReview | ManualTask);
        }}
      />

      {/* Modal de ações da tarefa */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center animate-fade-in" onClick={() => setSelectedTask(null)}>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl dark:shadow-dark-2xl p-6 w-96 border-2 border-border-light dark:border-border-dark animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                {'content_type' in selectedTask ? getGroupedTitle(selectedTask.content_type, selectedTask.count) : selectedTask.title}
              </h3>
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-all duration-200 hover:scale-110 group"
              >
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary transition-colors">close</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {selectedTask.source === 'system' ? (
                <button
                  onClick={async () => {
                    const task = selectedTask as GroupedReview;
                    const contentIds = task.reviewIds || [];
                    
                    // Encontrar a data do evento selecionado
                    // O ID do task contém a data no formato "grouped-YYYY-MM-DD-CONTENT_TYPE"
                    let eventDate = '';
                    if (task.id.startsWith('grouped-')) {
                      const parts = task.id.split('-');
                      // Formato: grouped-YYYY-MM-DD-CONTENT_TYPE
                      eventDate = `${parts[1]}-${parts[2]}-${parts[3]}`;
                    } else if (selectedDate) {
                      eventDate = format(selectedDate, 'yyyy-MM-dd');
                    } else {
                      // Fallback para hoje
                      eventDate = format(new Date(), 'yyyy-MM-dd');
                    }
                    
                    try {
                      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
                      
                      // Usar o novo endpoint que busca/cria sessão para data específica
                      const response = await fetchWithAuth('/api/review-sessions/for-date', {
                        method: 'POST',
                        body: JSON.stringify({
                          content_type: task.content_type,
                          date: eventDate,
                          review_ids: contentIds,
                        }),
                      });

                      if (!response.ok) {
                        throw new Error('Erro ao criar sessão');
                      }

                      const result = await response.json();
                      const sessionId = result.data.session.id;
                      
                      let url = '';
                      if (task.content_type === 'FLASHCARD') {
                        url = `/revisoes/flashcards/sessao/${sessionId}`;
                      } else if (task.content_type === 'QUESTION') {
                        url = `/revisoes/questoes/sessao/${sessionId}`;
                      } else if (task.content_type === 'ERROR_NOTEBOOK') {
                        url = `/revisoes/caderno-erros/sessao/${sessionId}`;
                      }
                      
                      if (url) {
                        router.push(url);
                      }
                    } catch (error) {
                      console.error('Erro ao iniciar revisão:', error);
                      alert('Erro ao iniciar revisão. Tente novamente.');
                    }
                  }}
                  className="flex-1 bg-primary text-white py-2.5 px-4 rounded-lg font-semibold shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl hover:bg-primary/90 hover:scale-[1.02] transition-all duration-300 ease-out flex items-center justify-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:scale-110">play_arrow</span>
                  Iniciar Revisão
                </button>
              ) : (
                <>
                  {selectedTask.status === 'completed' ? (
                    <button
                      onClick={async () => {
                        // Implementar desmarcar como concluída
                        alert('Funcionalidade em desenvolvimento');
                      }}
                      className="flex-1 bg-yellow-500 text-white py-2.5 px-4 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:bg-yellow-600 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-xl">restart_alt</span>
                      Desmarcar como Concluída
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        // Implementar marcar como concluída
                        alert('Funcionalidade em desenvolvimento');
                      }}
                      className="flex-1 bg-green-500 text-white py-2.5 px-4 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:bg-green-600 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-xl">check_circle</span>
                      Marcar como Concluída
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      // Implementar remover tarefa
                      alert('Funcionalidade em desenvolvimento');
                    }}
                    className="flex-1 bg-red-500 text-white py-2.5 px-4 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:bg-red-600 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                    Remover
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
