'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TaskPermissions, TaskSource, getDefaultPermissions } from './types';
import { CreateTaskModal } from './CreateTaskModal';

interface DailyPlannerProps {
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
  icon?: string;
  
  // Novos campos para controle
  source: TaskSource;
  permissions: TaskPermissions;
  originalDayIndex?: number; // Para validar se pode mudar de dia
  metadata?: {
    count?: number;
    reviewIds?: string[];
    [key: string]: any;
  };
}

function DraggableEvent({ event, style, onResize, onClick, isResizing, dragOffset }: any) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: event.id,
    disabled: isResizing || !event.permissions.canChangeTime, // Desabilita drag se não tiver permissão
  });

  const getColorClasses = (color: string) => {
    const classes: Record<string, string> = {
      cyan: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200',
      purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
      red: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
      orange: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200',
      pink: 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200',
      blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
    };
    return classes[color] || 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };
  
  // Badge indicando a fonte da tarefa (apenas para mentor e admin)
  const getSourceBadge = () => {
    if (event.source === 'mentor') {
      return <span className="text-[10px] px-1 py-0.5 bg-orange-500 text-white rounded">Mentor</span>;
    }
    if (event.source === 'admin') {
      return <span className="text-[10px] px-1 py-0.5 bg-pink-500 text-white rounded">Admin</span>;
    }
    // Não mostrar badge para 'system' e 'user'
    return null;
  };

  const dragStyle = transform ? {
    ...style,
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition: 'none',
  } : style;

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-2 right-2 rounded-xl px-3 py-2 flex items-center gap-2.5 hover:shadow-lg z-10 select-none ${getColorClasses(event.color)} ${
        isDragging ? 'shadow-2xl z-50' : ''
      } ${isResizing ? 'cursor-ns-resize' : event.permissions.canChangeTime ? 'cursor-move' : 'cursor-default'}`}
      style={dragStyle}
    >
      {/* Ícone em círculo */}
      <div className="w-9 h-9 rounded-full bg-white/40 dark:bg-white/20 flex items-center justify-center flex-shrink-0" aria-hidden="true">
        <span className="material-symbols-outlined !text-[20px]">{event.icon}</span>
      </div>
      
      {/* Conteúdo */}
      <div 
        {...listeners} 
        {...attributes} 
        onClick={(e) => {
          if (!isDragging && !isResizing) {
            e.stopPropagation();
            onClick();
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex-1 min-w-0 flex flex-col justify-center"
      >
        <div className="font-display font-bold text-sm leading-tight truncate">
          {event.content_type === 'FLASHCARD' ? 'Flashcards' : 
           event.content_type === 'QUESTION' ? 'Questões' : 
           event.content_type === 'ERROR_NOTEBOOK' ? 'Caderno de Erros' : 
           event.title}
        </div>
        <div className="font-inter text-xs opacity-75 leading-tight mt-0.5">
          {event.start_hour.toString().padStart(2, '0')}:{event.start_minute.toString().padStart(2, '0')} - {event.end_hour.toString().padStart(2, '0')}:{event.end_minute.toString().padStart(2, '0')}
        </div>
      </div>
      
      {/* Badge */}
      <div className="flex-shrink-0" aria-hidden="true">
        {getSourceBadge()}
      </div>
      
      {/* Handle de redimensionamento */}
      {event.permissions.canChangeDuration && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onResize(e, event.id);
          }}
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-black/20 dark:hover:bg-white/20 rounded-b-xl flex items-center justify-center group"
          tabIndex={-1}
          aria-label="Redimensionar evento"
        >
          <div className="w-10 h-1 bg-current opacity-30 group-hover:opacity-60 rounded-full transition-opacity" aria-hidden="true"></div>
        </div>
      )}
    </div>
  );
}

function DroppableCell({ dayIndex, hour, children, onDoubleClick }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${dayIndex}-${hour}`,
  });

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => onDoubleClick(dayIndex, hour)}
      className={`h-12 border-b border-border-light dark:border-border-dark cursor-pointer hover:bg-primary/5 ${
        isOver ? 'bg-primary/10' : ''
      }`}
      title="Clique duplo para criar tarefa"
    >
      {children}
    </div>
  );
}

export function DailyPlanner({ currentDate }: DailyPlannerProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resizingEvent, setResizingEvent] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ dayIndex: number; hour: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduzido para resposta mais rápida
      },
    })
  );

  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6h às 21h

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

        // Criar eventos agrupados
        const newEvents: Event[] = [];
        let eventIndex = 0;
        
        Object.entries(groupedReviews).forEach(([dayKey, types]) => {
          const dayIndex = parseInt(dayKey.split('-')[1]);
          
          // Ordem: FLASHCARD, QUESTION, ERROR_NOTEBOOK
          const orderedTypes = ['FLASHCARD', 'QUESTION', 'ERROR_NOTEBOOK'];
          
          orderedTypes.forEach((contentType) => {
            const reviews = types[contentType];
            if (!reviews || reviews.length === 0) return;
            
            const startHour = 8 + eventIndex;
            const duration = Math.max(1, Math.ceil(reviews.length / 10)); // 1h para cada 10 itens
            
            newEvents.push({
              id: `grouped-${dayIndex}-${contentType}`,
              title: getGroupedTitle(contentType, reviews.length),
              subtitle: `${reviews.length} ${contentType === 'FLASHCARD' ? 'flashcards' : contentType === 'QUESTION' ? 'questões' : 'erros'}`,
              start_hour: startHour,
              start_minute: 0,
              end_hour: Math.min(21, startHour + duration), // Limite até 21h
              end_minute: 0,
              color: getColorByContentType(contentType),
              content_type: contentType,
              day_index: dayIndex,
              icon: getIconByContentType(contentType),
              
              // Tarefas de revisão são do sistema
              source: 'system' as TaskSource,
              permissions: getDefaultPermissions('system'),
              originalDayIndex: dayIndex,
              metadata: {
                count: reviews.length,
                reviewIds: reviews.map((r: any) => r.id),
              },
            });
            
            eventIndex++;
          });
        });

        setEvents(newEvents);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getGroupedTitle = (contentType: string, count: number): string => {
    switch (contentType) {
      case 'FLASHCARD':
        return `Revisão de Flashcards`;
      case 'QUESTION':
        return `Revisão de Questões`;
      case 'ERROR_NOTEBOOK':
        return `Revisão de Caderno de Erros`;
      default:
        return 'Revisão';
    }
  };

  const getColorByContentType = (contentType: string) => {
    switch (contentType) {
      case 'QUESTION': return 'cyan';
      case 'FLASHCARD': return 'purple';
      case 'ERROR_NOTEBOOK': return 'red';
      default: return 'gray';
    }
  };

  const getIconByContentType = (contentType: string) => {
    switch (contentType) {
      case 'QUESTION': return 'list_alt'; // Ícone de questões da sidebar
      case 'FLASHCARD': return 'layers'; // Ícone de flashcards da sidebar
      case 'ERROR_NOTEBOOK': return 'book'; // Ícone de caderno de erros da sidebar
      default: return 'event';
    }
  };

  const getEventStyle = (event: Event) => {
    const startMinutes = (event.start_hour - 6) * 60 + event.start_minute; // Ajustado para começar às 6h
    const endMinutes = (event.end_hour - 6) * 60 + event.end_minute;
    const durationMinutes = endMinutes - startMinutes;
    
    const cellHeight = 48; // h-12 = 48px
    const pixelsPerMinute = cellHeight / 60; // 0.8 pixels por minuto
    
    // Posição relativa ao início das células (sem somar header, pois o evento está dentro da coluna)
    const top = startMinutes * pixelsPerMinute;
    const height = durationMinutes * pixelsPerMinute;
    
    return {
      top: `${top}px`,
      height: `${Math.max(height, cellHeight)}px`, // Mínimo de 1 célula completa
    };
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDragOffset(null);
  };

  const handleDragMove = (event: any) => {
    if (event.delta) {
      setDragOffset(event.delta);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    
    const eventId = active.id as string;
    const draggedEvent = events.find(e => e.id === eventId);

    if (!draggedEvent) {
      setTimeout(() => setActiveId(null), 100);
      return;
    }

    // Calcular nova posição baseada no delta
    if (delta) {
      const cellHeight = 48; // h-12
      const pixelsPerMinute = cellHeight / 60;
      
      // Calcular quantas horas moveu (com snap)
      const minutesMoved = Math.round(delta.y / pixelsPerMinute);
      const hoursMoved = Math.round(minutesMoved / 60);
      
      // Nova hora com snap
      let newStartHour = draggedEvent.start_hour + hoursMoved;
      
      // Limitar entre 6h e 21h
      newStartHour = Math.max(6, Math.min(21 - (draggedEvent.end_hour - draggedEvent.start_hour), newStartHour));
      
      // Calcular novo dia se moveu horizontalmente
      let newDayIndex = draggedEvent.day_index;
      if (over && over.id.toString().startsWith('cell-')) {
        const [, dayIndex] = over.id.toString().split('-').map(Number);
        newDayIndex = dayIndex;
      }
      
      // Validar se pode mudar de dia
      const isDifferentDay = newDayIndex !== draggedEvent.day_index;
      if (isDifferentDay && !draggedEvent.permissions.canChangeDays) {
        console.log('Tarefa do sistema não pode ser movida para outro dia');
        setTimeout(() => setActiveId(null), 100);
        return;
      }
      
      setEvents(prev => prev.map(evt => {
        if (evt.id === eventId) {
          const duration = evt.end_hour - evt.start_hour;
          return {
            ...evt,
            day_index: newDayIndex,
            start_hour: newStartHour,
            end_hour: newStartHour + duration,
          };
        }
        return evt;
      }));
    }

    // Delay para evitar que o onClick dispare após o drag
    setTimeout(() => {
      setActiveId(null);
    }, 100);
  };

  const handleResizeStart = (e: React.MouseEvent, eventId: string) => {
    const event = events.find(evt => evt.id === eventId);
    if (!event?.permissions.canChangeDuration) {
      return; // Não permite resize se não tiver permissão
    }
    
    e.stopPropagation();
    e.preventDefault();
    setResizingEvent(eventId);
    setResizeStart(e.clientY);
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!resizingEvent) return;
    
    const deltaY = e.clientY - resizeStart;
    const deltaHours = Math.round(deltaY / 64);
    
    if (deltaHours !== 0) {
      setEvents(prev => prev.map(evt => {
        if (evt.id === resizingEvent) {
          const newEndHour = Math.max(evt.start_hour + 1, Math.min(21, evt.end_hour + deltaHours)); // Limite até 21h
          return { ...evt, end_hour: newEndHour };
        }
        return evt;
      }));
      setResizeStart(e.clientY);
    }
  };

  const handleResizeEnd = () => {
    // Pequeno delay para evitar que o onClick dispare após o resize
    setTimeout(() => {
      setResizingEvent(null);
    }, 100);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  const activeEvent = events.find(e => e.id === activeId);

  return (
    <>
      {/* Botão flutuante para criar tarefa */}
      <button
        onClick={() => {
          setSelectedCell({ dayIndex: 0, hour: 8 });
          setIsCreateModalOpen(true);
        }}
        className="fixed bottom-8 right-8 bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all hover:scale-110 z-40"
        title="Criar nova tarefa"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
      <div 
        onMouseMove={handleResizeMove}
        onMouseUp={handleResizeEnd}
        className="relative"
      >
        <div className="grid grid-cols-[auto,1fr,1fr,1fr,1fr,1fr,1fr,1fr] text-sm h-[700px] relative overflow-y-auto overflow-x-hidden"
             style={{ scrollbarWidth: 'thin' }}>
          {/* Coluna de horários com degradê roxo */}
          <div className="text-right pr-4 text-xs font-inter text-text-light-secondary dark:text-text-dark-secondary bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-950/20 dark:to-transparent sticky left-0 z-10">
            <div className="h-10 bg-gradient-to-r from-purple-100 via-purple-50 to-transparent dark:from-purple-900/40 dark:via-purple-950/20 dark:to-transparent border-b-2 border-primary/30"></div>
            {hours.map(hour => (
              <div key={hour} className="h-12 flex items-start pt-1 font-medium">
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="col-start-2 col-span-7 grid grid-cols-7 border-t border-l border-border-light dark:border-border-dark">
            {/* Headers com degradê roxo */}
            {weekDays.map((day, i) => {
              const dayName = format(day, 'EEE', { locale: ptBR });
              const dayNum = format(day, 'd');
              const today = isToday(day);
              
              return (
                <div 
                  key={i} 
                  className={`h-10 text-center flex items-center justify-center gap-1.5 bg-gradient-to-b from-purple-100 to-purple-50/50 dark:from-purple-900/40 dark:to-purple-950/20 border-b-2 border-primary/30 ${i > 0 ? 'border-l' : ''} border-border-light dark:border-border-dark`}
                >
                  <span className="font-display font-semibold text-sm text-text-light-primary dark:text-text-dark-primary">
                    {dayName}
                  </span>
                  {today ? (
                    <span className="text-xs font-display font-bold bg-primary text-white rounded-full w-5 h-5 inline-flex items-center justify-center">
                      {dayNum}
                    </span>
                  ) : (
                    <span className="text-xs font-inter font-medium text-text-light-secondary dark:text-text-dark-secondary">
                      {dayNum}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Colunas de dias */}
            {weekDays.map((day, dayIdx) => {
              const isWednesday = dayIdx === 3;
              
              return (
                <div 
                  key={dayIdx} 
                  className={`border-r border-border-light dark:border-border-dark relative ${
                    isWednesday ? 'bg-primary/5 dark:bg-primary/10' : ''
                  }`}
                  style={isWednesday ? {
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(124, 58, 237, 0.1) 10px, rgba(124, 58, 237, 0.1) 20px)'
                  } : {}}
                >
                  {hours.map((hour) => (
                    <DroppableCell 
                      key={hour} 
                      dayIndex={dayIdx} 
                      hour={hour}
                      onDoubleClick={(dayIndex: number, hour: number) => {
                        setSelectedCell({ dayIndex, hour });
                        setIsCreateModalOpen(true);
                      }}
                    />
                  ))}

                  {events
                    .filter(e => e.day_index === dayIdx)
                    .map(event => (
                      <DraggableEvent
                        key={event.id}
                        event={event}
                        style={getEventStyle(event)}
                        onResize={handleResizeStart}
                        onClick={() => setSelectedEvent(event)}
                        isResizing={resizingEvent === event.id}
                        dragOffset={dragOffset}
                      />
                    ))}
                </div>
              );
            })}
          </div>

          {/* Linha do horário atual */}
          {(() => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            // Só mostra se estiver dentro do range de 6h às 21h
            if (currentHour >= 6 && currentHour < 21) {
              const minutesFromStart = (currentHour - 6) * 60 + currentMinute;
              const pixelsPerMinute = 48 / 60; // h-12 = 48px por hora
              const topPosition = minutesFromStart * pixelsPerMinute + 40; // 40px = altura do header (h-10)
              
              return (
                <div 
                  className="absolute left-[4.5rem] right-0 h-px bg-red-500 flex items-center z-20 pointer-events-none"
                  style={{ top: `${topPosition}px` }}
                  aria-hidden="true"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                  <span className="text-xs bg-red-500 text-white font-semibold px-2 py-0.5 rounded-md ml-2">
                    {format(now, 'HH:mm')}
                  </span>
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" 
          onClick={() => setSelectedEvent(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-modal-title"
        >
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 id="event-modal-title" className="text-lg font-bold">{selectedEvent.title}</h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                aria-label="Fechar modal"
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
              {selectedEvent.metadata?.count || 0} itens para revisar
            </p>
            <button
              onClick={async () => {
                try {
                  const { createClient } = await import('@/lib/supabase/client');
                  const supabase = createClient();
                  const { data: { session } } = await supabase.auth.getSession();
                  
                  if (!session) return;
                  
                  // Calcular a data do evento
                  const eventDate = format(addDays(weekStart, selectedEvent.day_index), 'yyyy-MM-dd');
                  
                  // Usar endpoint que busca/cria sessão para data específica
                  const response = await fetch('/api/review-sessions/for-date', {
                    method: 'POST',
                    headers: { 
                      'Authorization': `Bearer ${session.access_token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      content_type: selectedEvent.content_type,
                      date: eventDate,
                      review_ids: selectedEvent.metadata?.reviewIds || [],
                    }),
                  });
                  
                  const result = await response.json();
                  
                  if (result.success && result.data.session) {
                    const sessionId = result.data.session.id;
                    
                    // Navegar para a página da sessão
                    let url = '';
                    if (selectedEvent.content_type === 'FLASHCARD') {
                      url = `/revisoes/flashcards/sessao/${sessionId}`;
                    } else if (selectedEvent.content_type === 'QUESTION') {
                      url = `/revisoes/questoes/sessao/${sessionId}`;
                    } else if (selectedEvent.content_type === 'ERROR_NOTEBOOK') {
                      url = `/revisoes/caderno-erros/sessao/${sessionId}`;
                    }
                    
                    if (url) {
                      window.location.href = url;
                    }
                  }
                } catch (error) {
                  console.error('Erro ao iniciar revisão:', error);
                  alert('Erro ao iniciar revisão. Tente novamente.');
                }
                setSelectedEvent(null);
              }}
              className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Iniciar Revisão
            </button>
          </div>
        </div>
      )}

      <DragOverlay dropAnimation={null}>
        {null}
      </DragOverlay>
    </DndContext>

    <CreateTaskModal
      isOpen={isCreateModalOpen}
      onClose={() => {
        setIsCreateModalOpen(false);
        setSelectedCell(null);
      }}
      onCreateTask={(taskData) => {
        const newEvent: Event = {
          id: `user-task-${Date.now()}`,
          title: taskData.title,
          subtitle: taskData.description,
          start_hour: taskData.start_hour,
          start_minute: taskData.start_minute,
          end_hour: taskData.end_hour,
          end_minute: taskData.end_minute,
          color: taskData.color,
          content_type: 'USER_TASK',
          day_index: selectedCell?.dayIndex || 0,
          icon: taskData.icon,
          source: taskData.source,
          permissions: taskData.permissions,
          metadata: taskData.metadata,
        };
        
        setEvents(prev => [...prev, newEvent]);
      }}
      selectedDate={selectedCell ? addDays(weekStart, selectedCell.dayIndex) : undefined}
      selectedHour={selectedCell?.hour}
    />
    </>
  );
}
