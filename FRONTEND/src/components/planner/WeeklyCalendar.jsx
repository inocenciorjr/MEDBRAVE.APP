import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus,
  Copy
} from 'lucide-react';

const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const weekDaysFull = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function WeeklyCalendar({ 
  selectedDate, 
  onDateSelect, 
  events = [],
  onCreateTask,
  onReplicateWeek,
  className = '' 
}) {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const date = selectedDate ? new Date(selectedDate) : new Date();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return startOfWeek;
  });

  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeek);
      date.setDate(currentWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeek]);

  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return events.filter(event => 
      event.start?.slice(0, 10) === dateStr || 
      event.scheduledDate?.slice(0, 10) === dateStr
    );
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

  const formatMonth = (date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getEventTypeColor = (type) => {
    const colors = {
      'FSRS_REVIEW': 'bg-purple-500',
      'RECOMMENDATION': 'bg-blue-500',
      'SIMULADO': 'bg-amber-500',
      'MANUAL': 'bg-emerald-500',
      'default': 'bg-gray-500'
    };
    return colors[type] || colors.default;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl blur-sm" />
        <Card className="relative border-0 shadow-lg bg-card/95 backdrop-blur-sm">
          <CardHeader className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-xl blur-md opacity-30" />
                  <div className="relative p-3 rounded-xl bg-gradient-to-r from-primary to-accent">
                    <CalendarIcon className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground capitalize">
                    {formatMonth(currentWeek)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Semana de {weekDates[0].getDate()} a {weekDates[6].getDate()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReplicateWeek}
                  className="border-0 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Replicar semana
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateTask}
                  className="border-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar tarefa
                </Button>

                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeek(-1)}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeek(1)}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Calendar Grid */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-3xl blur-xl" />
        <Card className="relative border-0 shadow-xl bg-card/95 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 divide-x divide-border">
              {weekDates.map((date, index) => {
                const dayEvents = getEventsForDate(date);
                const isCurrentDay = isToday(date);
                const isSelectedDay = isSelected(date);
                
                return (
                  <div
                    key={index}
                    className={`
                      relative min-h-[200px] p-4 cursor-pointer transition-all duration-200
                      hover:bg-accent/5 group
                      ${isCurrentDay ? 'bg-primary/5' : ''}
                      ${isSelectedDay ? 'bg-accent/10 ring-2 ring-accent/20' : ''}
                    `}
                    onClick={() => onDateSelect?.(date)}
                  >
                    {/* Day header */}
                    <div className="flex flex-col items-center mb-4">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        {weekDays[index]}
                      </div>
                      <div className={`
                        flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg transition-all duration-200
                        ${isCurrentDay 
                          ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg' 
                          : isSelectedDay
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground group-hover:bg-muted'
                        }
                      `}>
                        {date.getDate()}
                      </div>
                    </div>

                    {/* Events */}
                    <div className="space-y-2">
                      {dayEvents.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`
                            px-3 py-2 rounded-lg text-xs font-medium text-white
                            ${getEventTypeColor(event.type || event.extendedProps?.type)}
                            shadow-sm hover:shadow-md transition-shadow duration-200
                            cursor-pointer truncate
                          `}
                          title={event.title || event.extendedProps?.title}
                        >
                          {event.title || event.extendedProps?.title}
                        </div>
                      ))}
                      
                      {dayEvents.length > 3 && (
                        <div className="px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-medium text-center">
                          +{dayEvents.length - 3} mais
                        </div>
                      )}
                    </div>

                    {/* Add task button (appears on hover) */}
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateTask?.(date);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Today indicator */}
                    {isCurrentDay && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

