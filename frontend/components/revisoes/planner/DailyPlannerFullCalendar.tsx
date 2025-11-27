'use client';

import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TaskSource, getDefaultPermissions } from './types';
import { CreateTaskModal } from './CreateTaskModal';

interface DailyPlannerProps {
  currentDate: Date;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  editable: boolean;
  startEditable: boolean;
  durationEditable: boolean;
  extendedProps: {
    source: TaskSource;
    contentType: string;
    count?: number;
    reviewIds?: string[];
    icon: string;
    originalDate?: string;
  };
}

export function DailyPlannerFullCalendar({ currentDate }: DailyPlannerProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number>(8);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const calendarRef = useRef<any>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

  useEffect(() => {
    loadReviews();
  }, [currentDate]);

  const loadReviews = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const response = await fetch('/api/unified-reviews/future?limit=200', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (result.success) {
        // Agrupar revisões por dia e tipo
        const groupedReviews: Record<string, Record<string, any[]>> = {};
        
        result.data.reviews.forEach((review: any) => {
          const reviewDate = new Date(review.due);
          const daysDiff = Math.floor((reviewDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff < 7) {
            const dayKey = `day-${daysDiff}`;
            const typeKey = review.content_type;
            
            if (!groupedReviews[dayKey]) {
              groupedReviews[dayKey] = {};
            }
            if (!groupedReviews[dayKey][typeKey]) {
              groupedReviews[dayKey][typeKey] = [];
            }
            
            groupedReviews[dayKey][typeKey].push(review);
          }
        });

        // Criar eventos para FullCalendar
        const calendarEvents: CalendarEvent[] = [];
        let eventIndex = 0;
        
        Object.entries(groupedReviews).forEach(([dayKey, types]) => {
          const dayIndex = parseInt(dayKey.split('-')[1]);
          const eventDate = addDays(weekStart, dayIndex);
          
          // Ordem: FLASHCARD, QUESTION, ERROR_NOTEBOOK
          const orderedTypes: Array<'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK'> = ['FLASHCARD', 'QUESTION', 'ERROR_NOTEBOOK'];
          
          orderedTypes.forEach((contentType) => {
            const reviews = types[contentType];
            if (!reviews || reviews.length === 0) return;
            
            const startHour = 8 + eventIndex;
            const duration = Math.max(1, Math.ceil(reviews.length / 10));
            const endHour = Math.min(21, startHour + duration);
            
            const colors = getColorByContentType(contentType);
            
            calendarEvents.push({
              id: `grouped-${dayIndex}-${contentType}`,
              title: getGroupedTitle(contentType, reviews.length),
              start: `${format(eventDate, 'yyyy-MM-dd')}T${startHour.toString().padStart(2, '0')}:00:00`,
              end: `${format(eventDate, 'yyyy-MM-dd')}T${endHour.toString().padStart(2, '0')}:00:00`,
              backgroundColor: colors.bg,
              borderColor: colors.border,
              textColor: colors.text,
              editable: true, // Pode mover e redimensionar
              startEditable: true, // Pode mudar horário
              durationEditable: true, // Pode mudar duração
              extendedProps: {
                source: 'system' as TaskSource,
                contentType,
                count: reviews.length,
                reviewIds: reviews.map((r: any) => r.id),
                icon: getIconByContentType(contentType),
                originalDate: format(eventDate, 'yyyy-MM-dd'), // Guardar data original
              },
            });
            
            eventIndex++;
          });
        });

        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getGroupedTitle = (contentType: string, count: number): string => {
    switch (contentType) {
      case 'FLASHCARD': return 'Flashcards';
      case 'QUESTION': return 'Questões';
      case 'ERROR_NOTEBOOK': return 'Caderno de Erros';
      default: return 'Revisão';
    }
  };

  const getColorByContentType = (contentType: string) => {
    switch (contentType) {
      case 'QUESTION': 
        return { bg: '#A5F3FC', border: '#06B6D4', text: '#164E63' }; // cyan
      case 'FLASHCARD': 
        return { bg: '#E9D5FF', border: '#A855F7', text: '#581C87' }; // purple
      case 'ERROR_NOTEBOOK': 
        return { bg: '#FECACA', border: '#EF4444', text: '#7F1D1D' }; // red
      default: 
        return { bg: '#E5E7EB', border: '#9CA3AF', text: '#1F2937' }; // gray
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

  const handleDateClick = (arg: any) => {
    setSelectedDate(new Date(arg.date));
    setSelectedHour(arg.date.getHours());
    setIsCreateModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event;
    setSelectedEvent(event);
    console.log('Event clicked:', event.title, event.extendedProps);
  };

  const handleEventDrop = (dropInfo: any) => {
    const event = dropInfo.event;
    
    // Eventos do sistema não podem mudar de dia
    if (event.extendedProps.source === 'system') {
      const originalDate = event.extendedProps.originalDate;
      const newDate = format(new Date(event.start), 'yyyy-MM-dd');
      
      if (originalDate !== newDate) {
        // Mudou de dia - não permitir
        dropInfo.revert();
        console.log('Eventos do sistema não podem mudar de dia');
        return;
      }
    }
    
    console.log('Event moved:', event.title, event.start, event.end);
    // Aqui você salvaria no backend
  };

  const handleEventResize = (resizeInfo: any) => {
    const event = resizeInfo.event;
    
    console.log('Event resized:', event.title, event.end);
    // Aqui você salvaria no backend
    // Eventos do sistema podem ser redimensionados normalmente
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {/* Botão flutuante para criar tarefa */}
      <button
        onClick={() => {
          setSelectedDate(new Date());
          setSelectedHour(8);
          setIsCreateModalOpen(true);
        }}
        className="fixed bottom-8 right-8 bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all hover:scale-110 z-40"
        title="Criar nova tarefa"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      <div className="fullcalendar-wrapper">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          initialDate={currentDate}
          headerToolbar={false}
          allDaySlot={false}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="01:00:00"
          slotLabelInterval="01:00:00"
          height="auto"
          expandRows={true}
          nowIndicator={true}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          firstDay={0}
          locale="pt-br"
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          dayHeaderFormat={{
            weekday: 'short',
            day: 'numeric',
          }}
          eventContent={(arg) => {
            const { event } = arg;
            const icon = event.extendedProps.icon;
            
            return {
              html: `
                <div class="flex items-center gap-2 px-2 py-1 h-full">
                  <div class="w-7 h-7 rounded-full bg-white/40 flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined" style="font-size: 16px">${icon}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-display font-bold text-xs leading-tight truncate">
                      ${event.title}
                    </div>
                    <div class="font-inter text-[10px] opacity-75 leading-tight">
                      ${arg.timeText}
                    </div>
                  </div>
                </div>
              `
            };
          }}
        />
      </div>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedDate(null);
        }}
        onCreateTask={(taskData) => {
          const newEvent: CalendarEvent = {
            id: `user-task-${Date.now()}`,
            title: taskData.title,
            start: `${format(selectedDate || new Date(), 'yyyy-MM-dd')}T${taskData.start_hour.toString().padStart(2, '0')}:${taskData.start_minute.toString().padStart(2, '0')}:00`,
            end: `${format(selectedDate || new Date(), 'yyyy-MM-dd')}T${taskData.end_hour.toString().padStart(2, '0')}:${taskData.end_minute.toString().padStart(2, '0')}:00`,
            backgroundColor: getColorByContentType(taskData.color).bg,
            borderColor: getColorByContentType(taskData.color).border,
            textColor: getColorByContentType(taskData.color).text,
            editable: true,
            startEditable: true,
            durationEditable: true,
            extendedProps: {
              source: taskData.source,
              contentType: 'USER_TASK',
              icon: taskData.icon,
            },
          };
          
          setEvents(prev => [...prev, newEvent]);
        }}
        selectedDate={selectedDate || undefined}
        selectedHour={selectedHour}
      />

      {/* Modal de detalhes do evento */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl p-6 w-96"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{selectedEvent.title}</h3>
              <button onClick={() => setSelectedEvent(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Horário</p>
                <p className="font-semibold">
                  {format(new Date(selectedEvent.start), 'HH:mm')} - {format(new Date(selectedEvent.end), 'HH:mm')}
                </p>
              </div>
              
              {selectedEvent.extendedProps.count && (
                <div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Quantidade</p>
                  <p className="font-semibold">{selectedEvent.extendedProps.count} itens</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Tipo</p>
                <p className="font-semibold capitalize">{selectedEvent.extendedProps.source}</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                console.log('Iniciar revisão:', selectedEvent);
                setSelectedEvent(null);
              }}
              className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Iniciar Revisão
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .fullcalendar-wrapper {
          font-family: var(--font-poppins), sans-serif;
        }
        
        .fc {
          --fc-border-color: rgb(229 231 235 / 0.5);
          --fc-today-bg-color: rgb(124 58 237 / 0.05);
        }
        
        .dark .fc {
          --fc-border-color: rgb(42 42 42 / 0.5);
          --fc-today-bg-color: rgb(124 58 237 / 0.1);
        }
        
        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: var(--fc-border-color);
        }
        
        .fc-col-header-cell {
          background: linear-gradient(to bottom, rgb(243 232 255), rgb(243 232 255 / 0.5));
          border-bottom: 2px solid rgb(124 58 237 / 0.3) !important;
          padding: 8px 0;
        }
        
        .dark .fc-col-header-cell {
          background: linear-gradient(to bottom, rgb(88 28 135 / 0.4), rgb(88 28 135 / 0.2));
        }
        
        .fc-col-header-cell-cushion {
          color: rgb(107 33 168);
          font-weight: 600;
          font-size: 0.875rem;
        }
        
        .dark .fc-col-header-cell-cushion {
          color: rgb(216 180 254);
        }
        
        .fc-timegrid-slot-label {
          color: rgb(107 114 128);
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .dark .fc-timegrid-slot-label {
          color: rgb(156 163 175);
        }
        
        .fc-event {
          border-radius: 0.75rem !important;
          border-width: 2px !important;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .fc-event:hover {
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          transform: scale(1.02);
        }
        
        .fc-event-main {
          padding: 0 !important;
        }
        
        .fc-timegrid-event-harness {
          margin: 0 4px !important;
        }
        
        .fc-direction-ltr .fc-timegrid-col-events {
          margin: 0 !important;
        }
        
        .fc-timegrid-now-indicator-line {
          border-color: rgb(239 68 68);
          border-width: 2px;
        }
        
        .fc-timegrid-now-indicator-arrow {
          border-color: rgb(239 68 68);
        }
      `}</style>
    </>
  );
}
