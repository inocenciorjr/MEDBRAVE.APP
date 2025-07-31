import React, { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import plannerApi from '../../services/plannerApi';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Calendar, 
  Plus, 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  BookOpen,
  Brain,
  BarChart3,
  Calendar as CalendarIcon,
  List,
  Settings,
  Filter,
  Sun,
  Sunset,
  Moon,
  ChevronLeft,
  ChevronRight,
  Copy,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import TaskModal from './TaskModal';
import TaskList from './TaskList';
import PlannerStats from './PlannerStats';
import StudyInsights from './StudyInsights';
import WeeklyOverview from './WeeklyOverview';
import PeriodCard from './PeriodCard';
import WeeklyGoalsCard from './WeeklyGoalsCard';

const eventColors = {
  FSRS_REVIEW: '#8B5CF6',
  RECOMMENDATION: '#3B82F6', 
  SIMULADO: '#F59E0B',
  MANUAL: '#10B981',
};

function getDayString(date) {
  if (!date) return '';
  if (typeof date === 'string') return date.slice(0, 10);
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return '';
}

// Mini Calendar Component
function MiniCalendar({ selectedDate, onDateSelect, events }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const today = new Date();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  const daysInMonth = lastDayOfMonth.getDate();
  const daysArray = [];
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(day);
  }
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };
  
  const isToday = (day) => {
    return day === today.getDate() && 
           currentMonth.getMonth() === today.getMonth() && 
           currentMonth.getFullYear() === today.getFullYear();
  };
  
  const isSelected = (day) => {
    if (!selectedDate || !day) return false;
    const selected = new Date(selectedDate);
    return day === selected.getDate() && 
           currentMonth.getMonth() === selected.getMonth() && 
           currentMonth.getFullYear() === selected.getFullYear();
  };
  
  const hasEvents = (day) => {
    if (!day) return false;
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().slice(0, 10);
    return events.some(event => getDayString(event.start) === dateStr);
  };
  
  const handleDayClick = (day) => {
    if (!day) return;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateSelect(date);
  };
  
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl blur-sm"></div>
      <Card className="relative border-0 shadow-lg bg-card/95 backdrop-blur-sm">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousMonth}
                className="h-7 w-7 p-0 hover:bg-muted/50"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                className="h-7 w-7 p-0 hover:bg-muted/50"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, index) => (
              <div key={index} className="text-center text-xs font-medium text-muted-foreground p-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {daysArray.map((day, index) => (
              <button
                key={index}
                onClick={() => handleDayClick(day)}
                disabled={!day}
                className={`
                  relative h-8 w-8 text-xs rounded-lg transition-all duration-200 flex items-center justify-center
                  ${!day ? 'invisible' : ''}
                  ${isToday(day) 
                    ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold shadow-md' 
                    : isSelected(day)
                    ? 'bg-primary/20 text-primary font-semibold border border-primary/30'
                    : 'hover:bg-muted/50 text-foreground'
                  }
                `}
              >
                {day}
                {hasEvents(day) && (
                  <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-accent rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Weekly Grid Component
function WeeklyGrid({ events, selectedDate, onDateSelect, onTaskClick, onCreateTask, currentWeek }) {
  const getWeekDates = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day;
    const sunday = new Date(start.setDate(diff));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getWeekDates(currentWeek);
  const weekDayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const periods = [
    { id: 'PERIODO', label: 'PERÍODO', icon: Clock, gradient: 'from-slate-400 to-slate-500' },
    { id: 'MANHA', label: 'MANHÃ', icon: Sun, gradient: 'from-cyan-400 to-blue-500' },
    { id: 'TARDE', label: 'TARDE', icon: Sunset, gradient: 'from-orange-400 to-red-500' },
    { id: 'NOITE', label: 'NOITE', icon: Moon, gradient: 'from-purple-500 to-indigo-600' }
  ];

  const getTasksForDateAndPeriod = (date, period) => {
    const dateStr = date.toISOString().slice(0, 10);
    return events.filter(e => {
      const eventDate = getDayString(e.start);
      const eventPeriod = e.extendedProps.period || 'PERIODO';
      return eventDate === dateStr && eventPeriod === period;
    }).map(e => e.extendedProps);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    return date.toDateString() === selected.toDateString();
  };

  return (
    <div className="relative h-full">
      <Card className="border-0 shadow-md bg-card backdrop-blur-sm overflow-hidden h-full flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col">
          {/* Grid Table */}
          <div className="overflow-hidden flex-1">
            <table className="w-full table-fixed h-full">
              {/* Header com dias da semana */}
              <thead>
                <tr className="border-b border-border/50">
                  <th className="w-24 p-2 text-left bg-muted/20">
                    <div className="text-xs font-medium text-muted-foreground">Período</div>
                  </th>
                  {weekDates.map((date, index) => {
                    const isSelectedDay = isSelected(date);
                    const isTodayDay = isToday(date);
                    
                    return (
                      <th key={index} className="p-2 text-center border-l border-border/30 bg-muted/10">
                        <button
                          onClick={() => onDateSelect(date)}
                          className={`
                            flex flex-col items-center space-y-1 w-full p-1 rounded-lg transition-all duration-200
                            ${isTodayDay 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' 
                              : isSelectedDay
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'hover:bg-muted/50'
                            }
                          `}
                        >
                          <div className="text-xs font-medium opacity-80">
                            {weekDayNames[index]}
                          </div>
                          <div className="text-sm font-bold">
                            {date.getDate()}
                          </div>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              
              {/* Body com períodos e tarefas */}
              <tbody>
                {periods.map((period, periodIndex) => {
                  const IconComponent = period.icon;
                  
                  return (
                    <tr key={period.id} className="border-b border-border/30 last:border-b-0">
                      {/* Coluna do período */}
                      <td className="p-2 bg-muted/10 border-r border-border/30">
                        <div className={`
                          flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r ${period.gradient} text-white shadow-md
                        `}>
                          <IconComponent className="h-4 w-4" />
                          <span className="font-semibold text-xs">{period.label}</span>
                        </div>
                      </td>
                      
                      {/* Colunas dos dias */}
                      {weekDates.map((date, dayIndex) => {
                        const tasks = getTasksForDateAndPeriod(date, period.id);
                        const isSelectedDay = isSelected(date);
                        
                        return (
                          <td 
                            key={dayIndex} 
                            className={`
                              p-1 border-l border-border/30 min-h-[100px] align-top
                              ${isSelectedDay ? 'bg-primary/5' : 'hover:bg-muted/20'}
                              transition-colors duration-200
                            `}
                          >
                            <div className="space-y-1 min-h-[80px]">
                              {tasks.map((task, taskIndex) => (
                                <div
                                  key={taskIndex}
                                  onClick={() => onTaskClick(task)}
                                  className="group p-1 rounded-md bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 cursor-pointer hover:shadow-sm transition-all duration-200"
                                >
                                  <div className="text-xs font-medium text-foreground truncate group-hover:text-primary">
                                    {task.title}
                                  </div>
                                  {task.status === 'COMPLETED' && (
                                    <div className="flex items-center space-x-1 mt-0.5">
                                      <CheckCircle className="h-2 w-2 text-emerald-500" />
                                      <span className="text-xs text-emerald-600">✓</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                              
                              {/* Botão para adicionar tarefa */}
                              <button
                                onClick={() => onCreateTask(date, period.id)}
                                className="w-full p-1 border border-dashed border-muted-foreground/30 rounded-md hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                              >
                                <div className="flex items-center justify-center text-muted-foreground group-hover:text-primary">
                                  <Plus className="h-3 w-3" />
                                  <span className="text-xs ml-1">+</span>
                                </div>
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PlannerDashboard({ userId }) {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weeklyGoals, setWeeklyGoals] = useState([
    { id: 1, text: 'Completar 50 questões de cardiologia', completed: false },
    { id: 2, text: 'Revisar capítulo de farmacologia', completed: true },
    { id: 3, text: 'Fazer simulado de clínica médica', completed: false },
  ]);

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10);
        
        const tasks = await plannerApi.getTasks(userId, start, end);
        setEvents(tasks.map(task => {
          const isCompleted = task.status === 'COMPLETED';
          
          return {
            id: task.id,
            title: task.title,
            start: task.scheduledDate,
            backgroundColor: isCompleted 
              ? '#6B7280' 
              : (eventColors[task.type] || '#6B7280'),
            borderColor: isCompleted 
              ? '#4B5563' 
              : (eventColors[task.type] || '#6B7280'),
            textColor: '#ffffff',
            className: [
              'fc-event-custom',
              task.type === 'MANUAL' ? 'fc-event-draggable' : '',
              isCompleted ? 'fc-event-completed' : ''
            ].filter(Boolean).join(' '),
            extendedProps: { ...task },
            editable: task.type === 'MANUAL' && !isCompleted
          };
        }));
      } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        toast.error('Erro ao carregar tarefas');
      } finally {
        setLoading(false);
      }
    }
    if (userId) loadTasks();
  }, [userId, refresh]);

  function handleModalClose(updated) {
    setShowModal(false);
    setSelectedTask(null);
    if (updated) setRefresh(r => !r);
  }

  // Weekly Goals handlers
  const handleAddGoal = (text) => {
    const newGoal = {
      id: Date.now(),
      text,
      completed: false
    };
    setWeeklyGoals(prev => [...prev, newGoal]);
  };

  const handleUpdateGoal = (id, updates) => {
    setWeeklyGoals(prev => prev.map(goal => 
      goal.id === id ? { ...goal, ...updates } : goal
    ));
  };

  const handleDeleteGoal = (id) => {
    setWeeklyGoals(prev => prev.filter(goal => goal.id !== id));
  };

  const handleCreateTask = (date, period) => {
    setSelectedDate(date ? date.toISOString().slice(0, 10) : selectedDate);
    setSelectedTask({ period });
    setShowModal(true);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setSelectedDate(task.scheduledDate);
    setShowModal(true);
  };

  const handleReplicateWeek = () => {
    toast.info('Funcionalidade de replicar semana em desenvolvimento');
  };

  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(newWeek);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[95vw] mx-auto p-4 space-y-6">
        {/* Header moderno */}
        <div className="relative">
          <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
            <CardHeader className="p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-2xl blur-md opacity-30"></div>
                    <div className="relative p-4 rounded-2xl bg-gradient-to-r from-primary to-accent">
                      <Calendar className="h-8 w-8 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-bold text-foreground mb-1">
                      Planner de Estudos
                    </CardTitle>
                    <p className="text-base text-muted-foreground">
                      Organize seus estudos e acompanhe seu progresso
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button 
                    onClick={() => handleCreateTask()}
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Nova Tarefa
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Layout principal - 3 colunas */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Coluna esquerda - Mini calendário */}
          <div className="flex flex-col space-y-6">
            <MiniCalendar
              selectedDate={selectedDate}
              onDateSelect={(date) => setSelectedDate(date.toISOString().slice(0, 10))}
              events={events}
            />
            
            {/* Estatísticas resumidas */}
            <div className="relative flex-1">
              <Card className="border-0 shadow-md bg-card backdrop-blur-sm h-full">
                <CardContent className="p-6 h-full flex flex-col justify-center">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-primary mb-1">0</div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wider">HORA</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">semana selecionada</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Área central - 3 colunas */}
          <div className="xl:col-span-3 flex flex-col space-y-6">
            {/* Cabeçalho da semana */}
            <div className="relative">
              <Card className="border-0 shadow-md bg-card backdrop-blur-sm">
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-xl blur-md opacity-30"></div>
                        <div className="relative p-3 rounded-xl bg-gradient-to-r from-primary to-accent">
                          <CalendarIcon className="h-6 w-6 text-primary-foreground" />
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold">
                          Julho De 2025
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Semana de 27 a 2
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReplicateWeek}
                        className="flex items-center space-x-2"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Replicar semana</span>
                      </Button>
                      <Button
                        onClick={() => handleCreateTask()}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar tarefa
                      </Button>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={goToPreviousWeek}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={goToNextWeek}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Grid Semanal */}
            <div className="flex-1">
              <WeeklyGrid
                events={events}
                selectedDate={selectedDate}
                onDateSelect={(date) => setSelectedDate(date.toISOString().slice(0, 10))}
                onTaskClick={handleTaskClick}
                onCreateTask={handleCreateTask}
                currentWeek={currentWeek}
              />
            </div>
          </div>
          
          {/* Sidebar direita - Metas da semana */}
          <div className="flex flex-col">
            <div className="flex-1">
              <WeeklyGoalsCard
                goals={weeklyGoals}
                onAddGoal={handleAddGoal}
                onUpdateGoal={handleUpdateGoal}
                onDeleteGoal={handleDeleteGoal}
              />
            </div>
          </div>
        </div>

        <TaskModal
          open={showModal}
          onClose={handleModalClose}
          userId={userId}
          date={selectedDate}
          task={selectedTask}
        />
      </div>
    </div>
  );
}

