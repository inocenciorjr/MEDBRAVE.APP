'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format, startOfWeek, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { TaskSource, TaskPermissions, getDefaultPermissions } from './types';
import { CreateTaskModal } from './CreateTaskModal';
import { plannerService } from '@/lib/services/plannerService';
import { Tooltip } from './Tooltip';
import router from 'next/router';

interface DailyPlannerNativeProps {
  currentDate: Date;
}

interface Event {
  id: string;
  title: string;
  subtitle?: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  color: string;
  content_type: string;
  day_index: number;
  icon: string;
  source: TaskSource;
  permissions: TaskPermissions;
  status?: 'pending' | 'in_progress' | 'completed';
  completed_count?: number;
  total_count?: number;
  metadata?: {
    count?: number;
    reviewIds?: string[];
    dbId?: string;
    [key: string]: any;
  };
}

interface DragState {
  eventId: string | null;
  mode: 'move' | 'resize' | null;
  startX: number;
  startY: number;
  originalEvent: Event | null;
  currentX: number;
  currentY: number;
}

const CELL_HEIGHT = 48; // Altura de cada célula de hora (h-12 = 48px)
const CELL_HEIGHT_WITH_BORDER = 50; // Altura incluindo borda inferior (48px + 2px border-b)
const HEADER_HEIGHT = 56; // Altura do header (h-14)
const HOURS_START = 6;
const HOURS_END = 23; // Estendido até 23h para cobrir o dia todo
const SNAP_MINUTES = 60; // Snap a cada 1 hora

export function DailyPlannerNative({ currentDate }: DailyPlannerNativeProps) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ dayIndex: number; hour: number } | null>(null);
  const [studyDays, setStudyDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); // Todos os dias por padrão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const [dragState, setDragState] = useState<DragState>({
    eventId: null,
    mode: null,
    startX: 0,
    startY: 0,
    originalEvent: null,
    currentX: 0,
    currentY: 0,
  });

  const gridRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const cacheRef = useRef<Map<string, Event[]>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 1 = Segunda-feira
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: HOURS_END - HOURS_START + 1 }, (_, i) => i + HOURS_START);
  
  // Limpar cache antigo (manter apenas 4 semanas)
  const cleanOldCache = () => {
    if (cacheRef.current.size > 4) {
      const keys = Array.from(cacheRef.current.keys());
      const sortedKeys = keys.sort();
      // Remover as mais antigas
      sortedKeys.slice(0, sortedKeys.length - 4).forEach(key => {
        cacheRef.current.delete(key);
      });
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    // Sempre mostrar loading e carregar dados frescos
    // Não usar cache para evitar mostrar dados antigos
    setLoading(true);
    setEvents([]);
    loadReviews(false);
    
    loadStudyPreferences();
    
    // Prefetch semanas adjacentes após carregar a semana atual
    setTimeout(() => {
      prefetchAdjacentWeeks();
    }, 1000);
  }, [currentDate]);
  
  const prefetchAdjacentWeeks = async () => {
    // Carregar semana anterior e próxima em background
    const prevWeek = subDays(weekStart, 7);
    const nextWeek = addDays(weekStart, 7);
    
    [prevWeek, nextWeek].forEach(async (week) => {
      const weekKey = format(week, 'yyyy-MM-dd');
      if (!cacheRef.current.has(weekKey) && !loadingRef.current.has(weekKey)) {
        loadingRef.current.add(weekKey);
        try {
          const weekDays = Array.from({ length: 7 }, (_, i) => addDays(week, i));
          await loadWeekData(weekDays, weekKey);
        } catch (error) {
          console.error('Erro ao prefetch:', error);
        } finally {
          loadingRef.current.delete(weekKey);
        }
      }
    });
  };

  const loadStudyPreferences = async () => {
    try {
      // Buscar preferências via API ao invés de acessar Supabase diretamente
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

  const loadWeekData = async (days: Date[], weekKey: string) => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return [];

    const startDate = format(days[0], 'yyyy-MM-dd');
    const endDate = format(days[6], 'yyyy-MM-dd');
    const weekStartDate = days[0];
    
    // Carregar em paralelo para melhor performance
    const [savedEvents, reviewsResponse] = await Promise.all([
      plannerService.getEvents(startDate, endDate),
      fetch(`/api/unified-reviews/planner?limit=200&startDate=${startDate}&endDate=${endDate}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
    ]);
    
    const result = await reviewsResponse.json();
    
    if (!result.success) {
      throw new Error('Erro ao carregar revisões');
    }
    
    // Criar mapa de eventos salvos por data e tipo
    const savedEventsMap: Record<string, any> = {};
    savedEvents.forEach(event => {
      const key = `${event.date}-${event.content_type}`;
      savedEventsMap[key] = event;
    });
    const groupedReviews: Record<string, Record<string, any[]>> = {};
    
    // O novo endpoint já retorna agrupado por data
    Object.entries(result.data.grouped).forEach(([dateKey, types]: [string, any]) => {
      
      // Usar data local sem timezone para evitar problemas de deslocamento
      const reviewDate = new Date(dateKey + 'T00:00:00');
      const weekStartLocal = new Date(weekStart);
      weekStartLocal.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((reviewDate.getTime() - weekStartLocal.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0 && daysDiff < 7) {
        const dayKey = `day-${daysDiff}`;
        groupedReviews[dayKey] = {};
        
        Object.entries(types).forEach(([typeKey, data]: [string, any]) => {
          groupedReviews[dayKey][typeKey] = data; // Salvar o objeto completo, não apenas reviews
        });
      }
    });

    const newEvents: Event[] = [];
    
    Object.entries(groupedReviews).forEach(([dayKey, types]) => {
      const dayIndex = parseInt(dayKey.split('-')[1]);
      const orderedTypes: Array<'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK'> = ['FLASHCARD', 'QUESTION', 'ERROR_NOTEBOOK'];
      
      orderedTypes.forEach((contentType) => {
        const typeData = types[contentType] as any;
        const reviews = typeData?.reviews || [];
        
        // Verificar se existe evento salvo
        const dateStr = format(days[dayIndex], 'yyyy-MM-dd');
        const savedKey = `${dateStr}-${contentType}`;
        const savedEvent = savedEventsMap[savedKey];
        
        // Se não tem revisões E não tem evento salvo, pular
        // MAS se tem evento salvo (mesmo sem revisões), continuar para mostrar o card
        if (reviews.length === 0 && !savedEvent) return;
        
        // Horários padrão: Flashcards às 8h, Questões às 9h, Caderno às 10h
        const defaultStartHours: Record<string, number> = {
          'FLASHCARD': 8,
          'QUESTION': 9,
          'ERROR_NOTEBOOK': 10,
        };
        
        const startHour = savedEvent?.start_hour ?? defaultStartHours[contentType] ?? 8;
        const startMinute = savedEvent?.start_minute ?? 0;
        const endHour = savedEvent?.end_hour ?? (startHour + 1);
        const endMinute = savedEvent?.end_minute ?? 0;
        
        // Usar dados do planner_events como fonte de verdade
        const completedCount = typeData?.completed_count || savedEvent?.completed_count || 0;
        const totalCount = typeData?.count || savedEvent?.total_count || reviews.length;
        const pendingCount = reviews.length;
        
        // Determinar status real: só está completo se não há pendentes
        const actualStatus = pendingCount === 0 && completedCount > 0 ? 'completed' : 'pending';
        
        // Verificar se a tarefa está atrasada (data anterior a hoje e não completada)
        const taskDate = new Date(weekDays[dayIndex]);
        taskDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isOverdue = taskDate.getTime() < today.getTime() && actualStatus !== 'completed';
        
        // Se atrasada, usar vermelho; senão, usar cor padrão
        const taskColor = isOverdue ? 'red' : getColorByContentType(contentType);
        

        // Combinar IDs de revisões pendentes e completadas
        const completedReviews = typeData?.completed_reviews || [];
        const allContentIds = [
          ...completedReviews.map((r: any) => r.id),
          ...reviews.map((r: any) => r.id),
        ];
        
        newEvents.push({
          id: savedEvent?.id || `grouped-${dayIndex}-${contentType}`,
          title: getGroupedTitle(contentType),
          subtitle: savedEvent?.status === 'completed' 
            ? 'Concluído' 
            : totalCount > 0 
              ? `${totalCount} ${totalCount === 1 ? 'item' : 'itens'}` 
              : 'Sem revisões',
          start_hour: startHour,
          start_minute: startMinute,
          end_hour: endHour,
          end_minute: endMinute,
          color: taskColor,
          content_type: contentType,
          day_index: dayIndex,
          icon: getIconByContentType(contentType),
          source: 'system',
          permissions: getDefaultPermissions('system'),
          status: savedEvent?.status || 'pending',
          completed_count: completedCount,
          total_count: totalCount,
          metadata: {
            count: reviews.length,
            reviewIds: reviews.map((r: any) => r.id),
            contentIds: allContentIds,
            dbId: savedEvent?.id,
            isOverdue,
          },
        });
      });
    });

    // Adicionar eventos salvos que não têm revisões pendentes (ex: tarefas completadas)
    // IMPORTANTE: Esta lógica garante que cards completados continuem visíveis
    const systemEvents = savedEvents.filter(e => e.event_type === 'system_review');
    systemEvents.forEach(event => {
      // Usar data local sem timezone para evitar problemas de deslocamento
      const eventDate = new Date(event.date + 'T00:00:00');
      const weekStartLocal = new Date(weekStart);
      weekStartLocal.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((eventDate.getTime() - weekStartLocal.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0 && daysDiff < 7 && event.content_type) {
        const dayKey = `day-${daysDiff}`;
        const contentType = event.content_type;
        
        // Filtrar apenas tipos válidos de revisão (ignorar USER_TASK e outros)
        const validTypes = ['FLASHCARD', 'QUESTION', 'ERROR_NOTEBOOK'];
        if (!validTypes.includes(contentType)) return;
        
        // Verificar se já foi adicionado (tem revisões pendentes)
        const alreadyAdded = newEvents.some(e => 
          e.day_index === daysDiff && e.content_type === contentType
        );
        
        if (!alreadyAdded) {
          // Adicionar evento sem revisões pendentes (completado ou sem revisões)
          const eventDateCopy = new Date(eventDate);
          eventDateCopy.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isOverdue = eventDateCopy < today && event.status !== 'completed';
          const taskColor = isOverdue ? 'red' : getColorByContentType(contentType);
          
          console.log(`[Planner] Adicionando evento salvo sem revisões pendentes: ${contentType} em ${event.date} (status: ${event.status})`);
          
          newEvents.push({
            id: event.id || `saved-${daysDiff}-${contentType}`,
            title: getGroupedTitle(contentType),
            subtitle: event.status === 'completed' ? 'Concluído' : `${event.total_count || 0} itens`,
            start_hour: event.start_hour,
            start_minute: event.start_minute,
            end_hour: event.end_hour,
            end_minute: event.end_minute,
            color: taskColor,
            content_type: contentType,
            day_index: daysDiff,
            icon: getIconByContentType(contentType),
            source: 'system',
            permissions: getDefaultPermissions('system'),
            status: event.status || 'pending',
            completed_count: event.completed_count || 0,
            total_count: event.total_count || 0,
            metadata: {
              count: 0,
              reviewIds: [],
              contentIds: [],
              dbId: event.id,
              isOverdue,
            },
          });
        }
      }
    });

    // Adicionar tarefas do usuário
    const userTasks = savedEvents.filter(e => e.event_type === 'user_task');
    userTasks.forEach(task => {
      // Usar mesma lógica das revisões do sistema
      const taskDate = new Date(task.date + 'T00:00:00');
      const daysDiff = Math.floor((taskDate.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0 && daysDiff < 7) {
        newEvents.push({
          id: task.id || `user-task-${Date.now()}`,
          title: task.title,
          subtitle: task.description,
          start_hour: task.start_hour,
          start_minute: task.start_minute,
          end_hour: task.end_hour,
          end_minute: task.end_minute,
          color: task.color,
          content_type: 'USER_TASK',
          day_index: daysDiff,
          icon: task.icon,
          source: 'user',
          permissions: task.parent_event_id ? {
            // Instâncias recorrentes não podem ser arrastadas/redimensionadas
            canChangeDays: false,
            canChangeTime: false,
            canChangeDuration: false,
            canDelete: true,  // Mas podem ser deletadas (com opções)
            canEdit: false,
          } : getDefaultPermissions('user'),
          status: task.status || 'pending',
          completed_count: task.completed_count || 0,
          total_count: task.total_count || 1,
          metadata: {
            ...task.metadata,
            dbId: task.id,
            parentEventId: task.parent_event_id,
            isRecurring: task.is_recurring,
          },
        });
      }
    });

    // Salvar no cache
    cacheRef.current.set(weekKey, newEvents);
    
    // Limpar cache antigo
    cleanOldCache();
    
    return newEvents;
  };

  const loadReviews = async (isBackgroundUpdate = false) => {
    try {
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const newEvents = await loadWeekData(weekDays, weekKey);
      
      // Atualizar eventos
      setEvents(newEvents);
      
      if (!isBackgroundUpdate) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao carregar revisões:', error);
      if (!isBackgroundUpdate) {
        setLoading(false);
      }
    }
  };

  const getGroupedTitle = (contentType: string): string => {
    switch (contentType) {
      case 'FLASHCARD': return 'Flashcards';
      case 'QUESTION': return 'Questões';
      case 'ERROR_NOTEBOOK': return 'Caderno de Erros';
      default: return 'Revisão';
    }
  };

  const getColorByContentType = (contentType: string) => {
    switch (contentType) {
      case 'QUESTION': return 'cyan';
      case 'FLASHCARD': return 'purple';
      case 'ERROR_NOTEBOOK': return 'green';
      default: return 'gray';
    }
  };

  const getIconByContentType = (contentType: string) => {
    switch (contentType) {
      case 'QUESTION': return 'list_alt';
      case 'FLASHCARD': return 'layers';
      case 'ERROR_NOTEBOOK': return 'book';
      default: return 'event';
    }
  };

  const getColorClasses = (color: string) => {
    const classes: Record<string, string> = {
      cyan: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200',
      purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
      red: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
      orange: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200',
      pink: 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200',
      blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
      green: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
      gray: 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200',
    };
    return classes[color] || 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  // Versão com transparência para cards com barra de progresso
  const getColorClassesWithProgress = (color: string) => {
    const classes: Record<string, string> = {
      cyan: 'bg-cyan-100/60 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200',
      purple: 'bg-purple-100/60 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
      red: 'bg-red-100/60 dark:bg-red-900/30 text-red-800 dark:text-red-200',
      orange: 'bg-orange-100/60 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
      pink: 'bg-pink-100/60 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200',
      blue: 'bg-blue-100/60 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
      green: 'bg-green-100/60 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      yellow: 'bg-yellow-100/60 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      gray: 'bg-gray-100/60 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200',
    };
    return classes[color] || 'bg-gray-200/60 dark:bg-gray-700/30 text-gray-800 dark:text-gray-200';
  };

  // Converter minutos desde o início do dia para posição Y (para eventos dentro das células)
  const minutesToY = (hour: number, minute: number): number => {
    const totalMinutes = (hour - HOURS_START) * 60 + minute;
    return (totalMinutes / 60) * CELL_HEIGHT;
  };
  
  // Converter minutos para posição Y considerando bordas (para linha do tempo)
  const minutesToYWithBorder = (hour: number, minute: number): number => {
    const totalMinutes = (hour - HOURS_START) * 60 + minute;
    // Cada hora completa = 48px (célula) + 2px (borda) = 50px
    // Para minutos dentro da hora, usar proporção da célula (48px)
    const completedHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    // Posição = (horas completas * 50px) + (minutos proporcionais * 48px/60)
    return (completedHours * CELL_HEIGHT_WITH_BORDER) + (remainingMinutes / 60 * CELL_HEIGHT);
  };

  // Converter posição Y para hora e minuto com snap
  const yToTime = (y: number): { hour: number; minute: number } => {
    const totalMinutes = Math.round((y / CELL_HEIGHT) * 60);
    const snappedMinutes = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    
    const hour = Math.floor(snappedMinutes / 60) + HOURS_START;
    const minute = snappedMinutes % 60;
    
    return {
      hour: Math.max(HOURS_START, Math.min(HOURS_END, hour)),
      minute: Math.max(0, Math.min(59, minute)),
    };
  };

  // Calcular posição do evento
  const getEventPosition = (event: Event) => {
    const top = minutesToY(event.start_hour, event.start_minute) - 5; // -5px para subir
    const bottom = minutesToY(event.end_hour, event.end_minute) - 5;
    const height = bottom - top;
    
    return { top, height };
  };

  // Detectar sobreposições e calcular layout em colunas
  const getEventLayout = (event: Event, dayIdx: number) => {
    const eventsInDay = events.filter(e => e.day_index === dayIdx);
    const { top: eventTop, height: eventHeight } = getEventPosition(event);
    const eventBottom = eventTop + eventHeight;
    
    // Encontrar eventos que se sobrepõem
    const overlapping = eventsInDay.filter(e => {
      if (e.id === event.id) return false;
      const { top, height } = getEventPosition(e);
      const bottom = top + height;
      
      // Verifica se há sobreposição
      return !(bottom <= eventTop || top >= eventBottom);
    });
    
    if (overlapping.length === 0) {
      return { left: '0.25rem', right: '0.25rem', zIndex: 10 };
    }
    
    // Ordenar por horário de início para determinar a ordem das colunas
    const allOverlapping = [...overlapping, event].sort((a, b) => {
      const aStart = a.start_hour * 60 + a.start_minute;
      const bStart = b.start_hour * 60 + b.start_minute;
      if (aStart !== bStart) return aStart - bStart;
      // Se começam no mesmo horário, tarefas do sistema vêm primeiro
      return a.source === 'system' ? -1 : 1;
    });
    
    const totalColumns = allOverlapping.length;
    const columnIndex = allOverlapping.findIndex(e => e.id === event.id);
    const columnWidth = 100 / totalColumns;
    
    return {
      left: `calc(${columnIndex * columnWidth}% + 0.25rem)`,
      right: `calc(${(totalColumns - columnIndex - 1) * columnWidth}% + 0.25rem)`,
      zIndex: 10 + columnIndex,
    };
  };

  // Iniciar drag (mover)
  const handleMouseDownMove = useCallback((e: React.MouseEvent, event: Event) => {
    if (!event.permissions.canChangeTime) return;
    
    // Só inicia o drag se mover mais de 10px
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;
    
    const handleMove = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startX);
      const deltaY = Math.abs(moveEvent.clientY - startY);
      
      if (deltaX > 10 || deltaY > 10) {
        hasMoved = true;
        isDraggingRef.current = true;
        window.removeEventListener('mousemove', handleMove);
        
        e.stopPropagation();
        e.preventDefault();
        
        setDragState({
          eventId: event.id,
          mode: 'move',
          startX: startX,
          startY: startY,
          originalEvent: { ...event },
          currentX: moveEvent.clientX,
          currentY: moveEvent.clientY,
        });
      }
    };
    
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, []);

  // Iniciar resize
  const handleMouseDownResize = useCallback((e: React.MouseEvent, event: Event) => {
    if (!event.permissions.canChangeDuration) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    isDraggingRef.current = true;
    
    setDragState({
      eventId: event.id,
      mode: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      originalEvent: { ...event },
      currentX: e.clientX,
      currentY: e.clientY,
    });
  }, []);

  // Mouse move global
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Verificar se ainda está em drag (pode ter sido limpo pelo mouseup)
    if (!dragState.eventId || !dragState.originalEvent || !dragState.mode || !isDraggingRef.current) return;
    
    // Prevenir seleção de texto durante o drag
    e.preventDefault();
    
    setDragState(prev => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY,
    }));
    
    const deltaY = e.clientY - dragState.startY;
    const event = dragState.originalEvent;
    
    if (dragState.mode === 'move') {
      // Calcular nova posição
      const currentTop = minutesToY(event.start_hour, event.start_minute);
      const newTop = Math.max(0, currentTop + deltaY);
      const newTime = yToTime(newTop);
      
      const duration = (event.end_hour - event.start_hour) * 60 + (event.end_minute - event.start_minute);
      const endTotalMinutes = (newTime.hour - HOURS_START) * 60 + newTime.minute + duration;
      const endHour = Math.floor(endTotalMinutes / 60) + HOURS_START;
      const endMinute = endTotalMinutes % 60;
      
      if (endHour <= HOURS_END) {
        setEvents(prev => prev.map(evt =>
          evt.id === event.id
            ? { ...evt, start_hour: newTime.hour, start_minute: newTime.minute, end_hour: endHour, end_minute: endMinute }
            : evt
        ));
      }
    } else if (dragState.mode === 'resize') {
      // Calcular nova duração
      const currentBottom = minutesToY(event.end_hour, event.end_minute);
      const minBottom = minutesToY(event.start_hour, event.start_minute) + CELL_HEIGHT; // Mínimo de 1 hora
      const newBottom = Math.max(minBottom, currentBottom + deltaY);
      const newEndTime = yToTime(newBottom);
      
      // Validar: deve ter no mínimo 1 hora de duração
      const durationMinutes = (newEndTime.hour - event.start_hour) * 60 + (newEndTime.minute - event.start_minute);
      
      if (newEndTime.hour <= HOURS_END && durationMinutes >= 60) {
        setEvents(prev => prev.map(evt =>
          evt.id === event.id
            ? { ...evt, end_hour: newEndTime.hour, end_minute: newEndTime.minute }
            : evt
        ));
      }
    }
  }, [dragState]);

  // Mouse up global
  const handleMouseUp = useCallback(async (e: MouseEvent) => {
    // Limpar flag imediatamente
    isDraggingRef.current = false;
    
    if (dragState.eventId && dragState.originalEvent) {
      // Processar a posição final ANTES de limpar o dragState
      const finalEvent = events.find(evt => evt.id === dragState.eventId);
      
      if (finalEvent) {
        // Salvar mudanças no backend
        try {
          const dateStr = format(weekDays[finalEvent.day_index], 'yyyy-MM-dd');
          const dbId = finalEvent.metadata?.dbId;
          
          // Determinar o event_type baseado no content_type
          const isUserTask = finalEvent.content_type === 'USER_TASK';
          
          const eventData = {
            event_type: isUserTask ? 'user_task' as const : 'system_review' as const,
            content_type: finalEvent.content_type,
            title: finalEvent.title,
            date: dateStr,
            start_hour: finalEvent.start_hour,
            start_minute: finalEvent.start_minute,
            end_hour: finalEvent.end_hour,
            end_minute: finalEvent.end_minute,
            color: finalEvent.color,
            icon: finalEvent.icon,
            total_count: finalEvent.total_count || finalEvent.metadata?.count || 0,
            completed_count: finalEvent.completed_count || 0,
            status: finalEvent.status || 'pending',
            metadata: finalEvent.metadata,
          };
          
          if (dbId) {
            // Atualizar evento existente
            await plannerService.updateEvent(dbId, eventData);
          } else {
            // Criar novo evento
            const savedEvent = await plannerService.createEvent(eventData);
            // Atualizar o ID local com o ID do banco
            setEvents(prev => prev.map(evt =>
              evt.id === finalEvent.id
                ? { ...evt, metadata: { ...evt.metadata, dbId: savedEvent.id } }
                : evt
            ));
          }
          
          console.log('✅ Evento salvo com sucesso');
        } catch (error) {
          console.error('❌ Erro ao salvar evento:', error);
          // Reverter para o estado original em caso de erro
          if (dragState.originalEvent) {
            setEvents(prev => prev.map(evt =>
              evt.id === dragState.eventId ? dragState.originalEvent! : evt
            ));
          }
        }
      }
    }
    
    // Limpar dragState imediatamente para evitar movimento após soltar
    const wasDragging = dragState.eventId !== null;
    
    setDragState({
      eventId: null,
      mode: null,
      startX: 0,
      startY: 0,
      originalEvent: null,
      currentX: 0,
      currentY: 0,
    });
    
    // Pequeno delay apenas para prevenir onClick após drag
    if (wasDragging) {
      setTimeout(() => {
        // Flag para prevenir onClick
      }, 50);
    }
  }, [dragState, events, weekDays]);

  // Adicionar listeners globais
  useEffect(() => {
    if (dragState.eventId) {
      const handleMove = (e: MouseEvent) => handleMouseMove(e);
      const handleUp = (e: MouseEvent) => handleMouseUp(e);
      
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      // Adicionar mouseup no document também para garantir
      document.addEventListener('mouseup', handleUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        document.removeEventListener('mouseup', handleUp);
      };
    }
  }, [dragState.eventId, handleMouseMove, handleMouseUp]);

  if (loading) {
    const { DailyPlannerSkeleton } = require('./DailyPlannerSkeleton');
    return <DailyPlannerSkeleton />;
  }

  return (
    <>
      {/* Botão flutuante */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 z-40 group">
        <button
          onClick={() => {
            setSelectedCell({ dayIndex: 0, hour: 8 });
            setIsCreateModalOpen(true);
          }}
          className="bg-primary text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 flex items-center justify-center shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl hover:bg-primary/90 transition-all duration-300 ease-out hover:scale-110 hover:rotate-90"
        >
          <span className="material-symbols-outlined text-xl sm:text-2xl lg:text-3xl transition-transform duration-300 group-hover:scale-110">add</span>
        </button>
        <Tooltip text="Criar nova tarefa" position="left" />
      </div>

      <div ref={gridRef} className="relative select-none overflow-x-auto">
        <div className="border sm:border-2 border-border-light dark:border-border-dark rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl dark:shadow-dark-xl sm:dark:shadow-dark-2xl bg-surface-light dark:bg-surface-dark min-w-[600px] sm:min-w-0">
          {/* Header Row */}
          <div className="grid grid-cols-[50px,repeat(7,1fr)] sm:grid-cols-[70px,repeat(7,1fr)] lg:grid-cols-[100px,repeat(7,1fr)] border-b sm:border-b-2 border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark shadow-lg dark:shadow-dark-lg">
            {/* Canto superior esquerdo */}
            <div className="h-10 sm:h-12 lg:h-14 bg-surface-light dark:bg-surface-dark border-r sm:border-r-2 border-border-light dark:border-border-dark flex items-center justify-center">
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-lg sm:text-xl lg:text-2xl">schedule</span>
            </div>
            
            {/* Headers dos dias */}
            {weekDays.map((day, i) => {
            const dayName = format(day, 'EEE', { locale: ptBR });
            const dayNameShort = dayName.charAt(0).toUpperCase();
            const dayNum = format(day, 'd');
            const today = isToday(day);
            
            return (
              <div
                key={i}
                className={`h-10 sm:h-12 lg:h-14 flex flex-col items-center justify-center gap-0.5 sm:gap-1 bg-background-light dark:bg-background-dark ${i > 0 ? 'border-l sm:border-l-2' : ''} border-border-light dark:border-border-dark hover:bg-primary/5 dark:hover:bg-primary/10 hover:shadow-lg dark:hover:shadow-dark-lg group cursor-pointer`}
              >
                <span className="font-display font-bold text-[10px] sm:text-xs uppercase tracking-wider text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary group-hover:scale-105">
                  <span className="sm:hidden">{dayNameShort}</span>
                  <span className="hidden sm:inline">{dayName}</span>
                </span>
                {today ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-md animate-pulse"></div>
                    <span className="relative text-[10px] sm:text-xs lg:text-sm font-display font-bold bg-gradient-to-br from-primary to-primary/80 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 inline-flex items-center justify-center shadow-xl dark:shadow-dark-xl ring-1 sm:ring-2 ring-primary/30 animate-pulse">
                      {dayNum}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] sm:text-xs lg:text-sm font-inter font-bold text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary group-hover:scale-110">
                    {dayNum}
                  </span>
                )}
              </div>
            );
          })}
          </div>

          {/* Grid de conteúdo */}
          <div className="grid grid-cols-[50px,repeat(7,1fr)] sm:grid-cols-[70px,repeat(7,1fr)] lg:grid-cols-[100px,repeat(7,1fr)]">
            {/* Coluna de horários */}
            <div className="sticky left-0 z-20 bg-background-light dark:bg-background-dark border-r sm:border-r-2 border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg">
              {hours.map(hour => (
                <div key={hour} className="h-10 sm:h-11 lg:h-12 flex items-center justify-center text-[10px] sm:text-xs font-display font-bold text-text-light-secondary dark:text-text-dark-secondary border-b sm:border-b-2 border-border-light dark:border-border-dark hover:bg-primary/5 dark:hover:bg-primary/10 group">
                  <span className="group-hover:text-primary group-hover:scale-110">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Grid de células */}
            {weekDays.map((day, dayIdx) => {
            const dayOfWeek = day.getDay(); // 0 = Domingo, 1 = Segunda, etc.
            const isStudyDay = studyDays.includes(dayOfWeek);
            const now = new Date();
            
            return (
              <div
                key={dayIdx}
                className={`relative border-r sm:border-r-2 border-border-light dark:border-border-dark`}
                style={!isStudyDay ? {
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.05), rgba(168, 85, 247, 0.05) 10px, rgba(168, 85, 247, 0.15) 10px, rgba(168, 85, 247, 0.15) 20px)',
                  backgroundColor: 'rgba(168, 85, 247, 0.03)'
                } : {}}
              >
                {/* Células de hora */}
                {hours.map((hour) => {
                  // Verificar se o horário já passou
                  const cellDate = new Date(day);
                  cellDate.setHours(hour, 0, 0, 0);
                  const isPast = cellDate < now;
                  
                  return (
                    <div
                      key={hour}
                      className={`h-10 sm:h-11 lg:h-12 border-b sm:border-b-2 border-border-light dark:border-border-dark ${
                        isPast 
                          ? `cursor-not-allowed opacity-50 ${isStudyDay ? 'bg-background-light dark:bg-background-dark' : ''}` 
                          : `cursor-pointer hover:bg-primary/10 hover:shadow-inner ${isStudyDay ? 'bg-background-light dark:bg-background-dark' : ''}`
                      } group`}
                      onClick={() => {
                        if (!isPast) {
                          setSelectedCell({ dayIndex: dayIdx, hour });
                          setIsCreateModalOpen(true);
                        }
                      }}
                      title={isPast ? 'Não é possível criar tarefas no passado' : 'Clique para criar tarefa neste horário'}
                    />
                  );
                })}

                {/* Eventos */}
                {events
                  .filter(e => e.day_index === dayIdx)
                  .map(event => {
                    const { top, height } = getEventPosition(event);
                    const layout = getEventLayout(event, dayIdx);
                    const isDragging = dragState.eventId === event.id;
                    
                    return (
                      <div
                        key={event.id}
                        className={`absolute rounded-2xl shadow-lg dark:shadow-dark-lg overflow-hidden border border-border-light/50 dark:border-border-dark/50 ${
                          isDragging ? 'shadow-2xl dark:shadow-dark-2xl opacity-90 cursor-grabbing transition-none scale-105' : 
                          (() => {
                            // Verificar se é data futura para revisões do sistema
                            if (event.source === 'system') {
                              const eventDate = weekDays[event.day_index];
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const eventDateCopy = new Date(eventDate);
                              eventDateCopy.setHours(0, 0, 0, 0);
                              
                              if (eventDateCopy > today) {
                                return 'cursor-not-allowed opacity-60 hover:opacity-70 transition-all duration-300 ease-out';
                              }
                            }
                            return 'cursor-grab hover:shadow-xl dark:hover:shadow-dark-xl hover:scale-[1.02] hover:-translate-y-0.5 hover:z-50 transition-all duration-300 ease-out';
                          })()
                        }`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: layout.left,
                          right: layout.right,
                          zIndex: isDragging ? 100 : layout.zIndex,
                        }}
                        onMouseDown={(e) => {
                          const target = e.target as HTMLElement;
                          // Se clicou no handle de resize, não fazer nada
                          if (target.closest('.resize-handle')) return;
                          handleMouseDownMove(e, event);
                        }}
                        onClick={(e) => {
                          // Só abre o modal se não estiver arrastando
                          if (!isDragging && !dragState.eventId && !dragState.mode) {
                            // Verificar se é data futura para revisões do sistema
                            if (event.source === 'system') {
                              const eventDate = weekDays[event.day_index];
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const eventDateCopy = new Date(eventDate);
                              eventDateCopy.setHours(0, 0, 0, 0);
                              
                              if (eventDateCopy > today) {
                                // Não abrir modal para datas futuras
                                return;
                              }
                            }
                            setSelectedEvent(event);
                          }
                        }}
                      >
                        {/* Barra de progresso OU barra inicial */}
                        {event.total_count !== undefined && event.total_count > 0 ? (
                          // Barra de progresso (substitui a borda e cresce)
                          <div 
                            className="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out rounded-l-2xl overflow-hidden"
                            style={{ 
                              width: `calc(${((event.completed_count || 0) / event.total_count) * 100}% + ${((event.completed_count || 0) / event.total_count) === 0 ? '12px' : '0px'})`
                            }}
                          >
                            {/* Fundo da barra - usando cores customizadas com contraste garantido */}
                            <div className={`absolute inset-0 ${
                              event.color === 'red' ? 'bg-progress-bar-red-light dark:bg-progress-bar-red-dark' :
                              event.color === 'purple' ? 'bg-progress-bar-purple-light dark:bg-progress-bar-purple-dark' :
                              event.color === 'cyan' ? 'bg-progress-bar-cyan-light dark:bg-progress-bar-cyan-dark' :
                              event.color === 'blue' ? 'bg-progress-bar-blue-light dark:bg-progress-bar-blue-dark' :
                              event.color === 'orange' ? 'bg-progress-bar-orange-light dark:bg-progress-bar-orange-dark' :
                              event.color === 'pink' ? 'bg-progress-bar-pink-light dark:bg-progress-bar-pink-dark' :
                              'bg-gray-600 dark:bg-gray-500'
                            }`} />
                            {/* Indicador de progresso (borda direita grossa com brilho e animação) */}
                            <div className={`absolute right-0 top-0 bottom-0 w-3 animate-pulse ${
                              event.color === 'red' ? 'bg-progress-bar-red-indicator-light dark:bg-progress-bar-red-indicator-dark shadow-[4px_0_20px_rgba(220,38,38,1),2px_0_10px_rgba(220,38,38,0.8)]' :
                              event.color === 'purple' ? 'bg-progress-bar-purple-indicator-light dark:bg-progress-bar-purple-indicator-dark shadow-[4px_0_20px_rgba(147,51,234,1),2px_0_10px_rgba(147,51,234,0.8)]' :
                              event.color === 'cyan' ? 'bg-progress-bar-cyan-indicator-light dark:bg-progress-bar-cyan-indicator-dark shadow-[4px_0_20px_rgba(6,182,212,1),2px_0_10px_rgba(6,182,212,0.8)]' :
                              event.color === 'blue' ? 'bg-progress-bar-blue-indicator-light dark:bg-progress-bar-blue-indicator-dark shadow-[4px_0_20px_rgba(37,99,235,1),2px_0_10px_rgba(37,99,235,0.8)]' :
                              event.color === 'orange' ? 'bg-progress-bar-orange-indicator-light dark:bg-progress-bar-orange-indicator-dark shadow-[4px_0_20px_rgba(234,88,12,1),2px_0_10px_rgba(234,88,12,0.8)]' :
                              event.color === 'pink' ? 'bg-progress-bar-pink-indicator-light dark:bg-progress-bar-pink-indicator-dark shadow-[4px_0_20px_rgba(219,39,119,1),2px_0_10px_rgba(219,39,119,0.8)]' :
                              'bg-gray-900 dark:bg-gray-300 shadow-[4px_0_20px_rgba(75,85,99,1),2px_0_10px_rgba(75,85,99,0.8)]'
                            }`} />
                          </div>
                        ) : (
                          // Barra inicial fixa (para cards sem progresso)
                          <div className="absolute left-0 top-0 bottom-0 w-3 rounded-l-2xl overflow-hidden">
                            <div className={`absolute inset-0 ${
                              event.color === 'red' ? 'bg-red-500' :
                              event.color === 'purple' ? 'bg-purple-500' :
                              event.color === 'cyan' ? 'bg-cyan-500' :
                              event.color === 'blue' ? 'bg-blue-500' :
                              event.color === 'orange' ? 'bg-orange-500' :
                              event.color === 'pink' ? 'bg-pink-500' :
                              'bg-gray-500'
                            }`} />
                          </div>
                        )}
                        
                        {/* Conteúdo do card - usa fundo semi-transparente quando tem barra de progresso */}
                        <div 
                          className={`relative py-2 flex items-center h-full group ${
                            event.total_count !== undefined && event.total_count > 0
                              ? getColorClassesWithProgress(event.color)
                              : getColorClasses(event.color)
                          }`} 
                          style={{ paddingLeft: height < 60 ? '0.625rem' : '0.75rem', paddingRight: height < 60 ? '0.375rem' : '0.5rem', gap: height < 60 ? '0.375rem' : '0.5rem' }}
                          title={(() => {
                            // Verificar se é data futura
                            const eventDate = weekDays[event.day_index];
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const eventDateCopy = new Date(eventDate);
                            eventDateCopy.setHours(0, 0, 0, 0);
                            
                            if (eventDateCopy > today && event.source === 'system') {
                              return 'Revisões futuras não podem ser iniciadas';
                            }
                            return '';
                          })()}
                        >
                          {/* Ícone - responsivo baseado na altura do card */}
                          <div 
                            className="rounded-full bg-white/40 dark:bg-white/20 flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-white/60 dark:group-hover:bg-white/30"
                            style={{
                              width: height < 60 ? 'clamp(1.5rem, 2.5vw, 1.75rem)' : `clamp(1.75rem, 3vw, 2.25rem)`,
                              height: height < 60 ? 'clamp(1.5rem, 2.5vw, 1.75rem)' : `clamp(1.75rem, 3vw, 2.25rem)`
                            }}
                          >
                            <span 
                              className="material-symbols-outlined transition-transform duration-300 group-hover:rotate-12"
                              style={{
                                fontSize: height < 60 ? 'clamp(0.875rem, 1.5vw, 1rem)' : `clamp(1rem, 1.8vw, 1.25rem)`
                              }}
                            >
                              {event.icon}
                            </span>
                          </div>
                          
                          {/* Conteúdo */}
                          <div className="flex-1 flex flex-col justify-center" style={{ gap: height < 60 ? '0.125rem' : '0.25rem' }}>
                            {/* Título - responsivo baseado na altura do card */}
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <div 
                                className="font-display font-bold leading-none transition-all duration-200 overflow-hidden text-ellipsis whitespace-nowrap flex-1"
                                style={{
                                  fontSize: height < 60 ? 'clamp(0.625rem, 1.2vw, 0.75rem)' : height < 100 ? 'clamp(0.75rem, 1.4vw, 0.875rem)' : `clamp(0.8125rem, 1.6vw, 1rem)`
                                }}
                              >
                                {event.title}
                              </div>

                            </div>
                            
                            {/* Horário/Progresso com transição - responsivo */}
                            <div 
                              className="relative font-inter leading-none overflow-visible"
                              style={{
                                fontSize: height < 60 ? 'clamp(0.5rem, 0.8vw, 0.625rem)' : height < 100 ? 'clamp(0.5625rem, 0.9vw, 0.6875rem)' : `clamp(0.625rem, 1vw, 0.75rem)`,
                                height: height < 60 ? '0.75rem' : height < 100 ? '0.875rem' : `clamp(0.9375rem, ${height / 55}rem, 1.125rem)`,
                                marginTop: height < 60 ? '0.125rem' : '0.1875rem'
                              }}
                            >
                              {/* Horário ou "Tarefa Atrasada!" (visível por padrão) - desce de cima */}
                              <div 
                                className="absolute inset-0 opacity-75 translate-y-0 transition-all duration-300 ease-in-out group-hover:opacity-0 group-hover:translate-y-full whitespace-nowrap"
                                style={{ overflow: 'visible' }}
                              >
                                {event.metadata?.isOverdue ? (
                                  <span 
                                    className="font-bold"
                                    style={{
                                      animation: 'blink 1.5s ease-in-out infinite'
                                    }}
                                  >
                                    Tarefa Atrasada!
                                  </span>
                                ) : (
                                  <>
                                    {event.start_hour.toString().padStart(2, '0')}:{event.start_minute.toString().padStart(2, '0')} - {
                                      event.end_hour >= 22 
                                        ? '+' 
                                        : `${event.end_hour.toString().padStart(2, '0')}:${event.end_minute.toString().padStart(2, '0')}`
                                    }
                                  </>
                                )}
                              </div>
                              
                              <style jsx>{`
                                @keyframes blink {
                                  0%, 100% { opacity: 1; }
                                  50% { opacity: 0; }
                                }
                              `}</style>
                              
                              {/* Progresso (visível no hover) - sobe de baixo */}
                              {event.source === 'system' && event.total_count !== undefined && event.total_count > 0 ? (
                                // Tarefas do sistema: mostrar contador e progresso
                                <div className="absolute left-0 right-0 font-semibold opacity-0 translate-y-full transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:translate-y-0 flex items-center justify-between pr-1">
                                  <span className="font-bold whitespace-nowrap">
                                    {event.completed_count || 0}/{event.total_count}
                                  </span>
                                  {((event.completed_count || 0) / event.total_count) === 1 ? (
                                    <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '1.4em' }}>
                                      check_circle
                                    </span>
                                  ) : (
                                    <span className="font-bold whitespace-nowrap">
                                      {Math.round(((event.completed_count || 0) / event.total_count) * 100)}%
                                    </span>
                                  )}
                                </div>
                              ) : event.source === 'user' ? (
                                // Tarefas manuais: mostrar status com ícone
                                <div className="absolute left-0 right-0 font-semibold opacity-0 translate-y-full transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:translate-y-0 flex items-center justify-between pr-1">
                                  <span className="font-bold whitespace-nowrap">
                                    {event.status === 'completed' ? 'Tarefa concluída' : 'Tarefa Pendente'}
                                  </span>
                                  <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '1.4em' }}>
                                    {event.status === 'completed' ? 'check_circle' : 'schedule'}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Handle de resize */}
                          {event.permissions.canChangeDuration && (
                            <div
                              className="resize-handle absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-black/20 dark:hover:bg-white/20 rounded-b-xl flex items-center justify-center group transition-all duration-200"
                              onMouseDown={(e) => handleMouseDownResize(e, event)}
                            >
                              <div className="w-10 h-1 bg-current opacity-30 group-hover:opacity-80 group-hover:w-12 rounded-full transition-all duration-300 ease-out"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
          </div>
        </div>

        {/* Linha do horário atual - só renderiza no cliente para evitar erro de hidratação */}
        {isMounted && (() => {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          if (currentHour >= HOURS_START && currentHour <= HOURS_END) {
            // Usar a MESMA lógica que os eventos (minutesToY)
            // minutesToY = (horas desde HOURS_START) * CELL_HEIGHT (48px)
            const totalMinutes = (currentHour - HOURS_START) * 60 + currentMinute;
            const hours = totalMinutes / 60;
            const positionInGrid = hours * CELL_HEIGHT; // 48px por hora, SEM bordas
            
            // Adicionar header + borda + metade da célula para centralizar no número
            const topPosition = positionInGrid + HEADER_HEIGHT + 2 + (CELL_HEIGHT / 2);
            
            return (
              <>
                {/* Chip em formato de seta centralizado na coluna */}
                <div 
                  className="absolute left-0 w-[100px] flex items-center justify-center z-30 pointer-events-none"
                  style={{ top: `${topPosition - 11}px` }}
                >
                  <div className="relative bg-red-500 text-white text-xs font-bold px-2 py-1 shadow-lg animate-pulse flex items-center" style={{ height: '22px' }}>
                    {format(now, 'HH:mm')}
                    {/* Seta na direita */}
                    <div 
                      className="absolute right-0 top-1/2"
                      style={{
                        transform: 'translate(100%, -50%)',
                        width: 0,
                        height: 0,
                        borderTop: '11px solid transparent',
                        borderBottom: '11px solid transparent',
                        borderLeft: '8px solid #ef4444'
                      }}
                    />
                  </div>
                </div>
                
                {/* Linha vermelha partindo da ponta da seta até a borda do grid */}
                <div 
                  className="absolute h-0.5 bg-red-500 z-30 pointer-events-none shadow-lg"
                  style={{ 
                    top: `${topPosition - 1}px`,
                    left: 'calc(50px + 23px + 8px)', // 50px (centro) + 23px (metade do chip) + 8px (seta)
                    width: 'calc(100% - 50px - 23px - 8px - 2px)' // Até a borda do container
                  }}
                />
              </>
            );
          }
          return null;
        })()}
      </div>

      {/* Modal de detalhes */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={() => setSelectedEvent(null)}>
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl dark:shadow-dark-2xl p-6 w-96 border-2 border-border-light dark:border-border-dark animate-zoom-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">{selectedEvent.title}</h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-all duration-200 hover:scale-110 group"
              >
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary transition-colors">close</span>
              </button>
            </div>
            
            {selectedEvent.subtitle && (
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
                {selectedEvent.subtitle}
              </p>
            )}
            
            <div className="flex flex-col gap-2">
              {selectedEvent.source === 'system' ? (
                <button
                  onClick={async () => {
                    // Verificar se a data é futura
                    const selectedDate = weekDays[selectedEvent.day_index];
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    selectedDate.setHours(0, 0, 0, 0);
                    
                    if (selectedDate > today) {
                      alert('Não é possível iniciar revisões de datas futuras. Aguarde até o dia da revisão.');
                      return;
                    }
                    
                    const contentType = selectedEvent.content_type;
                    const contentIds = selectedEvent.metadata?.contentIds || [];
                    
                    if (contentIds.length === 0) {
                      alert('Não há itens para revisar');
                      return;
                    }
                    
                    try {
                      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
                      
                      // Primeiro, verificar se já existe uma sessão ativa para esta data/tipo
                      // Usar o mesmo formato de data que o backend espera (YYYY-MM-DD no timezone do usuário)
                      const selectedDate = weekDays[selectedEvent.day_index];
                      const dateStr = format(selectedDate, 'yyyy-MM-dd');
                      const listResponse = await fetchWithAuth(
                        `/api/review-sessions?contentType=${contentType}&date=${dateStr}&status=active`
                      );
                      
                      let sessionId: string;
                      
                      if (listResponse.ok) {
                        const listResult = await listResponse.json();
                        const existingSessions = listResult.data?.sessions || [];
                        
                        if (existingSessions.length > 0) {
                          // Usar sessão existente
                          sessionId = existingSessions[0].id;
                          console.log('✅ Usando sessão existente:', sessionId);
                        } else {
                          // Criar nova sessão
                          const response = await fetchWithAuth('/api/review-sessions', {
                            method: 'POST',
                            body: JSON.stringify({
                              content_type: contentType,
                              review_ids: contentIds,
                              date: dateStr,
                            }),
                          });

                          if (!response.ok) {
                            throw new Error('Erro ao criar sessão');
                          }

                          const result = await response.json();
                          sessionId = result.data.session.id;
                          console.log('✅ Nova sessão criada:', sessionId);
                        }
                      } else {
                        throw new Error('Erro ao verificar sessões existentes');
                      }
                      
                      // Navegar para a página de sessão com o ID da sessão
                      let url = '';
                      if (contentType === 'FLASHCARD') {
                        url = `/revisoes/flashcards/sessao/${sessionId}`;
                      } else if (contentType === 'QUESTION') {
                        url = `/revisoes/questoes/sessao/${sessionId}`;
                      } else if (contentType === 'ERROR_NOTEBOOK') {
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
                  {/* Botão de marcar como concluída */}
                  <button
                    onClick={async () => {
                      const dbId = selectedEvent.metadata?.dbId;
                      if (!dbId) return;
                      
                      const isCompleted = selectedEvent.status === 'completed';
                      const newStatus = isCompleted ? 'pending' : 'completed';
                      
                      try {
                        // Atualizar no backend
                        await plannerService.updateEvent(dbId, {
                          status: newStatus,
                          completed_count: isCompleted ? 0 : 1,
                        });
                        
                        // Atualizar no estado local
                        setEvents(prev => prev.map(evt =>
                          evt.id === selectedEvent.id
                            ? { ...evt, status: newStatus, completed_count: isCompleted ? 0 : 1 }
                            : evt
                        ));
                        
                        // Atualizar o evento selecionado
                        setSelectedEvent({
                          ...selectedEvent,
                          status: newStatus,
                          completed_count: isCompleted ? 0 : 1,
                        });
                        
                        console.log(`✅ Tarefa ${isCompleted ? 'desmarcada' : 'marcada'} como concluída`);
                      } catch (error) {
                        console.error('❌ Erro ao atualizar status:', error);
                        alert('Erro ao atualizar tarefa. Tente novamente.');
                      }
                    }}
                    className={`flex-1 ${
                      selectedEvent.status === 'completed'
                        ? 'bg-gray-500 hover:bg-gray-600'
                        : 'bg-green-500 hover:bg-green-600'
                    } text-white py-2.5 px-4 rounded-lg font-semibold shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl hover:scale-[1.02] transition-all duration-300 ease-out flex items-center justify-center gap-2 group`}
                  >
                    <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:scale-110">
                      {selectedEvent.status === 'completed' ? 'close' : 'check_circle'}
                    </span>
                    {selectedEvent.status === 'completed' ? 'Desmarcar Conclusão' : 'Marcar como Concluída'}
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEventToDelete(selectedEvent);
                        setShowDeleteModal(true);
                      }}
                      className="flex-1 bg-red-500 text-white py-2.5 px-4 rounded-lg font-semibold shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl hover:bg-red-600 hover:scale-[1.02] transition-all duration-300 ease-out flex items-center justify-center gap-2 group"
                    >
                      <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:scale-110">delete</span>
                      Deletar
                    </button>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="flex-1 bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary py-2.5 px-4 rounded-lg font-semibold border-2 border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl hover:bg-background-light dark:hover:bg-background-dark hover:scale-[1.02] transition-all duration-300 ease-out flex items-center justify-center gap-2 group"
                    >
                      <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:scale-110">close</span>
                      Fechar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de criação */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedCell(null);
        }}
        onCreateTask={async (taskData) => {
          try {
            // Se é tarefa recorrente
            if (taskData.isRecurring && taskData.recurringDays && taskData.recurringDays.length > 0 && taskData.recurringEndDate) {
              const dayIndex = selectedCell?.dayIndex || 0;
              const startDateStr = format(weekDays[dayIndex], 'yyyy-MM-dd');
              
              // Criar evento recorrente pai
              const savedEvent = await plannerService.createEvent({
                event_type: 'user_task',
                title: taskData.title,
                description: taskData.description,
                date: startDateStr,
                start_hour: taskData.start_hour,
                start_minute: taskData.start_minute,
                end_hour: taskData.end_hour,
                end_minute: taskData.end_minute,
                color: taskData.color,
                icon: taskData.icon,
                metadata: taskData.metadata,
                is_recurring: true,
                recurrence_pattern: {
                  days: taskData.recurringDays,
                },
                recurrence_end_date: taskData.recurringEndDate,
              });
              
              // Recarregar eventos para mostrar as instâncias expandidas
              await loadReviews();
            } else {
              // Tarefa única
              // Usar a data do taskData se disponível, senão usar a célula selecionada
              const dateStr = taskData.date || format(weekDays[selectedCell?.dayIndex || 0], 'yyyy-MM-dd');
              
              // Calcular dayIndex baseado na data escolhida (usar mesma lógica das revisões)
              const taskDate = new Date(dateStr + 'T00:00:00');
              const weekStartDate = new Date(weekStart);
              weekStartDate.setHours(0, 0, 0, 0);
              const dayIndex = Math.floor((taskDate.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24));
              
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
              
              const newEvent: Event = {
                id: savedEvent.id || `user-task-${Date.now()}`,
                title: taskData.title,
                subtitle: taskData.description,
                start_hour: taskData.start_hour,
                start_minute: taskData.start_minute,
                end_hour: taskData.end_hour,
                end_minute: taskData.end_minute,
                color: taskData.color,
                content_type: 'USER_TASK',
                day_index: dayIndex,
                icon: taskData.icon,
                source: taskData.source,
                permissions: taskData.permissions,
                metadata: {
                  ...taskData.metadata,
                  dbId: savedEvent.id,
                },
              };
              
              setEvents(prev => [...prev, newEvent]);
            }
            
            // Limpar cache para forçar reload
            cacheRef.current.clear();
            console.log('✅ Tarefa(s) criada(s) com sucesso');
          } catch (error) {
            console.error('❌ Erro ao criar tarefa:', error);
            alert('Erro ao criar tarefa. Tente novamente.');
          }
        }}
        selectedDate={selectedCell ? addDays(weekStart, selectedCell.dayIndex) : undefined}
        selectedHour={selectedCell?.hour}
      />

      {/* Modal de confirmação de deleção */}
      {showDeleteModal && eventToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowDeleteModal(false)}>
          <div 
            className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl p-6 w-[450px]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-3xl text-red-500">warning</span>
              <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Deletar Tarefa
              </h3>
            </div>

            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
              {eventToDelete.metadata?.parentEventId ? (
                <>Esta tarefa faz parte de uma série recorrente. O que deseja fazer?</>
              ) : (
                <>Tem certeza que deseja deletar esta tarefa?</>
              )}
            </p>

            <div className="flex flex-col gap-3">
              {eventToDelete.metadata?.parentEventId ? (
                <>
                  <button
                    onClick={async () => {
                      const dbId = eventToDelete.metadata?.dbId;
                      if (!dbId) return;
                      
                      try {
                        // Deletar apenas esta ocorrência
                        await plannerService.deleteEvent(dbId);
                        setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
                        setSelectedEvent(null);
                        setShowDeleteModal(false);
                        setEventToDelete(null);
                        console.log('✅ Tarefa deletada com sucesso');
                      } catch (error) {
                        console.error('❌ Erro ao deletar tarefa:', error);
                        alert('Erro ao deletar tarefa. Tente novamente.');
                      }
                    }}
                    className="bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">event_busy</span>
                    Deletar apenas esta ocorrência
                  </button>

                  <button
                    onClick={async () => {
                      const parentId = eventToDelete.metadata?.parentEventId;
                      if (!parentId) return;
                      
                      try {
                        // Deletar o evento pai (CASCADE vai deletar todas as instâncias)
                        await plannerService.deleteEvent(parentId);

                        // Remover todas as instâncias do estado local
                        setEvents(prev => prev.filter(e => 
                          e.metadata?.parentEventId !== parentId
                        ));
                        setSelectedEvent(null);
                        setShowDeleteModal(false);
                        setEventToDelete(null);
                        console.log('✅ Todas as tarefas recorrentes deletadas com sucesso');
                        
                        // Recarregar para garantir sincronização
                        await loadReviews();
                      } catch (error) {
                        console.error('❌ Erro ao deletar tarefas:', error);
                        alert('Erro ao deletar tarefas. Tente novamente.');
                      }
                    }}
                    className="bg-red-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">delete_sweep</span>
                    Deletar todas as ocorrências
                  </button>
                </>
              ) : (
                <button
                  onClick={async () => {
                    const dbId = eventToDelete.metadata?.dbId;
                    if (!dbId) return;
                    
                    try {
                      await plannerService.deleteEvent(dbId);
                      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
                      setSelectedEvent(null);
                      setShowDeleteModal(false);
                      setEventToDelete(null);
                      console.log('✅ Tarefa deletada com sucesso');
                    } catch (error) {
                      console.error('❌ Erro ao deletar tarefa:', error);
                      alert('Erro ao deletar tarefa. Tente novamente.');
                    }
                  }}
                  className="bg-red-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">delete</span>
                  Sim, deletar tarefa
                </button>
              )}

              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setEventToDelete(null);
                }}
                className="bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary py-3 px-4 rounded-lg font-semibold border-2 border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
