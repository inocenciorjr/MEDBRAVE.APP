import React, { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import plannerApi from '../../services/plannerApi';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, Target, BookOpen, Brain, Move, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import TaskModal from './TaskModal';
import TaskList from './TaskList';
import { formatDate } from '../../utils/dateUtils';

const eventColors = {
  FSRS_REVIEW: 'var(--color-primary)',
  RECOMMENDATION: 'var(--color-accent)',
  SIMULADO: 'var(--color-chart-4)',
  MANUAL: 'var(--color-purple-main-light)',
};

function getDayString(date) {
  if (!date) return '';
  if (typeof date === 'string') return date.slice(0, 10);
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return '';
}

export default function PlannerCalendar({ userId }) {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    async function loadTasks() {
      try {
        // Buscar tarefas para um período mais amplo (3 meses)
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10);
        
        const tasks = await plannerApi.getTasks(userId, start, end);
        setEvents(tasks.map(task => {
          const isManual = task.type === 'MANUAL';
          const isCompleted = task.status === 'COMPLETED';
          
          return {
            id: task.id,
            title: task.title,
            start: task.scheduledDate,
            backgroundColor: isCompleted 
              ? 'hsl(var(--muted))' 
              : (eventColors[task.type] || 'var(--color-muted)'),
            borderColor: isCompleted 
              ? 'hsl(var(--muted-foreground))' 
              : (eventColors[task.type] || 'var(--color-muted)'),
            textColor: isCompleted 
              ? 'hsl(var(--muted-foreground))' 
              : '#ffffff',
            className: [
              'fc-event-custom',
              isManual ? 'fc-event-draggable' : '',
              isCompleted ? 'fc-event-completed' : ''
            ].filter(Boolean).join(' '),
            extendedProps: { ...task },
            editable: isManual && !isCompleted
          };
        }));
      } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        toast.error('Erro ao carregar tarefas');
      }
    }
    if (userId) loadTasks();
  }, [userId, refresh]);

  // Tornar popover arrastável
  useEffect(() => {
    const makePopoverDraggable = () => {
      const popovers = document.querySelectorAll('.fc-popover');
      popovers.forEach(popover => {
        if (popover.dataset.draggable) return; // Já foi configurado
        
        popover.dataset.draggable = 'true';
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        const header = popover.querySelector('.fc-popover-header') || popover;
        header.style.cursor = 'move';
        
        const handleMouseDown = (e) => {
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          const rect = popover.getBoundingClientRect();
          initialX = rect.left;
          initialY = rect.top;
          
          popover.style.position = 'fixed';
          popover.style.zIndex = '10000';
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
          e.preventDefault();
        };
        
        const handleMouseMove = (e) => {
          if (!isDragging) return;
          
          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;
          
          popover.style.left = `${initialX + deltaX}px`;
          popover.style.top = `${initialY + deltaY}px`;
        };
        
        const handleMouseUp = () => {
          isDragging = false;
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
        
        header.addEventListener('mousedown', handleMouseDown);
      });
    };
    
    // Observar mudanças no DOM para novos popovers
    const observer = new MutationObserver(() => {
      makePopoverDraggable();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => observer.disconnect();
  }, []);

  function handleEventClick(info) {
    setSelectedTask(info.event.extendedProps);
    setShowModal(true);
    setSelectedDate(getDayString(info.event.start));
  }

  function handleDateClick(info) {
    setSelectedDate(info.dateStr);
    setSelectedTask(null);
    // Verificar se há tarefas na data clicada
    const tasksOnDate = events.filter(e => getDayString(e.start) === info.dateStr);
    
    // Se não há tarefas, abrir modal para criar nova tarefa
    // Se há tarefas, apenas selecionar a data para mostrar as tarefas na lista abaixo
    if (tasksOnDate.length === 0) {
      setShowModal(true);
    }
    // Se há tarefas, elas serão mostradas automaticamente na seção "Tarefas de {data}"
  }

  function handleModalClose(updated) {
    setShowModal(false);
    setSelectedTask(null);
    setSelectedDate(null);
    if (updated) setRefresh(r => !r);
  }

  // Filtrar tarefas do dia selecionado
  const tasksOfDay = selectedDate
    ? events.filter(e => getDayString(e.start) === getDayString(selectedDate)).map(e => e.extendedProps)
    : [];

  // Ações rápidas para TaskList
  async function handleComplete(task) {
    await plannerApi.updateTask(task.id, { status: 'COMPLETED' });
    setRefresh(r => !r);
  }
  async function handleDelete(task) {
    await plannerApi.deleteTask(task.id);
    setRefresh(r => !r);
  }
  function handleOpenLink(task) {
    if (task.targetUrl) window.open(task.targetUrl, '_blank');
  }

  // Função para lidar com o drag and drop de eventos
  async function handleEventDrop(info) {
    const { event } = info;
    const task = event.extendedProps;
    
    // Verificar se a tarefa pode ser movida (apenas tarefas manuais)
    if (task.type !== 'MANUAL') {
      info.revert();
      toast.error('Apenas tarefas manuais podem ser movidas');
      return;
    }

    const newDate = info.event.start.toISOString().slice(0, 10);
    
    try {
      setIsDragging(true);
      await plannerApi.updateTask(task.id, { 
        scheduledDate: newDate 
      });
      
      toast.success('Tarefa movida com sucesso!');
      setRefresh(r => !r);
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      info.revert(); // Reverter a mudança visual
      toast.error('Erro ao mover tarefa');
    } finally {
      setIsDragging(false);
    }
  }

  // Função para lidar com o início do drag
  function handleEventDragStart(info) {
    setIsDragging(true);
    const task = info.event.extendedProps;
    
    if (task.type !== 'MANUAL') {
      info.jsEvent.preventDefault();
      toast.warning('Apenas tarefas manuais podem ser movidas');
      return false;
    }
  }

  // Função para lidar com o fim do drag
  function handleEventDragStop() {
    setIsDragging(false);
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Planner de Estudos
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Organize seus estudos e acompanhe seu progresso
                </p>
              </div>
            </div>
            <Button 
              onClick={() => { setSelectedDate(new Date().toISOString().slice(0,10)); setShowModal(true); }}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-colors duration-200"
              size="lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Section */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Move className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Arraste tarefas manuais para reorganizar
              </span>
            </div>
            {isDragging && (
              <Badge variant="secondary" className="animate-pulse">
                <Move className="h-3 w-3 mr-1" />
                Movendo...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="planner-calendar-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={events}
              selectable={true}
              editable={true}
              droppable={true}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventDragStart={handleEventDragStart}
              eventDragStop={handleEventDragStop}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth'
              }}
              buttonText={{
                today: 'Hoje',
                month: 'Mês'
              }}
              height="auto"
              themeSystem="standard"
              locale={ptBrLocale}
              dayMaxEvents={3}
              moreLinkText="mais"
              moreLinkClick="popover"
              noEventsText="Nenhuma tarefa"
              firstDay={0}
              weekends={true}
              eventDisplay="block"
              displayEventTime={false}
              dayHeaderFormat={{ weekday: 'short' }}
              titleFormat={{ year: 'numeric', month: 'long' }}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
              dragScroll={true}
              eventStartEditable={true}
              eventDurationEditable={false}
              eventOverlap={true}
              selectMirror={true}
              unselectAuto={true}
              eventOrder="start,-duration,allDay,title"
              fixedWeekCount={false}
              showNonCurrentDates={false}
              aspectRatio={1.8}
              eventClassNames={(arg) => {
                const task = arg.event.extendedProps;
                const classes = ['fc-event-custom'];
                
                if (task.type === 'MANUAL') {
                  classes.push('fc-event-draggable');
                }
                
                if (task.status === 'COMPLETED') {
                  classes.push('fc-event-completed');
                }
                
                return classes;
              }}
              eventDidMount={(info) => {
                // Adiciona tooltip com informações da tarefa
                info.el.title = `${info.event.title}\n${info.event.extendedProps.description || ''}`;
                
                // Adiciona indicador visual para tarefas arrastáveis
                if (info.event.extendedProps.type === 'MANUAL' && info.event.extendedProps.status !== 'COMPLETED') {
                  info.el.style.cursor = 'move';
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Task Details Section */}
      {selectedDate && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Target className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  Tarefas do Dia
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedDate).toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={tasksOfDay}
              onComplete={handleComplete}
              onDelete={handleDelete}
              onOpenLink={handleOpenLink}
            />
          </CardContent>
        </Card>
      )}

      <TaskModal
        open={showModal}
        onClose={handleModalClose}
        userId={userId}
        date={selectedDate}
        task={selectedTask}
      />
    </div>
  );
}